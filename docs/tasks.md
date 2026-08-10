# Implementation Plan — ctfpawned

| | |
|---|---|
| **Repo** | `hongyime/ctfpawned` |
| **URL** | `https://ctfpawned.vercel.app` |
| **Audience** | An AI coding agent (Claude Code) working task-by-task |
| **Companion docs** | [`PRD.md`](./PRD.md) · [`TDD.md`](./TDD.md) |
| **Last updated** | 2026-08-10 |

---

## How to use this document

Tasks are ordered. Each has an ID, dependencies, the files it touches, what to do, and machine-checkable acceptance criteria. Work one task at a time, top to bottom.

### Agent rules

1. **One task, one commit.** Message format: `T-2.3: add escape test suite`.
2. **Do not skip a task's "Done when" checks.** If one cannot pass, stop and report — do not weaken the check.
3. **Never weaken a security assertion to make a test go green.** A red escape test is a bug in the code, never in the test.
4. **Do not edit shell code to add a challenge.** If adding a challenge requires touching anything outside `src/challenges/<slug>/`, the loader is wrong. Fix the loader.
5. **Never let one challenge reference another.** No shared state, no chained flags, no cross-slug imports. The story is prose only (TDD §13).
6. 🛑 marks a stop-and-ask gate. Do not proceed without a human decision.
7. Record decisions in TDD §18 as they resolve.
8. Read TDD §5 before writing any iframe code.

### The roster

| # | Cat | Slug | Vulnerability | Act | Diff |
|---|---|---|---|---|---|
| 1 | Scrambles | `01-scrambles-encoding` | Encoding vs encryption | I | 1 |
| 2 | Knox | `02-knox-client-auth` | Client-side auth bypass | I | 1 |
| 3 | Biscuit | `03-biscuit-cookie` | Cookie forging | I | 2 |
| 4 | Nought | `04-nought-alg-none` | JWT `alg: none` | I | 2 |
| 5 | Sesame | `05-sesame-weak-secret` | JWT weak secret | II | 3 |
| 6 | Digit | `06-digit-idor` | IDOR | II | 2 |
| 7 | Bobby | `07-bobby-sqli` | SQL injection | II | 3 |
| 8 | Echo | `08-echo-xss` | Reflected XSS | II | 3 |
| 9 | Dotty | `09-dotty-traversal` | Path traversal | III | 3 |
| 10 | Wildcard | `10-wildcard-cors` | CORS misconfiguration | III | 3 |
| 11 | Lucky | `11-lucky-prng` | Weak PRNG | III | 4 |
| 12 | Pedigree | `12-pedigree-proto` | Prototype pollution | III | 4 |

---

# Phase 0 — Content first

> **This phase is the project.** Twelve challenges is roughly 12,000 words of prose. PRD §13 makes it a kill gate. Code nothing until it is done.

### T-0.1 — Write the story bible
**Depends on:** —
**Files:** `drafts/story.md`
**Do:** One page. The Nine Lives premise, the twelve cats and their personalities, the three act beats, and who Smudge is. Every later draft is written against this.
**Done when:**
- [ ] Each of the twelve cats has one line of personality tied to how they built their system badly
- [ ] The three act closing beats are written
- [ ] Smudge's reveal is written, including the last line of the project

### T-0.2 — Draft all 12 briefs
**Depends on:** T-0.1
**Files:** `drafts/<slug>/brief.md`
**Do:** 150–250 words each. Set the scene, name the cat, state what the target does, state the objective — without hinting at the method.
**Done when:**
- [ ] 12 briefs exist
- [ ] The vulnerability class appears only in metadata, never in the brief body
- [ ] Each states an unambiguous win condition
- [ ] No brief requires having read another brief

### T-0.3 — Draft all 12 solutions
**Depends on:** T-0.2
**Files:** `drafts/<slug>/solution.md`
**Do:** The attack step by step, why the code was vulnerable, a `## The fix` section with corrected code, and a `## Recovered` log fragment closing the beat.
**Done when:**
- [ ] 12 solutions exist
- [ ] Each has `## The fix` with a real code sample naming the real-world control
- [ ] Each has `## Recovered` with a fragment of 2–4 sentences
- [ ] Wildcard's solution states plainly which parts of the CORS simulation are faithful and which are not
- [ ] Reading all 12 fragments in order tells a complete story

