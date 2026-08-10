# PRD — ctfpawned

| | |
|---|---|
| **Repo** | `hongyime/ctfpawned` |
| **URL** | `https://ctfpawned.vercel.app` |
| **Status** | Proposed |
| **Version** | 5 |
| **Last updated** | 2026-08-10 |
| **Licence** | Apache-2.0 |
| **Companion docs** | [`TDD.md`](./TDD.md) · [`TASKS.md`](./TASKS.md) |

**One-liner:** Twelve browser-only web-security puzzles — JWT tampering, cookie forging, sandboxed SQL injection — wrapped in a story about a cat adoption agency with very bad engineering, and no backend at all.

---

## 1. Summary

Learning web security means practising the attacks. The good practice platforms — PortSwigger Web Security Academy, OWASP Juice Shop, HackTheBox — all require a server, an account, or a Docker install. Nothing exists that is "click a link, get a real vulnerable target, entirely in your tab, zero setup."

ctfpawned is that: 12 self-contained challenges where the vulnerable application *is* the page. A sandboxed iframe runs a deliberately broken mini-app; the user attacks it with browser devtools; a flag is produced; a client-side hash check confirms it.

Each challenge belongs to a cat, and the twelve cats work at **Nine Lives**, a cat-run adoption agency you have been hired to audit. The story is what turns twelve exercises into one thing people finish.

---

## 2. Motivation and fit

- Sits exactly at the intersection of security, cats, and UI/UX.
- The content is teachable material the maintainer already understands from prior work (`ctfsolver`, `attackpassword`, `websiteDOS2019`, `keyLogger2020`). This project is that knowledge, packaged for other people.
- Static hosting: no backend, no database, no inference, no free-tier pause. Infrastructure risk is genuinely zero.
- It is the most *shareable* project in the portfolio. A good free CTF-lite gets passed around university security clubs.

---

## 3. Goals and non-goals

### Goals

| ID | Goal |
|---|---|
| G1 | **Zero setup.** One URL, no account, no install, no extension. |
| G2 | Each challenge teaches one specific, real, named vulnerability class. |
| G3 | Every attack is performed against a sandboxed target inside the page — never against a real service. |
| G4 | Progressive hints, then a full written explanation with the correct fix. |
| G5 | Progress persists locally and survives a refresh. |
| G6 | Solvable with browser devtools alone — no Burp, no curl, no CLI. |
| G7 | **The twelve challenges tell one story, and finishing it feels like finishing something.** |

### Non-goals

| ID | Non-goal |
|---|---|
| **N1** | **Never teach an attack against a live third-party target.** Every challenge target is in-page and sandboxed. No "now try this on a real site" framing, ever. |
| **N2** | **No working exploit payloads that function outside the sandbox.** Challenges use toy tokens, toy schemas, toy cookies. The transferable knowledge is the *concept*; the artifacts are inert. |
| N3 | No leaderboard, no accounts, no competitive scoring in v1. That needs a backend and invites cheating debates. |
| N4 | Not a CTF platform. Fixed curated content, not user-submitted challenges. |
| N5 | No binary exploitation, no crypto attacks needing real compute. Web only. |
| N6 | No analytics, no tracking, no cookies set by the site itself. |
| **N7** | **The story must never gate a challenge.** Any challenge can be attempted, in any order, by someone who skips every word of narrative. |

---

## 4. Users and use cases

| User | Use case | What success looks like for them |
|---|---|---|
| CS students | First hands-on exposure without a VM | Finishes Act I in one sitting, understands *why* each broke |
| Bootcampers / junior devs | "Why does everyone say don't store the role in the JWT?" | Reads the solution page and can explain the fix in review |
| The maintainer | Teaching artifact and portfolio piece | Demonstrates understanding of both attack *and* fix |
| Club organisers | A warm-up set to point beginners at | Links it in a Discord and it needs no support |
| Security-curious designers | Wants to see what devtools can do | Gets through Scrambles and Biscuit without feeling stupid |

**Explicitly not a target user:** someone looking for tooling or payloads to use against systems they do not own.

