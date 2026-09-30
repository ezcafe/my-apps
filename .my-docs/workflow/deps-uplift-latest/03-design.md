# Design: deps-uplift-latest

**Mode:** simple  
**Has UI:** no · **Has API:** no · **Has DB:** no  
**Grill:** frontier-empty (auto Q1–Q3)

## Decision 1: which uplift shape?

### Option 1 — Safe + Next/React/Zod; defer majors (recommended)

**What it is:** One PR updating `package.json` + lockfile for stale same-major bumps, Next 16.3.7 family, React 19.3 + types, Zod 4.6, and other settled fresh minors. Defer graphql 17, graphql-scalars 2, dotenv 18, pnpm 12. Keep next-auth on v5 beta.

**Example:** `next`/`eslint-config-next`/`@next/*` → `16.3.7`; `react`/`react-dom` → `19.3.0`; `zod` → `^4.6.5`; leave `graphql` at `^16.14.2`.

**Pros:** Matches Grill; low blast; still reads notes for touched packages.  
**Cons:** Majors stay stale until a later run.

### Rejected alternative (≤3 lines)

Bump all majors in the same PR — higher break risk on GraphQL Yoga/scalars and dotenv; fights “migrate when applicable” without time for separate guides.

### Recommendation

**Pick Option 1.**

## Chosen design

1. Update declared versions in `/Users/ptquang86/ws/my-apps/package.json` for the uplift set (below).
2. Refresh `pnpm-lock.yaml` with `pnpm install` (or equivalent once Node/pnpm available).
3. Keep `next` pin exact and `@next/swc-darwin-arm64` exact **equal** to `next`.
4. Keep `eslint-config-next` and `@next/bundle-analyzer` on the same Next minor/patch line.
5. Do **not** change `next-auth`, `graphql`, `graphql-scalars`, `dotenv` major, or `packageManager` pnpm major.
6. After install: run `pnpm typecheck` + `pnpm test` (smoke). Fix only compile/test breakages caused by bumps (esp. React types / Zod).
7. Read primary notes for migrated packages; record any code edits in tasks. Expected code migration: **none or minimal** (Zod 4.6 additive; React 19.3 patch/minor; Next patch).

### Uplift set (target)

| Package | Target |
|---------|--------|
| next, eslint-config-next, @next/bundle-analyzer, @next/swc-darwin-arm64 | 16.3.7 |
| react, react-dom | 19.3.0 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| zod | ^4.6.5 (or latest 4.6.x) |
| @tanstack/react-query | ^5.104.0 |
| @graphql-yoga/plugin-response-cache | ^3.26.1 |
| graphql-yoga | ^5.24.1 |
| drizzle-orm | ^0.45.3 |
| drizzle-kit | ^0.31.11 |
| eslint | 10.11.0 (keep exact style if currently exact) |
| @eslint/compat | ^2.1.1 |
| rate-limiter-flexible | ^11.2.1 |
| tsx | ^4.23.15 |
| csv-parse | ^7.0.3 |
| @types/node | ^26 (resolves to latest 26.x) |

### Non-goals (this PR)

- graphql@17, graphql-scalars@2, dotenv@18, pnpm@12
- next-auth major/downgrade
- Apple MyBaby deps
- Product UI / API / DB schema

## System design

### Overview

**N/A** — dependency/tooling versions only; no new runtime boundaries.

## Design patterns used

### Pattern 1 — Aligned framework pins

- **What:** Keep Next + SWC optional + eslint-config-next on one version string.
- **How:** Same `16.3.7` for all four.
- **Why:** Avoid native binary / config skew (Grill scenario 2).
- **Best practices:** Match existing exact-pin style for `next` / SWC.

### Pattern 2 — Intended-line freezes

- **What:** Never follow npm `latest` when it leaves the app’s chosen major/beta line.
- **How:** Explicit exclude `next-auth` v4; defer GraphQL/dotenv majors.
- **Why:** False-latest trap from Analyze.

## Sequence (ops)

```text
inventory (done) → edit package.json → pnpm install
→ typecheck → unit → fix compile-only breaks → done
```

## API contracts

**N/A** — Has API no.

## Database contracts

**N/A** — Has DB no. Drizzle patch does not change schema.

## OWASP / security notes

- Prefer uplift of Next patch line (security/bugfix channel).
- Do not introduce secrets in lockfile commits.
- Majors deferred may still have CVEs — track as follow-up, not silent skip forever.

## Change-note skim (primary)

| Package | Source | Migrate?
|---------|--------|---------|
| zod 4.6 | https://github.com/colinhacks/zod/releases | Optional new APIs; lazy error-map timing — no required rewrite expected |
| next 16.3.7 | npm / Next releases | Patch — keep aligned peers |
| react 19.3 | npm | Minor — update types together |
| drizzle 0.45.3 / kit 0.31.11 | npm | Patch — no schema task |
| graphql-yoga 5.24 | npm | Minor on v5 — watch peer graphql@16 |

## Acceptance

- Lockfile reflects uplift set; deferred packages unchanged in intent
- `typecheck` + unit green
- No accidental next-auth v4 or graphql 17
