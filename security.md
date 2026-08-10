# Security Policy

ctfpawned hosts deliberately vulnerable code on purpose. This document explains what that means, what the actual security boundary is, and what to do if you get through it.

---

## What is intentionally broken

Every file under `src/challenges/*/target.html` is a deliberately vulnerable mini-application. Broken authentication, injectable queries, forgeable tokens, unescaped sinks — all of it is intentional and none of it is a bug report.

**Do not report vulnerabilities in the challenge targets.** That is the product.

---

## The actual security boundary

The one guarantee this project makes:

> **Code running inside a challenge target cannot affect the parent page, the visitor's data, or anything on the network.**

Everything else follows from holding that line.

### How it is enforced

**1. Opaque origin.** Every target loads in `<iframe sandbox="allow-scripts">`. The token list is exactly that — no `allow-same-origin`, no `allow-forms`, no `allow-popups`, no `allow-top-navigation`, no `allow-modals`. The document is placed in an opaque origin, so it cannot reach the parent DOM, cannot read `localStorage` (the parent's or its own), and cannot set cookies.

`allow-same-origin` is never added. Combined with `allow-scripts` it would let a frame strip its own sandbox attribute, which is not a boundary at all.

**2. Per-target Content-Security-Policy.** Targets are served from `/targets/<slug>.html` with their own policy, defaulting to:

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
img-src data:; connect-src 'none'; form-action 'none';
base-uri 'none'; frame-ancestors 'self';
```

`script-src 'unsafe-inline'` is deliberate — targets must run inline script, and one challenge exists specifically so you can inject some. Isolation comes from the opaque origin, not from the target's script policy. `connect-src 'none'` is what prevents exfiltration. One target (the SQL injection challenge) relaxes `connect-src` to `'self'` and adds `'wasm-unsafe-eval'` so it can load a WebAssembly SQLite build; that exception is declared in its metadata rather than hand-patched.

**3. Strict parent policy.** The shell runs under `default-src 'none'; script-src 'self'` with `frame-ancestors 'none'`, so ctfpawned cannot be framed by a third party and turned on a visitor.

**4. No message channel.** The parent page registers **no** `message` listener for target frames. A challenge payload has no path into the shell, and solving cannot be spoofed by a `postMessage` — only a correct flag in the form counts. Frame height is declared statically; "reset target" re-mounts the iframe rather than asking it to reset itself.

**5. Automated escape testing.** Every target is tested on every commit against attempts to reach `parent.document`, `top.location`, parent storage, its own storage, `document.cookie`, `fetch`, image beacons, top-level navigation, and `window.open` — plus a check that zero network requests originate from the frame and that the parent's `localStorage` is byte-identical before and after a hostile payload battery. The XSS challenge is tested with a live payload running.

These are merge blockers. A red escape test is a bug in the code, never in the test.

---

## What counts as a real vulnerability

Report any of these:

- A challenge payload reaching the parent document, parent storage, or parent state
- Any network request escaping a sandboxed target
- A challenge target navigating or framing the top-level page
- A CSP bypass on the parent document
- A cross-challenge interaction — one challenge affecting another's state
- Anything that makes ctfpawned usable as an attack tool against a third party
- Supply-chain issues in dependencies that affect the shell

Also worth reporting, though lower severity: a challenge whose payload works against real systems without substantial modification. Targets are meant to be inert toys, and one that is not is a design failure.

---

## Reporting

**Do not open a public issue for a sandbox escape.**

Use GitHub's private vulnerability reporting on this repository (Security → Report a vulnerability). Please include:

- The challenge slug
- The payload or steps
- Browser and version
- What you were able to reach

Expect an acknowledgement within a few days. This is a personal project maintained in spare time, so there is no bounty and no SLA — but escapes are taken seriously, and a confirmed one blocks releases until it is fixed.

Credit in the release notes if you would like it.

---

## Scope

**In scope:** `ctfpawned.vercel.app` and this repository.

**Out of scope:** the deliberately vulnerable challenge targets; anything requiring physical access to a visitor's device; findings against Vercel's infrastructure (report those to Vercel); the fact that flags are verified client-side.

That last one is a documented design decision, not an oversight. Flags are checked in the browser against a hash in the bundle, so a determined person can read one out of the source. Preventing that would require a backend, which would cost the zero-setup premise the project exists for. It is stated plainly in the README.

---

## For visitors

Everything you learn here is for systems you own or have written permission to test. Unauthorised access to a computer system is a criminal offence in essentially every jurisdiction. Every challenge ships with a section on how the bug is actually fixed, because that is the half of the skill that gets you hired.
