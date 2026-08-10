# Technical Design — ctfpawned

| | |
|---|---|
| **Repo** | `hongyime/ctfpawned` |
| **URL** | `https://ctfpawned.vercel.app` |
| **Status** | Draft for review |
| **Version** | 2 |
| **Last updated** | 2026-08-10 |
| **Scope** | All 12 challenges, plus post-v1 features |
| **Licence** | Apache-2.0 |
| **Companion docs** | [`PRD.md`](./PRD.md) · [`TASKS.md`](./TASKS.md) |

---

## 0. Reading guide

Sections 1–4 are stack and structure. **Sections 5–7 are the ones that matter** — isolation, flag integrity, and the tests that prove both. Sections 8–11 are the twelve challenge designs. Sections 12–15 cover design, narrative plumbing, and post-v1. Section 18 is the decision log.

Four findings from this design pass changed the architecture:

1. **`srcdoc` iframes inherit the parent's CSP.** A strict parent policy silently blocks the inline scripts inside every target. Targets are served as real documents from `/targets/<slug>.html` with their own CSP. See §5.2.
2. **Sandboxed frames have an opaque origin**, so `document.cookie` and `localStorage` do not work inside them. The cookie challenge needs a shimmed jar. See §5.5.
3. **A hand-written vulnerable JWT verifier beats importing `jose` into the target.** The learner is meant to read the broken code. `jose` becomes a dev-only dependency. See §9.
4. **The story must not be load-bearing.** It is delivered entirely through prose in files that already exist, with zero shared state. See §13.

---

## 1. Framework decision

**Chosen: Astro (static output) with React islands, on Vercel.**

### Why

| Requirement | How Astro serves it |
|---|---|
| "Adding a challenge is one directory" (PRD S8) | Vite's `import.meta.glob` over `src/challenges/*/` gives a build-time index with zero per-challenge registration. With twelve challenges this stops being a nicety and becomes the thing that keeps the project finishable. |
| Content-heavy: 12 briefs, 36 hints, 12 solutions | First-class MDX. Prose renders to HTML with no JS shipped. |
| Strict CSP (§5.3) | Static output with no framework-inlined scripts is the easiest possible CSP surface. |
| Mobile performance (PRD S7) | Zero JS by default; islands hydrate only the flag form, hint drawer, and frame controls. The SQLite WASM loads only inside Bobby's target. |
| Raw file imports for targets | Vite's `?raw` and `?url` handle `target.html` and the WASM binary with no custom plugin. |

### Alternatives considered

| Option | Why not |
|---|---|
| **Vite + React SPA** | Every brief and solution becomes client-rendered JS. Worse mobile TTI, worse SEO for a project whose distribution model is "someone links it," and hand-rolled routing for no benefit. The content-to-interactivity ratio here is roughly 85:15 — the wrong shape for an SPA. |
| **Next.js static export** | Heavier toolchain, App Router conventions that fight static-only output, MDX wiring fiddlier than Astro's. Nothing needs a server. |
| **Plain HTML + a build script** | Genuinely viable and lowest-dependency. Rejected because the story panel, hint state machine, and the eventual fix-mode editor want a component model. |

### Tradeoffs accepted

- Cross-island state (progress is read by the nav, cards, flag form, and story panel simultaneously) needs an external store. Resolved with `nanostores` — §6.3.
- Astro's major versions move quickly. **Pin at scaffold time and record the version in §18.**

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Astro, static output | No adapter, no SSR |
| Islands | React | Interactive shell components only |
| Language | TypeScript, `strict: true` | |
| Package manager | pnpm | Lockfile committed |
| Styling | Tailwind CSS + a token layer | Neobrutalist primitives |
| Fonts | Self-hosted via Fontsource | Keeps `font-src 'self'` |
| Content | MDX via `@astrojs/mdx` | Briefs, hints, solutions |
| Validation | Zod | `meta.json` at build time |
| SQLite | `sql.js` (WASM) | Bobby only, loaded inside the target |
| JWT | Hand-written vulnerable verifier in targets; `jose` **dev-only** | §9 |
| SVG tooling | SVGO | Optimises generated cat art (§12.3) |
| Editor (post-v1) | CodeMirror 6 | Lighter and more mobile-friendly than Monaco |
| Unit tests | Vitest | |
| E2E / escape / solve | Playwright | |
| A11y tests | `@axe-core/playwright` | |
| CI | GitHub Actions | Escape + solve suites are required checks |
| Hosting | Vercel static, `ctfpawned.vercel.app` | §16 |

