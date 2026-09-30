# Tasks: deps-uplift-latest

**Mode:** simple · **Has UI/API/DB:** no

## Task 1 — Edit package.json uplift set

**Done when:** Declared versions match Design uplift table; deferred packages untouched.

**Steps:**

1. Set `next`, `eslint-config-next`, `@next/bundle-analyzer`, `@next/swc-darwin-arm64` to `16.3.7` (exact where already exact).
2. Set `react` / `react-dom` to `19.3.0`; `@types/react` / `@types/react-dom` to `19.3.0`.
3. Bump ranges for zod, react-query, yoga packages, drizzle-*, eslint, @eslint/compat, rate-limiter-flexible, tsx, csv-parse, @types/node per Design.
4. Confirm `next-auth`, `graphql`, `graphql-scalars`, `dotenv`, `packageManager` unchanged.

**Tests (TDD):** N/A — version edit only.

## Task 2 — Refresh lockfile

**Done when:** `pnpm-lock.yaml` resolves to targets; install succeeds.

**Steps:**

1. Ensure Node 22+ and pnpm 10 available (host currently missing Node on PATH — install/use nvm or similar if needed).
2. Run `pnpm install` at repo root.
3. Spot-check lockfile entries for `next@16.3.7` and `react@19.3.0`.

**Tests (TDD):** N/A.

## Task 3 — Smoke verify + fix breakages

**Done when:** `pnpm typecheck` and `pnpm test` pass; only bump-caused fixes applied.

**Steps:**

1. `pnpm typecheck`
2. `pnpm test`
3. If failures from React types / Zod / eslint peers: minimal production fixes; re-run.
4. Optional: `pnpm lint` if cheap and previously green.

**Tests (TDD):**

- No new unit cases planned unless a concrete regression appears; then add a focused failing test before the fix (repo debug rule).
- E2E: N/A for this ops change unless smoke reveals UI-breaking API from a library (unlikely).

## Task 4 — Record deferrals

**Done when:** Workflow Notes list deferred majors for a follow-up run.

**Steps:** Note in `00-run.md`: graphql@17, graphql-scalars@2, dotenv@18, pnpm@12 deferred.

**Tests (TDD):** N/A.
