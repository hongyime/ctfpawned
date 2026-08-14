# ctfpawned

**Twelve web-security puzzles that run entirely in your browser tab. No account, no install, no Docker, no backend.**

→ **[ctfpawned.vercel.app](https://ctfpawned.vercel.app)**

---

## What this is

Learning web security means practising the attacks. Every good platform for that — PortSwigger's Web Security Academy, OWASP Juice Shop, HackTheBox — needs a server, an account, or a Docker install first.

ctfpawned needs a tab.

Each challenge is a deliberately broken mini-application running inside a sandboxed iframe on this page. You attack it with the browser devtools you already have. You get a flag. A hash check confirms it. Then you read how the bug actually gets fixed in production.

Twelve challenges, three acts, twelve cats, and one story about a cat adoption agency with very bad engineering.

## The roster

| # | Cat | What breaks | Act |
|---|---|---|---|
| 1 | Scrambles | Encoding mistaken for encryption | I |
| 2 | Knox | Client-side auth bypass | I |
| 3 | Biscuit | Cookie forging | I |
| 4 | Nought | JWT `alg: none` | I |
| 5 | Sesame | JWT claim tampering, weak secret | II |
| 6 | Digit | Broken object-level authorisation (IDOR) | II |
| 7 | Bobby | SQL injection | II |
| 8 | Echo | Reflected XSS | II |
| 9 | Dotty | Path traversal | III |
| 10 | Wildcard | CORS misconfiguration | III |
| 11 | Lucky | Weak PRNG token prediction | III |
| 12 | Pedigree | Prototype pollution | III |

Attempt them in any order. The story reads best in order.

## Is this safe?

Yes, and the design is worth explaining rather than asserting.

Every vulnerable target runs in an `<iframe sandbox="allow-scripts">` with **no** `allow-same-origin`. That puts it in an opaque origin, which means it cannot read this page's DOM, cannot read your progress, cannot set cookies, and cannot reach the network. Each target also carries its own Content-Security-Policy with `connect-src 'none'`, so nothing gets out even if you write a payload that tries.

An automated escape suite runs against every target on every commit, asserting all of the above. If it goes red, the build fails. It is a merge blocker, and weakening an assertion to make it pass is not a repair.

Full details are in [`SECURITY.md`](./SECURITY.md). The sandbox escape checks
live in [`tests/e2e/escape.spec.ts`](./tests/e2e/escape.spec.ts).

## About the flags — the honest version

**Flags are verified in your browser by comparing a SHA-256 hash against one in the bundle. There is no server.**

This means a determined person can open the target's source and read the flag without solving anything. Some challenges derive their flag from the artifact you produce — a forged token, a predicted session — so the flag exists nowhere in the source and you have to actually do the attack. Most do not.

This is a deliberate trade. Preventing it would need a backend, and a backend would cost the thing this project is actually for: click a link, start learning, zero setup. ctfpawned is a teaching tool, not a competition. If you cheat, you have cheated yourself out of an afternoon.

## Rules

**Everything you learn here is for systems you own or have written permission to test.**

Every target lives inside this page. None of these payloads work against anything real without substantial modification, and that is on purpose. Unauthorised access to a computer system is a crime in essentially every jurisdiction — in Singapore, the Computer Misuse Act; in the UK, the Computer Misuse Act 1990; in the US, the CFAA.

Every challenge ships with a `The fix` section, because knowing how to break something is half a skill.

## Running locally

```bash
pnpm install
pnpm dev          # http://localhost:4321
```

```bash
pnpm build        # build targets, lint content, build site
pnpm test         # unit tests
pnpm test:e2e     # escape, solve, and a11y suites
```

Node 24 is pinned in [`.nvmrc`](./.nvmrc) for Vercel compatibility. The package
expects pnpm 11 or newer.

## Adding a challenge

One directory. The build globs it, and no shell code changes:

```
src/challenges/13-yourcat-yourvuln/
  meta.json      # slug, cat, difficulty, flag hash, frame height, CSP needs
  brief.mdx      # the scenario
  hints.mdx      # exactly 3, escalating
  solution.mdx   # walkthrough + "## The fix" + "## Recovered"
  target.html    # the vulnerable mini-app
  solve.ts       # headless reproduction, so CI proves it is solvable
```

`pnpm flag <slug>` generates a flag and its hash. The content lint will tell you what you missed.

## Project references

- [`SECURITY.md`](./SECURITY.md) — security scope, reporting, and sandbox guarantees
- [`src/challenges`](./src/challenges) — the active challenge roster and target source
- [`tests/e2e`](./tests/e2e) — browser isolation, solve, launch QA, and accessibility checks

## Contributing

Bug reports, stuck-on-a-challenge questions, and prose fixes are all welcome. New challenges: open an issue first — the set is curated, not open-ended.

**Found a sandbox escape? Please read [`SECURITY.md`](./SECURITY.md) before opening a public issue.**

## Licence

Apache-2.0. See [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).