**Node:** pin the current active LTS in `.nvmrc` and `package.json#engines`.

---

## 3. Repository layout

```
ctfpawned/
├── .github/workflows/ci.yml
├── docs/{PRD,TDD,TASKS}.md
├── LICENSE                       # Apache-2.0
├── NOTICE
├── README.md
├── SECURITY.md
├── public/
│   ├── targets/                  # GENERATED — gitignored
│   └── vendor/sql-wasm.wasm
├── scripts/
│   ├── build-targets.mjs
│   ├── make-flag.mjs
│   └── check-content.mjs
├── src/
│   ├── assets/cats/<slug>.svg
│   ├── challenges/
│   │   └── 05-sesame-weak-secret/
│   │       ├── meta.json
│   │       ├── brief.mdx
│   │       ├── hints.mdx
│   │       ├── solution.mdx      # includes the log fragment
│   │       ├── target.html
│   │       └── solve.ts
│   ├── components/
│   ├── content/story.json        # act metadata only (§13)
│   ├── layouts/
│   ├── lib/{challenges,flag,progress,schema}.ts
│   ├── pages/
│   ├── styles/tokens.css
│   └── targets/runtime/          # shims injected into every target
│       ├── cookie-jar.js
│       ├── mock-fetch.js
│       ├── hmac-sha256.js
│       ├── jwt.js
│       └── reset.js
├── tests/{unit,e2e}
├── vercel.json
└── package.json
```

**Invariant:** nothing outside `src/challenges/<slug>/` is edited when adding a challenge. The build globs. If a task requires shell edits to add a challenge, the loader has regressed — stop and fix it.

---

## 4. Content model

### 4.1 `meta.json` schema

```ts
export const ChallengeMeta = z.object({
  slug:        z.string().regex(/^\d{2}-[a-z0-9-]+$/),
  order:       z.number().int().min(1).max(99),
  act:         z.union([z.literal(1), z.literal(2), z.literal(3)]),
  cat:         z.string(),                       // "Sesame"
  title:       z.string(),
  tagline:     z.string().max(120),
  vulnClass:   z.string(),                       // "JWT claim tampering"
  cwe:         z.string().optional(),
  difficulty:  z.number().int().min(1).max(5),
  tags:        z.array(z.string()).min(1),
  flagHash:    z.string().regex(/^[a-f0-9]{64}$/),
  frameHeight: z.number().int().min(200).max(900),
  mobileOk:    z.boolean().default(false),
  targetCsp:   z.object({
    connectSrc: z.enum(["'none'", "'self'"]).default("'none'"),
    wasm:       z.boolean().default(false),
  }).default({}),
  status:      z.enum(['draft', 'ready']).default('draft'),
});
```

`status: 'draft'` challenges are excluded from production builds but visible in dev, so work-in-progress can live on `main`.

### 4.2 Build-time index

```ts
// src/lib/challenges.ts
const metas = import.meta.glob('../challenges/*/meta.json', { eager: true });
// validate each with ChallengeMeta, assert unique slug/order/flagHash,
// sort by `order`, freeze, export.
// Fail the build loudly on any error — never skip a bad challenge silently.
```

MDX loads per-route, not eagerly, so hints and solutions land in separate chunks (PRD PR2, PR3).

### 4.3 Why not Astro content collections

Content collections expect one file per entry. A challenge is a directory of six heterogeneous files, one of which is a build input for a different pipeline. `import.meta.glob` + Zod is fewer moving parts and not coupled to any Astro major version.

---

## 5. Isolation design

The section that decides whether this is safe to ship.

### 5.1 Threat model

| Actor | Capability | Concern |
|---|---|---|
| The challenge target | Runs attacker-authored JS by design | Must not reach the parent DOM, parent storage, the network, or top-level navigation |
| The user | Full devtools on their own machine | Not a threat to anyone but themselves. Cheating is out of scope (§6.4) |
| A third party | Can frame or link to ctfpawned | Must not frame the shell and turn a challenge payload on a visitor |

The boundary is **target frame → parent document**. Everything else follows from holding that line.

### 5.2 Targets are served documents, not `srcdoc`

Per CSP3, documents from local schemes — `srcdoc`, `blob:`, `data:` — inherit the embedding document's policy. A parent policy of `script-src 'self'` therefore blocks every inline script inside every target, silently.