### T-0.4 — Draft 36 hints
**Depends on:** T-0.3
**Files:** `drafts/<slug>/hints.md`
**Do:** 3 per challenge, escalating: nudge → technique → near-spoiler. Biscuit's hint 1 must cover selecting the frame context in the console (TDD §5.5).
**Resolves:** TDD D14
**Done when:**
- [ ] 36 hints exist, 3 per challenge
- [ ] No hint gives a flag directly
- [ ] TDD §18 D14 recorded (does Smudge get adopted on-page)

### 🛑 T-0.5 — Kill gate
**Depends on:** T-0.4
**Do:** Human judgement. PRD §13: if drafting six solutions felt like homework, cut to Act I + II and ship eight. Twelve is a real content bill and this is the moment to price it honestly.
**Done when:**
- [ ] Explicit twelve / eight / stop decision recorded in an issue

---

# Phase 1 — Repo baseline

### T-1.1 — Scaffold
**Depends on:** T-0.5
**Do:** `pnpm create astro`, static output, TypeScript strict. Add `@astrojs/mdx`, `@astrojs/react`, Tailwind, `zod`, `nanostores`, `@nanostores/persistent`. Dev: `vitest`, `@playwright/test`, `@axe-core/playwright`, `jose`, `sql.js`, `svgo`. Check the current Astro major at install time and pin it. Add `.nvmrc` and `engines`.
**Resolves:** TDD D10
**Done when:**
- [ ] `pnpm build` and `pnpm dev` both work
- [ ] Astro version recorded in TDD §18 D10
- [ ] `pnpm-lock.yaml` committed

### T-1.2 — Licence and repo hygiene
**Depends on:** T-1.1
**Files:** `LICENSE`, `NOTICE`, `README.md`, `SECURITY.md`, `.github/`, eslint, prettier
**Do:** Apache-2.0 `LICENSE`. `NOTICE` naming vendored third-party code (`sql.js`, the HMAC implementation) with licences preserved. Drop in the prepared `README.md` and `SECURITY.md`. Issue templates including "I'm stuck on #N". ESLint + Prettier + `pnpm lint`.
**Resolves:** TDD D11
**Done when:**
- [ ] `pnpm lint` clean
- [ ] `LICENSE` is Apache-2.0 and `NOTICE` exists
- [ ] `SECURITY.md` describes the isolation model and a disclosure route
- [ ] README states flags are client-verified and why

### T-1.3 — Directory structure
**Depends on:** T-1.1
**Do:** Build the tree from TDD §3, `.gitkeep` where empty. Gitignore `public/targets/` — it is generated.
**Done when:**
- [ ] Tree matches TDD §3
- [ ] `public/targets/` is gitignored

### T-1.4 — Schema and challenge index
**Depends on:** T-1.3
**Files:** `src/lib/schema.ts`, `src/lib/challenges.ts`
**Do:** Implement the Zod schema and `import.meta.glob` index from TDD §4. Assert unique `slug`, `order`, `flagHash`. Fail the build loudly on any error. Exclude `status: 'draft'` in production only.
**Done when:**
- [ ] Unit test: malformed `meta.json` fails the build with a readable message
- [ ] Unit test: duplicate `flagHash` fails the build
- [ ] Unit test: a `draft` challenge is absent in production, present in dev
- [ ] Index sorted by `order`

### T-1.5 — CI
**Depends on:** T-1.2, T-1.4
**Files:** `.github/workflows/ci.yml`
**Do:** typecheck → lint → unit → content lint → build → Playwright. Escape and solve suites are required checks; wire them now even though they are empty.
**Done when:**
- [ ] CI green on a PR
- [ ] Escape and solve jobs exist and are required

---

# Phase 2 — Isolation

> Read TDD §5 in full first. This phase decides whether the project is safe to ship.

