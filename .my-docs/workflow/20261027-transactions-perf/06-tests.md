# Tests / Smoke

**Updated:** 2026-10-27T20:08:00+07:00  
**Result:** success  
**Test path:** lite  
**Smoke source:** Build-verify

## Smoke (Build-writes companion)

Paid at Build verify-pass (`Smoke source: Build-verify`). Independent Smoke-Task not required for Mode full + profile lite.

## Suite / e2e (test-lite)

**Lite path:** targeted money ledger unit suite + ledger first-load e2e.

| Step | Command | Result |
|------|---------|--------|
| unit (ledger / total / pager) | `pnpm exec tsx --import dotenv/config --import ./scripts/test-env.mjs --test lib/money-ledger-perf-spans.test.ts lib/money-ledger-perf-fixture.test.ts lib/money-list-total-policy.test.ts lib/money-transactions-include-total.test.ts lib/money-list-pager.test.ts lib/money-ledger-list-options.test.ts` | pass — 27/27 |
| typecheck | `pnpm typecheck` | pass |
| e2e (ledger first load) | `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm exec playwright test e2e/money.spec.ts -g "ledger first load shows transactions without waiting on summary"` | pass — 1/1 |

**Covered e2e case**

- `/money` ledger first load: Spending heading + list chrome ready (table or empty) without waiting on summary KPI numbers (Grill Q1 structural bar).

**Round notes**

- FIRST: Has API/DB=yes|yes; Lens plan api\|db → not missing required; Lenses clean; Review clean (Adv+Quality+Merged).
- Lite clear met → **Result: success** + Test path `lite`.
- After signal: `candidate clear test-stale` (parent clears Notes + re-derives; Prefer gate-c is parent-only).

## Prior Build verify (attempt 2)

1. Same unit files → pass (Build reported 40; lite re-run 27 leaf tests)
2. `pnpm typecheck` → pass

## Measure

- Ranked table: `05-measure-notes.md`
- Gates: `05-task-gates.md` (Task 3+4 APPLY; Task 6 SKIP)