| Option | Verdict |
|---|---|
| Loosen the parent CSP to `'unsafe-inline'` | Defeats having a CSP |
| Hash every target's inline script into the parent policy | Couples a security header to challenge content; breaks on every content edit |
| **Serve targets from `/targets/<slug>.html` with their own CSP** | Chosen |

`sandbox="allow-scripts"` without `allow-same-origin` still forces the document into an opaque origin regardless of where it was fetched. Serving same-origin costs nothing in isolation terms.

```html
<iframe
  src="/targets/05-sesame-weak-secret.html"
  sandbox="allow-scripts"
  title="Sandboxed vulnerable target: Sesame's token service"
  referrerpolicy="no-referrer"
  height="{meta.frameHeight}">
</iframe>
```

**The sandbox token list is exactly `allow-scripts`.** Not `allow-same-origin` (combined with `allow-scripts`, the frame could strip its own sandbox attribute). Not `allow-forms`, `allow-popups`, `allow-top-navigation`, or `allow-modals` — see §11.8 for how Echo signals success without `alert()`.

### 5.3 Content-Security-Policy

Defence in depth: a `<meta>` CSP is baked into each generated target (works in local dev, travels with the file), and `vercel.json` response headers repeat and extend it (`frame-ancestors` cannot be set via `<meta>`).

**Parent** (everything except `/targets/*`):

```
default-src 'none'; script-src 'self'; style-src 'self';
img-src 'self' data:; font-src 'self'; connect-src 'self';
frame-src 'self'; form-action 'none'; base-uri 'none';
frame-ancestors 'none';
```