### T-2.1 — Target build pipeline
**Depends on:** T-1.4
**Files:** `scripts/build-targets.mjs`, `src/targets/runtime/*`
**Do:** Glob `src/challenges/*/target.html`, inject the runtime shims and the per-challenge `<meta>` CSP derived from `meta.targetCsp`, write to `public/targets/<slug>.html`. Wire into build and dev.
**Resolves:** TDD D2
**Done when:**
- [ ] A dummy target builds to `public/targets/`
- [ ] Output carries the correct `<meta http-equiv="Content-Security-Policy">`
- [ ] Editing `target.html` in dev regenerates with no manual step

### T-2.2 — `ChallengeFrame` island
**Depends on:** T-2.1
**Files:** `src/components/ChallengeFrame.tsx`
**Do:** `<iframe src="/targets/<slug>.html" sandbox="allow-scripts" referrerpolicy="no-referrer">`, height from `meta.frameHeight`, reset via React `key`, `--danger` chrome with a "SANDBOXED TARGET" label. **Register no `message` listener.**
**Resolves:** TDD D3, D4
**Done when:**
- [ ] Sandbox attribute is exactly `allow-scripts`
- [ ] Reset restores initial state with no page reload
- [ ] `grep -r "addEventListener('message'" src/` returns nothing outside `src/targets/`

### T-2.3 — Escape suite
**Depends on:** T-2.2
**Files:** `tests/e2e/escape.spec.ts`
**Do:** Every assertion in TDD §7.1, generated from the challenge index so new challenges are covered automatically. Include the request-count check and the parent-`localStorage` byte comparison.
**Done when:**
- [ ] All TDD §7.1 assertions implemented
- [ ] Auto-covers a newly added challenge with zero test edits
- [ ] Green against the dummy target
- [ ] Adding `allow-same-origin` makes the suite fail (verify, then revert)

### T-2.4 — Verify `crypto.subtle` in an opaque-origin frame
**Depends on:** T-2.2
**Do:** In a sandboxed target, log `isSecureContext` and attempt `crypto.subtle.digest`. Test Chrome, Firefox, Safari.
**Resolves:** TDD D7
**Done when:**
- [ ] Per-browser result recorded in TDD §18 D7
- [ ] If unavailable anywhere, the vendored pure-JS HMAC path (TDD §9) is confirmed as the plan

### T-2.5 — CSP headers
**Depends on:** T-2.1
**Files:** `vercel.json`
**Do:** Implement TDD §5.3 — global parent policy, `/targets/*` override, `frame-ancestors 'none'` on the shell and `'self'` on targets.
**Done when:**
- [ ] Preview deploy: `curl -I` shows the correct policy per path
- [ ] Zero CSP violations in the console on any shell page
- [ ] Framing the shell from a foreign origin is refused

### 🛑 T-2.6 — Isolation gate
**Depends on:** T-2.3, T-2.5
**Do:** Human review. PRD §13: if the sandbox is not airtight, the project stops.
**Done when:**
- [ ] Escape suite green, human-reviewed, go/no-go recorded

---

# Phase 3 — Act I

### T-3.1 — Flag tooling
**Depends on:** T-1.4
**Files:** `scripts/make-flag.mjs`, `src/lib/flag.ts`
**Do:** Generator emits a `ctfpawned{…}` flag plus its slug-separated SHA-256. Implement `verify()` per TDD §6.2 with `trim` + `toLowerCase`.
**Resolves:** TDD D5
**Done when:**
- [ ] Unit tests: correct flag passes; trailing whitespace passes; wrong case passes; wrong flag fails
- [ ] Unit test: the same flag fails against a different slug's hash

### T-3.2 — Scrambles (challenge 1)
**Depends on:** T-3.1, T-2.2
**Files:** `src/challenges/01-scrambles-encoding/*`
**Do:** Build per TDD §10.1. Port the Phase 0 drafts into `brief.mdx`, `hints.mdx`, `solution.mdx`. Write `solve.ts`.
**Done when:**
- [ ] Solvable by hand with devtools only
- [ ] `solve.ts` produces the flag headlessly
- [ ] Escape suite green for this target
- [ ] Works on a 360 px viewport

