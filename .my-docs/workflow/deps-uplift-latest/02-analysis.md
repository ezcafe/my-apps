# Analysis: deps-uplift-latest

**Result:** done  
**Mode:** simple · **Note:** main-thread fallback — usage limit after Analyze Task retry  
**Inventory date:** 2026-09-30 (cutoff for “>1 week”: latest published on/before 2026-09-23)

## Overall deep dive

1. **What is this?** Bring my-apps `package.json` + lockfile up to current registry latest for packages that lag, read primary change notes, and migrate code/config only when those notes require it.
2. **Why do we need this?** Stale deps miss fixes and known migrations. Blind major bumps (or following the wrong npm `latest` tag) break build/runtime.
3. **How to do this?** Inventory installed vs registry → classify **stale (>1w)** vs **fresh (<1w)** vs **false-latest** → bump safe patch/minor → read notes for majors → migrate or defer. Other ways: renovate PRs only (slower); bump everything including majors in one PR (high blast). Best practices: stay on intended major lines; keep Next/React/eslint-config-next aligned; verify with typecheck + unit.

**Has API:** **no** — no public route/contract change planned.  
**Has DB:** **no** — drizzle patch only; no schema/migration work expected.  
**Grill recommended?** **yes** — open frontier on majors + whether to include fresh (<1w) Next line.

## Solution pieces (≤5)

### 1. Inventory + exclude false-latest

- **What:** Compare `node_modules` / declared ranges to npm `dist-tags.latest`; flag traps.
- **Why:** `next-auth` “latest” is **4.24.x** while the app is on **5.0.0-beta**; `pnpm` latest is **12.x** while `packageManager` is **10.5.2**.
- **How:** Explicit exclude list. Other: trust `pnpm outdated` alone — risky for betas. Best: primary registry + declared intent.

### 2. Safe stale uplift (patch/minor, latest ≥1 week old)

- **What:** Bump packages behind latest where the newer release is ≥1 week old and same major.
- **Why:** Matches the user “>1 week ages” rule with low risk.
- **How:** Edit `package.json` ranges / pins; refresh lockfile; smoke. List in Spike below.

### 3. Fresh (<1 week) Next / ecosystem patches

- **What:** Optionally bump `next` / `eslint-config-next` / `@next/*` **16.3.2→16.3.7** and other fresh minors (react-query, csv-parse, `@types/node`).
- **Why:** Framework patches often matter; age rule alone would skip them.
- **How:** Grill Decision — recommend **include Next family + aligned peers**; other fresh minors OK if same major.

### 4. Majors — read notes, migrate or defer

- **What:** `graphql` 16→17, `graphql-scalars` 1→2, `dotenv` 17→18, optional `pnpm` 10→12.
- **Why:** Breaking API / tooling risk; needs primary upgrade guides.
- **How:** Prefer **defer majors** this run unless notes show zero app impact; document non-goals. Other: one dedicated major PR later.

### 5. Verify

- **What:** Install + `typecheck` + unit (+ lint if cheap).
- **Why:** Catch breakages from React 19.3 / Zod 4.6 / eslint.
- **How:** Repo scripts; no new product tests unless Build hits a real regression.

## Spike notes (inventory)

| Bucket | Packages (installed → latest) |
|--------|-------------------------------|
| **Stale safe** | `@eslint/compat` 2.1.0→2.1.1; yoga cache 3.24.0→3.26.1; `@types/react` 19.2.17→19.3.0; `@types/react-dom` 19.2.4→19.3.0; `drizzle-orm` 0.45.2→0.45.3; `drizzle-kit` 0.31.10→0.31.11; `eslint` 10.9.0→10.11.0; `graphql-yoga` 5.22.0→5.24.1; `rate-limiter-flexible` 11.2.0→11.2.1; `react`/`react-dom` 19.2.8→19.3.0; `tsx` 4.23.13→4.23.15; `zod` 4.5.4→4.6.5 |
| **Fresh (<1w)** | `next`+aligned `@next/*`/`eslint-config-next` 16.3.x→16.3.7; `@tanstack/react-query` 5.102.8→5.104.0; `@types/node` 26.1.2→26.6.3; `csv-parse` 7.0.1→7.0.3; `dotenv` 17→18 (**major**) |
| **Defer / trap** | `next-auth` stay **5 beta** (ignore latest v4); `graphql` 17; `graphql-scalars` 2; `pnpm` 12 (unless separate tooling decision) |

**Already at latest (examples):** `@auth/core`, visx/*, `playwright` 1.63.0, `tailwindcss` 4.3.3, `typescript` 7.0.2, `postgres` 3.4.9.

## Reusable patterns

| Pattern | Where | Reuse |
|---------|-------|-------|
| Exact Next pin + matching SWC optional | `package.json` `next` / `@next/swc-darwin-arm64` | Keep versions aligned |
| ESLint TS6 require shim | `scripts/resolve-typescript6.cjs` + `lint` script | Preserve when bumping eslint |
| Drizzle via scripts | `db:migrate` / `db:generate` | Patch-only bump; no schema task |
| pnpm overrides | `pnpm.overrides.esbuild` | Keep unless conflict |

## System shape candidates

1. **One PR: stale safe + Next family + React/Zod minors; defer majors** (recommended)
2. Stale-only strictly ≥1w (skip Next 16.3.7 until aged)
3. All majors in same PR (reject for blast radius)

## Design tree (frontier)

### Settled

- Scope = **my-apps** npm/pnpm only
- Has UI / Has API / Has DB = **no**
- Do **not** follow `next-auth` npm latest v4

### Open frontier

1. Include **fresh** Next 16.3.7 family this run? (recommend **yes**)
2. Defer **graphql 17 / graphql-scalars 2 / dotenv 18 / pnpm 12**? (recommend **yes defer**)
3. Bump **React 19.3** + matching `@types/*` with Zod 4.6? (recommend **yes**)

### Blocked

- None for Design after Grill auto-settle

## Enough to design?

**yes** — after Grill settles the three frontier items. Node/pnpm CLI missing on host PATH; Build must use an environment that can run `pnpm` (or install Node first).