---

## 5. Scope — the twelve

All twelve ship. They are grouped into three acts, which are development gates and narrative beats, not paywalls or unlocks.

### Act I — The Front Door

*You have been hired to audit Nine Lives before their funding round. Start with the member-facing site.*

| # | Cat | Slug | Vulnerability | Diff |
|---|---|---|---|---|
| 1 | **Scrambles** | `01-scrambles-encoding` | Encoding mistaken for encryption | 1 |
| 2 | **Knox** | `02-knox-client-auth` | Client-side auth bypass | 1 |
| 3 | **Biscuit** | `03-biscuit-cookie` | Cookie forging | 2 |
| 4 | **Nought** | `04-nought-alg-none` | JWT `alg: none` | 2 |

### Act II — Inside the Walls

*The perimeter is a formality. Now the adoption database — and the first thing that does not add up.*

| # | Cat | Slug | Vulnerability | Diff |
|---|---|---|---|---|
| 5 | **Sesame** | `05-sesame-weak-secret` | JWT claim tampering, weak HS256 secret | 3 |
| 6 | **Digit** | `06-digit-idor` | IDOR / broken object-level authorisation | 2 |
| 7 | **Bobby** | `07-bobby-sqli` | SQL injection | 3 |
| 8 | **Echo** | `08-echo-xss` | Reflected XSS | 3 |

### Act III — Someone Was Here First

*The anomalies are not bugs. Somebody has been living in this system, and they have been careful.*

| # | Cat | Slug | Vulnerability | Diff |
|---|---|---|---|---|
| 9 | **Dotty** | `09-dotty-traversal` | Path traversal | 3 |
| 10 | **Wildcard** | `10-wildcard-cors` | CORS misconfiguration | 3 |
| 11 | **Lucky** | `11-lucky-prng` | Weak PRNG token prediction | 4 |
| 12 | **Pedigree** | `12-pedigree-proto` | Prototype pollution | 4 |

### Why these names

Every name is a plausible cat name first and a pun second, and the pun only lands *after* you solve the challenge — which is exactly when a name becomes memorable rather than a spoiler.