**Default target** (`/targets/*`):

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
img-src data:; connect-src 'none'; form-action 'none';
base-uri 'none'; frame-ancestors 'self';
```

`script-src 'unsafe-inline'` inside the target is deliberate — targets must run inline script and Echo must be able to inject some. Isolation comes from the opaque origin, not the target's script policy. `connect-src 'none'` is what stops exfiltration.

**Bobby exception** (SQLite WASM), the only relaxed target:

```
connect-src 'self'; script-src 'unsafe-inline' 'wasm-unsafe-eval';
```

The `.wasm` is served with `Access-Control-Allow-Origin: *` because the opaque-origin frame requests it cross-origin. `targetCsp` in `meta.json` drives the generator — no hand-edited exceptions.

> **Fallback if the CORS route is awkward:** inline the WASM as base64 and instantiate from an `ArrayBuffer`, keeping `connect-src 'none'`. Costs ~2 MB of HTML on one page. Decide at Task 4.2 and record in §18 D8.

### 5.4 What the sandbox forbids

| Attempt from inside a target | Result |
|---|---|
| `parent.document`, `top.location.href`, `parent.localStorage` | `SecurityError` |
| its own `localStorage` / `sessionStorage` | `SecurityError` — opaque origins have no storage |
| `document.cookie` | Empty string; writes are no-ops |
| `fetch(...)`, `new Image().src = 'https://…'` | Blocked by `connect-src 'none'` / `img-src data:` |
| `top.location = '…'` | Blocked — no `allow-top-navigation` |
| `window.open(...)` | Blocked — no `allow-popups` |
| `alert()` | Blocked — no `allow-modals` |
| `parent.postMessage(…)` | Delivered with `origin: "null"` — **and the parent registers no listener** (§5.6) |

### 5.5 The opaque-origin storage problem

Scrambles and Biscuit are *about* client-side session state, and the frame has no `localStorage` and no cookies. Targets ship with shims, injected by `scripts/build-targets.mjs` from `src/targets/runtime/`:

- **`cookie-jar.js`** — an in-memory jar with `document.cookie` redefined via `Object.defineProperty`, with faithful get/set semantics. `document.cookie = "isAdmin=true"` in the console behaves as it would on a real page.
- **`mock-fetch.js`** — a `fetch` replacement over an in-memory route table, returning real `Response` objects so `await res.json()` works. Used by Digit and Wildcard; Wildcard's variant additionally enforces CORS semantics (§11.10).
- **`hmac-sha256.js` / `jwt.js`** — §9.
- **`reset.js`** — exposes `__ctfpawned_reset()` behind the "Reset target" control.

**UX consequence:** shimmed cookies do not appear in the devtools Application panel. The `how-to-attack` primer must teach selecting the target frame in the console context dropdown. This papercut is most of why that page exists.

### 5.6 The parent trusts nothing from the frame

**The parent registers no `message` listener for target frames.** Consequences, all good:

- Echo's payload has no channel into the shell.
- Solving cannot be spoofed by `postMessage`; only a correct flag in the form marks a challenge solved.
- Frame height comes from `meta.frameHeight`, declared statically.
- "Reset target" re-mounts the iframe by changing its React `key`.

A future challenge needing frame→parent messaging must arrive as a design change with its own escape tests.

---

## 6. Flags, verification, and honesty

### 6.1 Format

```
ctfpawned{<26 chars of Crockford base32>}
```

~130 bits. Brute force is not the path of least resistance, which is the only guarantee needed.

### 6.2 Verification

```ts
export async function verify(slug: string, input: string, expected: string) {
  const norm = input.trim().toLowerCase();
  const data = new TextEncoder().encode(`${slug}:${norm}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest) === expected;
}
```

Slug domain separation stops one leaked hash matching across challenges and makes a raw hash useless to search for. Input is normalised because "correct answer, rejected for a trailing space" is the most demoralising bug this project could ship.

### 6.3 Progress store

```ts
// localStorage key: "ctfpawned:progress"
type Progress = {
  v: 1;
  solved: Record<string, { at: number; hintsUsed: number; gaveUp: boolean }>;
  settings: { reducedMotion?: boolean };
};
```

`@nanostores/persistent` gives cross-island reactivity and cross-tab sync. `migrate(raw)` runs on load and handles `v` bumps; an unparseable blob is replaced rather than thrown on. Export/import is base64 JSON with a version check and a confirm dialog.

Story fragments are **derived** from `solved` — never stored separately. One source of truth.

### 6.4 The honest caveat, and one thing that improves it

Flags are checked client-side; a determined user can read one out of `/targets/<slug>.html`. **This is stated plainly in the README.** The alternative is a backend, which trades the entire zero-setup premise for a guarantee nobody asked for.

Where it fits cheaply, **derive the flag from the exploit artifact** instead of storing a literal: Nought's flag is `base32(SHA-256(submittedToken))`, computed at runtime, so the literal exists nowhere in source and producing it requires a genuinely forged token. Applied to Nought, Biscuit, Sesame, Echo, and Lucky. The rest need a literal, which is fine.

> Do **not** obfuscate flags. XOR-with-a-key in the bundle is security theatre, and a security teaching tool shipping security theatre is embarrassing.

---

## 7. Test strategy

### 7.1 The escape suite — `tests/e2e/escape.spec.ts`

Generated from the challenge index, so a new challenge is covered automatically. Per target, in the frame's context:

| Assertion | Expectation |
|---|---|
| `window.parent.document` | throws |
| `window.top.location.href` | throws |
| `window.parent.localStorage` | throws |
| `window.origin` | `"null"` |
| `localStorage.getItem('x')` | throws |
| `fetch('/')` | rejects |
| `new Image().src = 'https://example.invalid/x'` | no request observed |
| `top.location = '/pwned'` | parent URL unchanged |
| `window.open('/')` | null / nothing opened |
| `parent.postMessage('x','*')` then parent state | unchanged |

Plus page-level: zero requests originating from the frame after load, and parent `localStorage` byte-identical before and after a hostile payload battery.

**Merge blocker.** A red escape test is never fixed by weakening the assertion.

### 7.2 The solution suite — `tests/e2e/solve.spec.ts`

Each challenge ships `solve.ts`, a headless reproduction of the intended attack producing the flag. The test runs it, submits, and asserts solved state.

The highest-value test in the project. It proves PRD S1 continuously and makes "is this challenge actually solvable?" a CI question rather than a playtest question. **Each `solve.ts` must be independent — it may not read another challenge's state or flag.** This is what keeps the story from silently coupling the challenges (§13).

### 7.3 Other suites

- **Unit (Vitest):** flag hashing and normalisation, progress migration, cookie-jar semantics, mock-fetch CORS semantics, Zod rejection of malformed `meta.json`.
- **Content lint (`scripts/check-content.mjs`):** §14.
- **A11y (`axe-core`):** zero serious/critical violations on index, a challenge page, a solution page, the story panel.
- **Lighthouse CI:** budget per §15.

---

## 8. Shell component design

| Component | Type | Responsibility |
|---|---|---|
| `c/[slug].astro` | static page | Renders brief MDX, mounts islands, no JS of its own |
| `ChallengeFrame.tsx` | island (`client:visible`) | The iframe, the reset `key`, the danger chrome |
| `FlagForm.tsx` | island (`client:idle`) | Input, verify, celebrate, write progress. No network |
| `HintDrawer.tsx` | island (`client:idle`) | Sequential reveal; dynamic-imports each hint chunk; increments `hintsUsed` |
| `ProgressBadge.tsx` | island (`client:idle`) | Reads the nanostore; used in nav and cards |
| `StoryPanel.tsx` | island (`client:idle`) | Log fragments, unsolved ones redacted not hidden (PRD PR15) |
| `c/[slug]/solution.astro` | static page | Separate route; solution prose never enters the challenge bundle |

Shipped JS per challenge page, budget: **≤ 40 KB gzipped**, excluding Bobby's WASM.

---

## 9. JWT handling (Nought and Sesame)

**Targets do not import `jose`.** They ship a hand-written verifier of ~50 readable lines with a deliberate, findable bug. The pedagogical unit is the code the learner reads; a black-box library call teaches nothing.

Nought's verifier contains the `alg: none` bug:

```js
function verify(token, secret) {
  const [h, p, s] = token.split('.');
  const header = JSON.parse(atob(h));
  if (header.alg === 'none') return JSON.parse(atob(p));   // <-- the bug
  if (hmacSha256(`${h}.${p}`, secret) !== s) throw new Error('bad signature');
  return JSON.parse(atob(p));
}
```

Sesame's verifier is correct but the secret is guessable, and the brief supplies a 20-word candidate list. HMAC-SHA256 comes from a ~40-line pure-JS implementation vendored into `src/targets/runtime/`, not WebCrypto.

> **Why not WebCrypto in the frame:** `crypto.subtle` requires a secure context, and whether a sandboxed opaque-origin frame qualifies across four browsers is worth verifying rather than assuming. **Task 2.4 verifies it and records the answer in §18 D7.** The vendored pure-JS HMAC sidesteps the question entirely and reads better besides.

`jose` stays a dev dependency: scripts mint fixture tokens, and unit tests assert that a correctly-fixed verifier accepts what it should.

---

## 10. Act I and II challenge designs

Each entry: mechanism, win condition, flag source.

### 10.1 — **Scrambles** · Encoding mistaken for encryption · `01-scrambles-encoding` · d1

Nine Lives' member portal stores your session as a base64 blob behind a reassuring padlock icon. Decoding reveals `{ user, role, note }` — where `note` reads "nice try". The real win: flip `role` to `staff`, re-encode, paste back, and the staff panel renders the flag.

- **Teaches:** base64 is a transport encoding, not a confidentiality control.
- **Flag:** literal, revealed only by the staff panel render. **Mobile: yes.**

### 10.2 — **Knox** · Client-side auth bypass · `02-knox-client-auth` · d1

A staff login whose check is `if (user === 'knox' && pass === atob('...'))` in the target's inline script. Three routes in: read the credentials from source, call the gate function from the console, or set the in-memory `isStaff` flag. All three are accepted, and the solution discusses why "there were three ways in" is the actual lesson.

- **Teaches:** client-side checks are UX, not security.
- **Flag:** literal, rendered by the post-login view. **Mobile: yes.**

### 10.3 — **Biscuit** · Cookie forging · `03-biscuit-cookie` · d2

The treat-ordering page reads `document.cookie` (the §5.5 shim) for `staff` and renders a staff link when it is `true`. The learner sets the cookie from the console with the frame context selected.

- **Teaches:** cookies are client-controlled; authorisation belongs on the server.
- **Flag:** derived from the cookie string that unlocked the panel. **Mobile: yes.**
- **UX risk:** the console-context step. Hint 1 exists for it.

### 10.4 — **Nought** · JWT `alg: none` · `04-nought-alg-none` · d2

A token field, the §9 verifier, and a decoded-role display. The shipped token is `role: volunteer`, HS256, secret unknown. Forging `{"alg":"none"}` with `role: admin` and an empty signature unlocks the panel.

- **Teaches:** the algorithm field is attacker-controlled input; verifiers must pin the expected algorithm.
- **Flag:** derived — `base32(SHA-256(submittedToken))`. **Mobile: yes.**

### 10.5 — **Sesame** · JWT claim tampering, weak secret · `05-sesame-weak-secret` · d3

Same shape, but `alg: none` is now rejected. The learner cracks the HS256 secret against a supplied 20-word list, then re-signs a tampered payload. An in-target signing helper means the exercise is guessing the key, not string-wrangling in the console.

- **Teaches:** signature verification is only as strong as the key; short secrets are crackable offline.
- **Flag:** derived from the correctly-signed forged token.
- **Also:** the first challenge built after the loader exists, so it is the proof of PRD S8.

### 10.6 — **Digit** · IDOR · `06-digit-idor` · d2

`mock-fetch.js` serves `/api/adoptions/:id`. You are volunteer #1042 and own record 1042. The handler has no authorisation check. Record 1337 belongs to someone else and holds the flag.

- **Teaches:** authentication ≠ authorisation; object-level access control.
- **Flag:** literal in record 1337. **Mobile: yes.**
- **Story note:** record 1337's last-modified timestamp is the first anomaly (§13.2).

### 10.7 — **Bobby** · SQL injection · `07-bobby-sqli` · d3

`sql.js` over a seeded adoption database. A search box builds `SELECT name, breed FROM cats WHERE name = '<input>'` by concatenation. `' OR '1'='1` dumps the table; a `UNION SELECT` reaches the `staff_notes` table where the flag lives.

- **Teaches:** concatenation vs parameterised queries; `UNION` as an exfiltration primitive.
- **Flag:** literal in `staff_notes`.
- **Implementation:** CSP exception per §5.3. Cap execution at 2 s, rebuild the DB on reset, and **show the constructed SQL live under the search box** — watching the injection rewrite the query is most of the lesson.

### 10.8 — **Echo** · Reflected XSS · `08-echo-xss` · d3

The site search reads `?q=` from the target's in-memory router and writes it into `innerHTML` unescaped.

**The win condition is not `alert(1)`.** `allow-modals` is deliberately absent (§5.2), and `alert(1)` teaches nothing about impact. Instead: the target holds a session token in a JS variable, and the payload must read it and write it into a designated `#exfil` element. The flag derives from the token. This frames XSS as "arbitrary read of the victim's session," which is the accurate model.

- **Teaches:** `innerHTML` sinks; context-dependent encoding; real XSS impact.
- **Critical test:** the escape suite must stay green **with a live XSS payload running in the frame** — the single most important test in the project.

---

## 11. Act III challenge designs

### 11.9 — **Dotty** · Path traversal · `09-dotty-traversal` · d3

An in-memory virtual filesystem behind `readFile('public/' + name)`, whose normalisation strips `../` exactly once — so `....//` survives. The flag lives at `private/incident.txt`, which is also the first document naming the intruder.

- **Teaches:** why blocklist normalisation fails; canonicalise-then-check.
- **Flag:** literal in the recovered file.

### 11.10 — **Wildcard** · CORS misconfiguration · `10-wildcard-cors` · d3

Kept, and built properly rather than hedged. The target renders two panes: the Nine Lives **donations API** and a scratch page representing an attacker-controlled origin.

`mock-fetch.js`'s CORS variant enforces the real rules, not a caricature:

- Preflight `OPTIONS` for non-simple requests, with `Access-Control-Request-Method` / `-Headers` honoured.
- `Access-Control-Allow-Origin` **reflected from the request `Origin`** — the actual misconfiguration.
- `Access-Control-Allow-Credentials: true` alongside it.
- The browser rule that `*` plus credentials is rejected, so a learner who tries the naive thing gets the real error message.

The learner issues a credentialed request from the attacker pane to `/api/me`, reads a response they should never have been able to read, and finds the flag.

- **Teaches:** why reflecting `Origin` is equivalent to no policy at all; why credentials change everything.
- **Honesty:** it is a simulation, and the solution page says so, links the Fetch spec, and explains exactly which parts are faithful and which are not. A simulation labelled as one teaches; a simulation pretending otherwise misleads.
- **Flag:** literal in the `/api/me` response.

### 11.11 — **Lucky** · Weak PRNG token prediction · `11-lucky-prng` · d4

Session tokens come from an explicit LCG with published constants, seeded from a timestamp the target displays. The learner observes three consecutive tokens, recovers the seed, and predicts the *next* token — which happens to be the intruder's.

- **Teaches:** `Math.random()` is not a CSPRNG; predictable tokens are forgeable.
- **Design note:** an explicit LCG rather than reversing V8's `xorshift128+`. The latter is a great exercise but engine-version-dependent and would make the solve suite fail on a browser update. It is named in the solution as further reading.
- **Flag:** derived from the predicted token.

### 11.12 — **Pedigree** · Prototype pollution · `12-pedigree-proto` · d4

The adoption-record importer folds user JSON into a config object with a vulnerable deep-merge. `{"__proto__":{"verified":true}}` pollutes `Object.prototype`, and an unrelated later check reads `record.verified` as truthy — surfacing the forged pedigree that closes the story.

- **Teaches:** JS prototype semantics; why `Object.create(null)` and key filtering matter.
- **Flag:** literal in the revealed record.
- The cleanest in-page demonstration of the set. The "unrelated code path breaks" moment is genuinely striking, and it is the right note to end on.

---

## 12. Design system

### 12.1 Tokens

```css
--border-w: 3px;
--shadow-hard: 6px 6px 0 var(--ink);
--radius: 0;
--ink: #101010;
--paper: #FDF6E3;
--accent: #FFD400;   /* solved */
--danger: #FF4B3E;   /* target frame chrome */
--info: #3E8BFF;
--act-1: #7BD389; --act-2: #FFA552; --act-3: #B892FF;
```

- The target frame always wears `--danger` chrome with a repeated "SANDBOXED TARGET" label, so the vulnerable region is unmistakable.
- One chunky display face for headings, one mono for anything code-adjacent, both self-hosted.

### 12.2 Accessibility caution

Neobrutalism's contrast helps, but yellow-on-white accents routinely fail AA. Every token pair is contrast-checked at Task 7.2, and colour is never the sole indicator of solved state — a glyph accompanies it. Act colours are decorative only.

### 12.3 Cat art contract — generated SVG

Art is generated, then held to a contract so it can be regenerated or replaced without touching code.

| Rule | Value |
|---|---|
| Path | `src/assets/cats/<slug>.svg` |
| `viewBox` | `0 0 240 240` |
| Palette | Token colours only; no gradients |
| Forbidden | `<image>`, `<text>`, `<foreignObject>`, embedded raster, external refs, scripts |
| Required | `<title>` and `<desc>` for screen readers |
| Size | ≤ 20 KB after SVGO |
| Style | Flat, heavy-outline, single-path-per-colour, readable at 48 px |

Generated SVGs routinely arrive with embedded raster, thousands of path nodes, or stray `<text>`. **The content lint enforces every rule above** (§14), so a bad generation fails the build rather than shipping. Regenerating one cat is a one-file diff.

---

## 13. Narrative plumbing

### 13.1 The rule

**The story is prose in files that already exist. It has no runtime representation beyond derived state.**

- Each `brief.mdx` sets that cat's scene.
- Each `solution.mdx` ends with a `## Recovered` section — a short log fragment from the system just broken.
- `src/content/story.json` holds act titles, act blurbs, and the act→order mapping. Nothing else.
- `StoryPanel.tsx` derives which fragments are unlocked from `progress.solved`. Locked fragments render **redacted, not hidden**, so the shape of the story is visible from the first visit.

Total code cost: one component and one small JSON file.

### 13.2 The arc

| Act | Beat | Closing note |
|---|---|---|
| I — The Front Door | A routine audit of the member site. Dry, funny, mundane. | The perimeter is a formality. Nothing alarming yet. |
| II — Inside the Walls | Into the adoption database. Digit's record 1337 carries a 03:14 edit from an account that should not exist. | Someone has been here. Recently. |
| III — Someone Was Here First | Dotty recovers the incident file, Wildcard the donation trail, Lucky the intruder's next token, Pedigree the forged record. | It is Smudge. Cage 13, no pedigree, never adopted. He taught himself on the shelter's public terminal and has been moving his own record up the list for two years. The report you file is why he gets a home. |

### 13.3 What is explicitly forbidden

- Flags that chain into each other, or a finale consuming earlier flags.
- Any challenge whose target reads another challenge's state.
- Story order enforced as an unlock (PRD N7).

All three would break independent solvability and make the solve suite order-dependent, which is how a green CI stops meaning anything. **Content lint asserts that no `target.html` or `solve.ts` references another challenge's slug** (§14).

### 13.4 The stall plan

Each act closes on a resolved beat. If development stops after Act II, the Act II closing fragment is rewritten into an ending and the project ships as a complete eight-challenge story. This is the concrete mitigation for the "looks abandoned" risk in PRD §10, and it is why the acts are 4/4/4 rather than one long ramp.

---

## 14. Content lint

`scripts/check-content.mjs`, wired into `pnpm build` and CI:

| Check | Why |
|---|---|
| Every `ready` challenge has all six files | Structural |
| `hints.mdx` has exactly 3 hints | PRD PR2 |
| `solution.mdx` has a `## The fix` heading | PRD S4 |
| `solution.mdx` has a `## Recovered` heading | PRD S5 |
| `flagHash`, `slug`, `order` unique across challenges | Catches copy-paste |
| `target.html` contains the runtime shim marker | Build pipeline sanity |
| No `target.html` or `solve.ts` references another slug | §13.3 |
| Each cat SVG passes every §12.3 rule | Generated-art hygiene |

---

## 15. Performance budget

| Metric | Budget |
|---|---|
| Index page JS (gz) | ≤ 25 KB |
| Challenge page JS (gz) | ≤ 40 KB |
| Target HTML | ≤ 60 KB (Bobby excepted) |
| Bobby's WASM | ≤ 1.6 MB, lazy, that page only |
| Each cat SVG | ≤ 20 KB |
| FCP, mid-tier phone / 4G | ≤ 1.5 s |

---

## 16. Build and deploy

- `pnpm build` runs `build-targets.mjs` → `check-content.mjs` → `astro build`.
- Static output. No functions, no adapter, no environment variables.
- **`vercel.json`** carries §5.3's headers keyed by path, with `/targets/*` overriding the global policy and a per-slug rule for Bobby.
- Production URL: **`ctfpawned.vercel.app`**. No custom domain in v1; if one is added later only the README and `og:url` change.
- **GitHub Pages is ruled out** — it cannot set response headers, and per-target CSP plus `frame-ancestors` require them. Cloudflare Pages is an equivalent alternative via `_headers`.
- CI per PR: typecheck → lint → unit → content lint → build → Playwright (escape, solve, a11y). Escape and solve are required.

**Licensing:** Apache-2.0 across the repo, code and prose. `LICENSE` plus a `NOTICE` naming vendored third-party code (`sql.js`, the HMAC implementation) with their own licences preserved.

**Observability:** none. No analytics, no error reporting, no cookies (PRD N6).

---

## 17. Rejected designs

| Idea | Why rejected |
|---|---|
| Flags that chain across challenges to tell the story | Breaks independent solvability (PRD N7) and makes the solve suite order-dependent. §13.3 |
| `postMessage` from the target to auto-mark solved | Gives challenge payloads a channel into the shell and makes solving spoofable |
| `allow-same-origin` on targets, relying on CSP alone | With `allow-scripts`, the frame can strip its own sandbox attribute. Not a boundary |
| Running `sql.js` in the parent and proxying queries | Reintroduces a message channel and puts user-influenced execution on the trusted origin, to save one CSP exception |
| Obfuscating or XOR-ing flags in the bundle | Security theatre, in a security teaching tool |
| A backend for flag validation and a leaderboard | Trades the zero-setup premise (PRD G1) for a guarantee nobody asked for |
| Dropping the CORS challenge as unsimulatable | A faithful simulation that enforces preflight and the credentials rule teaches the concept well; the fix is to label it, not cut it |
| Monaco for the eventual fix-mode editor | ~3 MB and poor on mobile |
| Astro content collections for challenges | One-file-per-entry fights a six-file challenge directory |

---

## 18. Decision log

| # | Decision | Status | Verify by |
|---|---|---|---|
| D1 | Astro static + React islands | **Decided** | — |
| D2 | Targets served from `/targets/*`, not `srcdoc` | **Decided** | Task 2.1 |
| D3 | Sandbox tokens: `allow-scripts` only | **Decided** | Task 2.3 |
| D4 | Parent registers no `message` listener | **Decided** | Task 2.3 |
| D5 | Flags: SHA-256 with slug domain separation, derived where possible | **Decided** | Task 3.1 |
| D6 | Hand-written JWT verifier in targets; `jose` dev-only | **Decided** | Task 3.5 |
| D7 | `crypto.subtle` availability in an opaque-origin frame | **Open** | Task 2.4 — record result here |
| D8 | SQLite WASM: CORS fetch vs inlined base64 | **Open** | Task 5.2 — record result here |
| D9 | CORS challenge kept, built as a faithful labelled simulation | **Decided** | §11.10 |
| D10 | Astro major version | **Open** | Task 1.1 — pin and record here |
| D11 | Licence: Apache-2.0, whole repo | **Decided** | Task 1.2 |
| D12 | Story delivered as prose only, zero shared state | **Decided** | §13, enforced by content lint |
| D13 | Cat art generated, held to the §12.3 contract | **Decided** | Task 7.3 |
| D14 | Does Smudge get adopted on-page? | **Open** | Task 0.4 — decide when writing the final fragment |