### T-3.3 — Knox (challenge 2)
**Depends on:** T-3.2
**Do:** TDD §10.2. All three attack routes must reach the flag.
**Done when:**
- [ ] All three routes work
- [ ] `solve.ts` green, escape suite green

### T-3.4 — Cookie jar shim + Biscuit (challenge 3)
**Depends on:** T-3.3
**Files:** `src/targets/runtime/cookie-jar.js`, `src/challenges/03-biscuit-cookie/*`
**Do:** Implement the shim per TDD §5.5, then the challenge per §10.3. Derived flag.
**Done when:**
- [ ] Unit tests: set one, set two, overwrite, read-back ordering
- [ ] Manual: setting a cookie from the console in the frame context works
- [ ] `solve.ts` green, escape suite green, mobile viewport OK

### T-3.5 — JWT runtime + Nought (challenge 4)
**Depends on:** T-2.4, T-3.4
**Files:** `src/targets/runtime/{hmac-sha256,jwt}.js`, `src/challenges/04-nought-alg-none/*`
**Do:** Vendor a readable pure-JS HMAC-SHA256. Write the deliberately-vulnerable verifier from TDD §9 — it must read as plausible production code, not as a puzzle. Then the challenge per §10.4, derived flag.
**Resolves:** TDD D6
**Done when:**
- [ ] Unit test against `jose` fixtures: valid HS256 tokens verify
- [ ] Unit test: `alg: none` accepted by the vulnerable version, rejected by the fixed one
- [ ] Flag literal appears nowhere in the target source
- [ ] `solve.ts` green, escape suite green

### T-3.6 — Solution suite harness
**Depends on:** T-3.2
**Files:** `tests/e2e/solve.spec.ts`
**Do:** Generate a test per challenge from the index: run `solve.ts`, submit the flag, assert solved. Assert each `solve.ts` touches only its own slug.
**Done when:**
- [ ] Auto-covers new challenges with zero test edits
- [ ] Green for challenges 1–4
- [ ] A cross-slug reference in any `solve.ts` fails the suite
- [ ] Required in CI

### 🛑 T-3.7 — Act I gate
**Depends on:** T-3.6
**Do:** Four challenges are live and the Act I beat resolves. Confirm the shape works before committing to eight more.
**Done when:**
- [ ] Act I playable end to end
- [ ] Go/no-go on Acts II and III recorded

---

# Phase 4 — Act II

### T-4.1 — Sesame (challenge 5)
**Depends on:** T-3.7
**Do:** TDD §10.5. `alg: none` must now be rejected. Ship the 20-word candidate list and an in-target signing helper.
**This task is the proof of PRD S8** — it is the first challenge added after the loader exists.
**Done when:**
- [ ] `git diff --stat` touches only `src/challenges/05-sesame-weak-secret/`
- [ ] `alg: none` rejected; signing helper produces tokens the verifier accepts
- [ ] `solve.ts` green, escape suite green
- [ ] PRD S8 confirmed

### T-4.2 — Mock fetch shim + Digit (challenge 6)
**Depends on:** T-4.1
**Files:** `src/targets/runtime/mock-fetch.js`, `src/challenges/06-digit-idor/*`
**Do:** Build the shim (real `Response` objects, in-memory route table) then the challenge per TDD §10.6. Record 1337 carries the 03:14 timestamp that seeds the Act II beat.
**Done when:**
- [ ] `await res.json()` works against the shim
- [ ] `solve.ts` green, escape suite green, mobile viewport OK

### T-4.3 — SQLite WASM loading spike
**Depends on:** T-2.5
**Do:** Try the CORS route first (`connect-src 'self'`, `'wasm-unsafe-eval'`, `Access-Control-Allow-Origin: *` on the `.wasm`). If awkward, fall back to inlined base64 per TDD §5.3.
**Resolves:** TDD D8
**Done when:**
- [ ] `sql.js` initialises inside a sandboxed target
- [ ] Approach recorded in TDD §18 D8
- [ ] Escape suite still green with the relaxed `connect-src`

