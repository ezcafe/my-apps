# Tests / Smoke

**Updated:** 2026-10-27T21:05:00+07:00  
**Result:** success  
**Test path:** lite  
**Smoke source:** Build-verify

## Smoke (Build-writes companion)

Paid at Build verify-pass (`Smoke source: Build-verify`). Independent Smoke-Task not required for Mode full + profile lite.

## Suite / e2e (test-lite)

**Lite path:** targeted investments + loans list-perf unit suite + structural e2e.

| Step | Command | Result |
|------|---------|--------|
| unit (P1–P7 fixture/spans/ledger/loan) | `pnpm exec tsx --import dotenv/config --import ./scripts/test-env.mjs --test lib/investments-loans-perf-fixture.test.ts lib/loans-services/loan-detail-slim.test.ts lib/loans-detail-client-contract.test.ts lib/investments-ledger-list-options.test.ts lib/investments-loans-perf-spans.test.ts lib/loans-installment-filter-map.test.ts lib/loans-installment-cursor.test.ts lib/loans-services/installments-list-order.test.ts` | pass — 20/20 |
| typecheck | `pnpm typecheck` | pass |
| e2e (P8/P9) | `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm exec playwright test e2e/investments-loans-list-perf.spec.ts` | pass — 1 passed, 1 skipped |

**Covered e2e cases**

- P8 `/investments`: ledger table/empty ready without waiting on deferred summary KPIs — **pass**.
- P9 loan detail page-1 + Next — **skipped** (no loan UUID link in e2e workspace after excluding `/loans/new|insights|settings`). Unit P6/P7 still cover slim detail + keyset/filter.

**Harness note**

- E2E loan opener aligned with `e2e/loans.spec.ts` (skip create/insights/settings). Prior `a[href^="/loans/"]`.first() opened Create loan.

**Round notes**

- FIRST: Has API/DB=yes|yes; Lens plan api\|db → not missing required; Lenses clean; Review clean.
- Lite clear met → **Result: success** + Test path `lite`.
- After signal: `candidate clear test-stale` (parent clears Notes + re-derives; Prefer gate-c is parent-only).

## Prior Build verify

- Same unit files → 20/20 pass (`Smoke source: Build-verify` / Last Verify verify-pass).
- Measure notes: `05-measure-notes.md` (Task 3/4 APPLY; Task 6 SKIP).