Bobby is [little Bobby Tables](https://xkcd.com/327/). Dotty is `../`. Sesame is the weak secret you can guess. Wildcard is the `*` in `Access-Control-Allow-Origin`. Pedigree is inheritance. Knox is a Fort Knox that is a screen door. Nought is the algorithm that is not there. Echo is what reflected means. Digit is a toe and a number. Biscuit is a cookie. Scrambles scrambles nothing.

### Beyond v1

- **"Now fix it" mode** — an editor where the user patches the vulnerable code and a test suite verifies both that the exploit fails *and* that the app still works. The feature that makes ctfpawned distinctive rather than a Juice Shop lite.
- Shareable completion certificate (client-generated SVG).
- Curated learning paths cutting across the story order.

---

## 6. The story

### 6.1 Premise

**Nine Lives** is a cat adoption agency whose entire engineering team is cats. You are their first human hire, brought in to audit the platform before a funding round. Every cat built one system, badly, in a way that reflects their personality.

Somewhere in Act II you find an edit nobody made. In Act III you work out who has been inside. The answer is **Smudge** — cage 13, no pedigree, never adopted, who taught himself to code on the shelter's public terminal and has been quietly moving his own record up the adoption list for two years.

He is not malicious. He is applying for a home. The report you file at the end is the reason he gets one.

### 6.2 How the story is delivered — and why it costs nothing

The narrative lives **entirely in prose already being written**:

- The **brief** of each challenge sets the scene for that cat's system.
- The **solution page** ends with a short *log fragment* — a scrap recovered from the system you just broke.

That is it. No shared state, no cross-challenge unlocks, no ordering dependency, no code. Twelve solution pages each gain three sentences.

> **Explicitly rejected:** flags that chain into each other, or a final challenge that consumes earlier flags. It sounds great and it would wreck the two properties this project is built on — challenges must stay independently solvable (N7) and independently testable (S1). It would also make the automated solve suite order-dependent, which is how a green CI stops meaning anything.

### 6.3 Act boundaries are real endings

Each act closes on a resolved beat, so the project is presentable at three points rather than one. If development stalls after Act II, the Act II closing fragment is rewritten into an ending and the project ships as a complete eight-challenge story — not as "8 of 12, more coming soon," which is the failure mode in §10.

---

## 7. Product requirements

### 7.1 Challenge experience

- **PR1** Each challenge page shows: a scenario brief, the live sandboxed target, a flag input, and a hint drawer.
- **PR2** Hints unlock one at a time and are lazily fetched, so casual view-source does not spoil them.
- **PR3** The solution page is a separate route, reachable after solving *or* via an explicit "I give up, show me" confirmation.
- **PR4** Every solution page names the real-world fix, with a code sample of the corrected version — not just the exploit.
- **PR5** A "Reset target" control restores the mini-app to its initial state without a page reload.
- **PR6** Flags are validated entirely client-side by hash comparison. No network request is made on submit.
- **PR7** Challenges are attemptable in any order. Story order is the default sort, never a lock.

### 7.2 Safety and framing

- **PR8** Every target runs in an iframe with no same-origin privileges and no network egress.
- **PR9** A persistent, non-dismissible footer states that the targets are toys and that attacking systems you do not own is illegal.
- **PR10** `SECURITY.md` explains the sandboxing model and how to report an escape.
- **PR11** No challenge ships a payload that is useful against a real system without substantial modification.

### 7.3 Progress

- **PR12** Progress is stored in `localStorage`, versioned, and survives schema changes via migration.
- **PR13** Progress can be exported and imported as a single string.
- **PR14** A visible "clear all progress" control exists.
- **PR15** A story panel shows collected log fragments, with unsolved ones redacted rather than hidden — the shape of the story is visible from the start.

### 7.4 Accessibility and platform

- **PR16** All shell content meets WCAG 2.2 AA: contrast, focus visibility, keyboard operation, semantic headings.
- **PR17** `prefers-reduced-motion` is respected.
- **PR18** Challenges 1–4 and 6 are completable on a mobile browser. Others may be desktop-preferred and say so on the card.
- **PR19** Browser support: last two major versions of Chrome, Edge, Firefox, Safari, with a clear unsupported-browser notice otherwise.

---

## 8. Success criteria

| ID | Criterion | How it is measured |
|---|---|---|
| S1 | All 12 challenges solvable with devtools only | Automated solution test passes for each in CI |
| S2 | No challenge payload can reach the parent document | Automated escape suite passes for every target in CI |
| S3 | A CS undergrad with no security background completes Act I unaided | 3 playtests, ≥2 succeed without help |
| S4 | Every solution page names the real-world fix | Content lint asserts a `## The fix` section |
| S5 | Every solution page carries a log fragment | Content lint asserts a `## Recovered` section |
| S6 | Loads and plays on a phone | Playwright mobile run for challenges 1–4, 6 |
| S7 | FCP under 1.5 s on a mid-tier phone over 4G | Lighthouse CI budget |
| S8 | Adding a 13th challenge requires touching one directory and zero shell code | Verified when building challenge 5 — the first one added after the loader exists |
| S9 | Someone who finishes can tell you what happened at Nine Lives | Asked directly in playtesting |

---

## 9. Cost model

| Component | Free tier | Projected | Risk |
|---|---|---|---|
| Vercel Hobby (static) | 100 GB/mo bandwidth | Low | None |
| Domain | — | $0 | `ctfpawned.vercel.app`; no custom domain in v1 |
| Everything else | — | — | There is nothing else |

**Total: $0.**

**The real cost is content.** Code is roughly 30% of the effort; writing 12 briefs, 36 hints, 12 solution walkthroughs and 12 log fragments is the other 70%. Twelve challenges doubles the content bill relative to a six-challenge v1, and that bill is the whole reason projects like this die. §12 M0 exists to find out early.

---

## 10. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Sandbox escape into the parent page | **High** | No `allow-same-origin`; strict parent CSP; per-target CSP; an automated escape suite on every commit (TDD §7) |
| **Twelve is too many and it stalls at five** | **High** | Act gates (§6.3): each act is a complete, shippable story. M0 drafts all twelve *before* any code |
| Writing quality is the bottleneck | **High** | Draft all 12 briefs and solutions first. If drafting six is a slog, cut to Act I + II and ship eight |
| Content perceived as attack tutorials | Medium | Every challenge ships a "how to fix" section; targets are inert toys (N2); framing is defensive; `SECURITY.md` states intent |
| The story becomes load-bearing and couples the challenges | Medium | N7 and §6.2 forbid it structurally. Content lint asserts no challenge references another's flag |
| Duplicates Juice Shop / PortSwigger | Medium | Zero-setup, the story, and eventually "now fix it" |
| Users read the flag out of the target source | Low | Derive flags from the exploit artifact where possible (TDD §6.4); state the limitation plainly |
| Devtools UX differs across browsers | Medium | A "how to attack" primer with per-browser notes |
| Challenge 10 (CORS) can only be simulated | Medium | Kept, but built as a faithful simulation that enforces real CORS semantics including preflight and the credentials rule (TDD §11.10), and labelled as a simulation on the solution page |

---

## 11. Definition of done for v1

- [ ] 12 challenges, each with brief, target, 3 hints, solution naming the fix, and a log fragment.
- [ ] Escape suite green for all 12 targets.
- [ ] Solution suite green for all 12 challenges.
- [ ] The story resolves. Someone who finishes knows who Smudge is.
- [ ] Progress persists, exports, imports, and clears.
- [ ] Mobile works for challenges 1–4 and 6.
- [ ] `README.md`, `SECURITY.md`, `LICENSE` (Apache-2.0), `NOTICE`.
- [ ] Live at `ctfpawned.vercel.app`, and the URL survives being sent to three strangers.

---

## 12. Milestones

| # | Deliverable | Effort |
|---|---|---|
| M0 | Write all 12 briefs, solutions, hints, and log fragments as plain markdown. **Gate: if this is painful, cut to 8.** | 4 days |
| M1 | Repo baseline, Astro shell, challenge loader, CI | 1 day |
| M2 | Sandbox + automated escape suite | 1.5 days |
| M3 | Act I — challenges 1–4 | 2 days |
| M4 | Act II — challenges 5–8 | 2.5 days |
| M5 | Act III — challenges 9–12 | 2.5 days |
| M6 | Hints, progress, flags, solution routes, story panel | 1.5 days |
| M7 | Twelve generated cat SVGs, neobrutalist pass, mobile, a11y | 2 days |
| M8 | Playtest, docs, launch | 1 day |

**~18 days, front-loaded on writing.**

---

## 13. Kill criteria — drop or cut this if…

- **M0 is a slog.** The writing is the project. If drafting six solution walkthroughs feels like homework, cut to Act I + II and ship eight — do not attempt twelve.
- **The sandbox cannot be made airtight at M2.** Shipping deliberately vulnerable code on a domain that also serves a portfolio is not worth a half-solved isolation story.
- **The "now fix it" mode will never be built.** Without it eventually, this is a better-looking Juice Shop, and the honest recommendation is to point people at PortSwigger instead.

---

## 14. Resolved and open questions

| # | Question | Answer |
|---|---|---|
| Q1 | Domain? | **Resolved** — `ctfpawned.vercel.app`, no custom domain in v1 |
| Q2 | Mascot art? | **Resolved** — generated SVGs, conforming to the art contract in TDD §12 |
| Q3 | Keep the CORS challenge? | **Resolved** — kept, built as a faithful simulation (TDD §11.10) |
| Q4 | Licence? | **Resolved** — Apache-2.0 for the whole repo, code and prose |
| Q5 | Does Smudge get adopted on-page, or is it left implied? | Open — decide when writing the final fragment |
| Q6 | Should the story panel be a page or a drawer? | Open — decide at M6 |
