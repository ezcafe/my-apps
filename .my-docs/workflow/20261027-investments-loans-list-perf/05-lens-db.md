# Lens: DB

**Result:** clean  
**Updated:** 2026-10-27T20:56:00+07:00  
**Round:** 1

## Checklist

| Item | Verdict |
|------|---------|
| Schema migration | Pass — none (Design v1); `paid_without_transaction` already on `loan_installment_status` |
| Write owner (fixture) | Pass — `lib/investments-loans-perf-fixture.ts` / measure script only; fake owner sub; idempotent cleanup by workspaceId or ownerSub |
| Fixture visibility | Pass — investment rows in current-month + `accountTypes: investment` lock; loan schedule paired with status; page-1 hasMore (120 > limit 50) |
| List order / keyset SQL | Pass — `ORDER BY installment_number ASC, id ASC`; keyset `(number >) OR (number = AND id >)`; uses existing `(loan_id, installment_number)` unique/index |
| Bounded lists | Pass — `LIMIT limit+1` then trim; default/limit via Zod schema |
| Workspace filter on reads | Pass — `eq(loan.workspaceId, workspaceId)` on list; detail scoped via workspace ctx |
| Safe binds / no `SUM()::int` | Pass — Drizzle `eq`/`gt`/`and`/`or`/`inArray` on fixture; no money `SUM`→`::int` on this path |
| Indexes | Pass — no new DDL; measure did not show EXPLAIN miss requiring invent |
| N+1 | Pass — single list query with joins; detail still one `loadInstallmentStates` (server-only, Design v1) |
| Multi-step writes | N/A — read-path + fixture seed only for v1 |

## Findings

None Critical/Major.

**FYI:** Server `getLoanDetail` still loads full installment states for summary/chart/aggregates before returning empty `installments` — intentional v1; Task 6 only if re-measure ranks demand precomputed aggregates.