### T-4.4 — Bobby (challenge 7)
**Depends on:** T-4.3
**Do:** TDD §10.7. Seed the cats and `staff_notes` tables. Show the constructed SQL live under the search box. 2-second query cap; rebuild the DB on reset.
**Done when:**
- [ ] `' OR '1'='1` dumps the table
- [ ] `UNION SELECT` reaches `staff_notes`
- [ ] A malformed query errors rather than hanging
- [ ] WASM loads only on this page (check the network panel elsewhere)
- [ ] `solve.ts` green, escape suite green

### T-4.5 — Echo (challenge 8)
**Depends on:** T-4.4
**Do:** TDD §10.8. Win condition is reading the session token into `#exfil`, not `alert(1)`.
**Done when:**
- [ ] `alert()` confirmed blocked, and the brief does not ask for it
- [ ] **Escape suite green with a live XSS payload running in the frame** — the most important single check in the project
- [ ] `solve.ts` green

---

# Phase 5 — Act III

### T-5.1 — Dotty (challenge 9)
**Depends on:** T-4.5
**Do:** TDD §11.9 — normalisation strips `../` exactly once, so `....//` survives. Flag lives in `private/incident.txt`, which is also the first document naming the intruder.
**Done when:** `solve.ts` green, escape suite green

### T-5.2 — Wildcard (challenge 10)
**Depends on:** T-5.1
**Files:** `src/targets/runtime/mock-fetch.js` (CORS variant), challenge dir
**Do:** TDD §11.10. Extend the shim to enforce real CORS semantics: preflight `OPTIONS`, `Origin` reflection into `Access-Control-Allow-Origin`, `Allow-Credentials: true`, and rejection of `*` with credentials. Two panes: donations API and attacker origin.
**Done when:**
- [ ] Unit tests: preflight fires for non-simple requests; `*` + credentials is rejected with the real error shape
- [ ] The naive attempt fails the way a real browser fails it
- [ ] The solution page states which parts are faithful and which are simulated
- [ ] `solve.ts` green, escape suite green

### T-5.3 — Lucky (challenge 11)
**Depends on:** T-5.2
**Do:** TDD §11.11 — explicit LCG with published constants, not V8 internals. `xorshift128+` is named in the solution as further reading only.
**Done when:**
- [ ] Seed recovery is deterministic
- [ ] `solve.ts` green and not engine-dependent

### T-5.4 — Pedigree (challenge 12)
**Depends on:** T-5.3
**Do:** TDD §11.12. `{"__proto__":{"verified":true}}` pollutes `Object.prototype`; an unrelated later check reads `record.verified` as truthy, surfacing the forged pedigree that closes the story.
**Done when:**
- [ ] The unrelated code path visibly breaks — that moment is the lesson
- [ ] `solve.ts` green, escape suite green
- [ ] The final `## Recovered` fragment lands the ending

---

# Phase 6 — Shell completion

### T-6.1 — Progress store
**Depends on:** T-3.1
**Files:** `src/lib/progress.ts`
**Do:** TDD §6.3 — nanostores persistent, `v: 1`, `migrate()`, corrupt-blob recovery.
**Done when:**
- [ ] Survives reload; syncs across tabs
- [ ] Unit test: a corrupt blob is replaced, not thrown on
- [ ] Unit test: an unknown future `v` degrades safely

### T-6.2 — `FlagForm`
**Depends on:** T-6.1
**Do:** Input, verify, celebrate, write progress. No network on submit.
**Done when:**
- [ ] Playwright: submitting issues zero network requests
- [ ] A wrong flag gives a non-punishing error
- [ ] Keyboard-operable, result announced to screen readers

### T-6.3 — `HintDrawer`
**Depends on:** T-6.1
**Do:** Sequential reveal, dynamic-import each hint chunk, increment `hintsUsed`.
**Done when:**
- [ ] Hint text absent from the initial page source (view-source check)
- [ ] Hints unlock strictly in order
- [ ] `hintsUsed` persists

### T-6.4 — Solution routes
**Depends on:** T-6.1
**Do:** Separate route per TDD §8, gated with an explicit "show me anyway" confirm.
**Done when:**
- [ ] Solution prose absent from the challenge page bundle
- [ ] Give-up path sets `gaveUp: true`

