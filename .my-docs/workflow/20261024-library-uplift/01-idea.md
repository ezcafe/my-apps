# Idea / framing

## Intent

Bring project dependencies to their latest published versions. Where a bump has breaking API changes, update application and test code so existing product behavior stays the same. Also remove **unused packages** from the dependency tree. Success bar from user: **all features still work**.

## Goals

- Raise outdated packages toward latest (snapshot at ideation: Next 16.4 line, React patch, Playwright, passkit, zod, etc.).
- **Include GraphQL majors:** `graphql` 17, `graphql-yoga` 6, `graphql-scalars` 2, `@graphql-yoga/plugin-response-cache` 4 — with code updates for breaks.
- **Remove unused packages** (declared deps with no remaining import/require/runtime use after analysis).
- Adapt code and tests for known breaking changes (not “pin and ignore”).
- Keep product behavior stable: features that work today still work after the uplift.
- Prove stability with automated checks (unit / typecheck / lint / e2e as the design will specify).

## Non-goals

- New product features or UX redesigns.
- Schema migrations for their own sake (only if a library bump forces them).
- Rewriting architecture unrelated to the upgrade.
- Consolidating overlapping-but-used libraries into one stack (user scoped cleanup to **unused**, not “same job” merges).
- Aggressive “rewrite on another stack” just to shrink `package.json`.

## Anti-goals

- Shipping major bumps with silent behavior change.
- Force-pinning old majors to avoid code work when the ask is to take latest + fix breaks.
- Leaving the tree half-upgraded in a broken state.
- Removing a package that is still required (direct or tooling) without a working path.

## Constraints

- Gate C blocking for commit/push/PR/merge (explicit user yes).
- TDD / verify bar per Mode full + profile lite.
- Existing design system and workspace architecture stay in force.
- No secrets in commits.

## Has UI (tentative)

yes — UI packages (React, Next, charts, Query) may move; regression risk is user-visible.

## Shared understanding

- [x] User confirmed (brainstorm hard-gate) — “lock the ideation framing”

### Playback

- **Ask:** uplift libraries to latest; update codebase for breaking changes; cleanup unused packages.
- **Done looks like:** all features still work (user wording).
- **In scope (confirmed):**
  - GraphQL majors: `graphql` 17, yoga 6, scalars 2, response-cache 4 (+ code fixes).
  - Other outdated packages toward latest.
  - Remove **unused** packages only (not overlap-consolidation of still-used libs).
- **Guess (unconfirmed):** proof = typecheck + unit + e2e green (and lint) is enough for “all features still work” at Gate C.