### T-6.5 — Story panel
**Depends on:** T-6.4
**Files:** `src/components/StoryPanel.tsx`, `src/content/story.json`
**Do:** TDD §13.1 — derive unlocked fragments from `progress.solved`. Locked fragments render **redacted, not hidden**. `story.json` holds act titles, blurbs, and the act→order mapping, nothing else.
**Resolves:** PRD Q6
**Done when:**
- [ ] Fragments unlock purely from solved state, with no separate storage
- [ ] Locked fragments are visible as redactions
- [ ] Deleting `story.json` degrades to a plain challenge list rather than crashing

### T-6.6 — Index, primer, about
**Depends on:** T-6.5
**Do:** Index with cat cards grouped by act and progress. The primer covers devtools basics and the frame-context step (TDD §5.5) per browser. About covers ethics and PRD N1/N2 framing.
**Done when:**
- [ ] Primer has per-browser instructions precise enough to follow without screenshots
- [ ] Challenges are attemptable in any order (PRD PR7)
- [ ] The non-dismissible legality footer is sitewide (PRD PR9)

### T-6.7 — Export / import / clear progress
**Depends on:** T-6.1
**Do:** PRD PR13, PR14 — base64 round-trip, version check, confirm on import and on clear.
**Done when:**
- [ ] Round-trip across two browser profiles works
- [ ] A malformed string fails safely

### T-6.8 — Content lint
**Depends on:** T-5.4
**Files:** `scripts/check-content.mjs`
**Do:** Every check in TDD §14, including the cross-slug reference check and the SVG contract checks.
**Done when:**
- [ ] Removing `## The fix` from any solution fails the build
- [ ] Removing `## Recovered` from any solution fails the build
- [ ] Adding a cross-slug reference to any `target.html` fails the build
- [ ] Wired into CI

---

# Phase 7 — Design and accessibility

### T-7.1 — Tokens and neobrutalist pass
**Depends on:** T-6.6
**Do:** TDD §12.1. Target frame always in `--danger` chrome with a repeated label. Act colours decorative only.
**Done when:**
- [ ] Tokens used everywhere; no hardcoded hex outside `tokens.css`
- [ ] The sandboxed region is visually unmistakable

### T-7.2 — Contrast and a11y audit
**Depends on:** T-7.1
**Files:** `tests/e2e/a11y.spec.ts`
**Do:** axe-core on index, a challenge page, a solution page, and the story panel. Contrast-check every token pair. Solved state carries a glyph, not colour alone.
**Done when:**
- [ ] Zero serious/critical axe violations
- [ ] All token pairs pass AA
- [ ] Full keyboard traversal of a challenge page, focus always visible

### T-7.3 — Generate twelve cat SVGs
**Depends on:** T-7.1
**Files:** `src/assets/cats/*.svg`
**Do:** Generate one SVG per cat, matched to the personality from T-0.1. Run each through SVGO, add `<title>` and `<desc>`, and verify against the TDD §12.3 contract.
**Resolves:** TDD D13
**Done when:**
- [ ] 12 SVGs, correct `viewBox`, token palette only
- [ ] No `<image>`, `<text>`, `<foreignObject>`, embedded raster, external refs, or scripts
- [ ] Each ≤ 20 KB after SVGO, legible at 48 px
- [ ] Content lint passes on all twelve
- [ ] Regenerating one cat is a one-file diff with no code change

### T-7.4 — Mobile
**Depends on:** T-7.2
**Do:** PRD PR18 — challenges 1–4 and 6 usable on a phone. Others carry a desktop-preferred badge from `meta.mobileOk`.
**Done when:**
- [ ] Playwright mobile viewport: 1–4 and 6 completable
- [ ] No horizontal scroll at 360 px
- [ ] Desktop-preferred badge renders from meta

### T-7.5 — Performance budget
**Depends on:** T-7.4
**Do:** Enforce TDD §15 via Lighthouse CI.
**Done when:**
- [ ] Challenge page JS ≤ 40 KB gz
- [ ] FCP ≤ 1.5 s on the throttled mobile profile
- [ ] Budget failures break CI

---

# Phase 8 — Launch

### T-8.1 — Playtest
**Depends on:** T-7.5
**Do:** PRD S3, S9 — three people with no security background attempt Act I unaided. Ask each what happened at Nine Lives.
**Done when:**
- [ ] ≥2 of 3 complete Act I without help
- [ ] Stall points logged as issues
- [ ] At least one can describe the story

### T-8.2 — Fix playtest findings
**Depends on:** T-8.1
**Do:** Address stalls, usually by rewriting hint 1.
**Done when:** every logged stall is fixed or explicitly accepted

### T-8.3 — Ship
**Depends on:** T-8.2
**Do:** Production deploy to `ctfpawned.vercel.app`, final README pass, verify the PRD §11 definition-of-done list.
**Done when:**
- [ ] Every PRD §11 box ticked
- [ ] Escape and solve suites green on the production build
- [ ] Sent to three strangers; the link works with no explanation

---

# Phase 9 — Post-v1

> PRD §13 names fix mode as the reason this project exists rather than a link to PortSwigger.

### T-9.1 — Fix-mode harness
**Depends on:** T-8.3
**Do:** A Web Worker spawned from **inside** a sandboxed target frame (`/targets/<slug>-fix.html`, same `allow-scripts`-only sandbox, `worker-src blob:`). 3-second timeout then `terminate()`. `{code, testId}` in, `{testId, pass, message}` out.

Nesting the worker inside the opaque-origin frame rather than running it on the app origin matters: an app-origin worker would have same-origin `fetch` and IndexedDB. The learner only ever attacks themselves, but "no origin privileges at all" is a much stronger guarantee than "only your own browser," and it is free here.
**Done when:**
- [ ] An infinite loop is terminated and the tab stays responsive
- [ ] The worker has no same-origin `fetch` and no IndexedDB access (assert both)
- [ ] The worker never receives a flag

### T-9.2 — Editor
**Depends on:** T-9.1
**Do:** CodeMirror 6, bounded editable region, Run button, results split into Security and Functional.
**Done when:**
- [ ] Loads lazily, only on unlocked fix panels
- [ ] Usable on a phone
- [ ] Both categories render separately

### T-9.3 — Fix suites for Knox and Biscuit
**Depends on:** T-9.2
**Do:** Each `fix/tests.js` contains **security tests** (the original exploit now fails) and **functional tests** (legitimate use still works). Both must pass. That is the entire pedagogical point: deleting the feature is not a fix.
**Done when:**
- [ ] Deleting the feature **fails** the functional tests
- [ ] The original exploit fails against a correct patch
- [ ] A naive patch (blocklisting one string) still fails security

### T-9.4 — Roll out fix mode
**Depends on:** T-9.3
**Do:** Scrambles, Sesame, Digit, Pedigree, then Bobby last — a correct fix there means introducing parameterised queries, which is the most valuable and the hardest.
**Done when:** each shipped challenge has both categories passing against a reference patch

### T-9.5 — Certificate
**Depends on:** T-8.3
**Do:** Client-generated SVG listing solved challenges, with a verification code **labelled decorative**.
**Done when:**
- [ ] Downloads as SVG
- [ ] Copy states plainly that it is a souvenir, not proof

### T-9.6 — Learning paths
**Depends on:** T-8.3
**Files:** `src/content/paths.json`
**Do:** Ordered slug lists cutting across story order — "JWT in 20 minutes", "Client-side trust", "Injection basics".
**Done when:**
- [ ] 3 paths defined
- [ ] Adding a path needs no code change

---

## Effort summary

| Phase | Days | Notes |
|---|---|---|
| 0 — Content | 4.0 | The kill gate. 12 briefs, 36 hints, 12 solutions, 12 fragments |
| 1 — Baseline | 1.0 | |
| 2 — Isolation | 1.5 | The other kill gate |
| 3 — Act I | 2.0 | |
| 4 — Act II | 2.5 | T-4.3 is the wildcard |
| 5 — Act III | 2.5 | |
| 6 — Shell | 1.5 | |
| 7 — Design & a11y | 2.0 | Includes generating twelve cats |
| 8 — Launch | 1.0 | |
| **v1 total** | **18.0** | |
| 9 — Post-v1 | 5.0 | The differentiator |
