# Lens: DB

**Result:** clean  
**Updated:** 2026-10-27T20:10:00+07:00  
**Round:** 1

## Checklist

| Item | Verdict |
|------|---------|
| Schema migration | Pass — none (Design v1); GraphQL-only contract change |
| Write owner (fixture) | Pass — `lib/money-ledger-perf-fixture.ts` / measure script only; fake `createdBySub`; idempotent cleanup by owner sub |
| Fixture visibility | Pass — seed inside Spending first-load month window; checking account matches excludeAccountTypes lock |
| Skip-total SQL | Pass — `LIMIT pageSize+1` then trim; COUNT omitted when `includeTotal: false` |
| Bounded lists | Pass — pageSize max 100 (Zod); offset or keyset cursor |
| Workspace filter on reads | Pass — `moneyTransactionConditionsForAnalytics(workspaceId, …)` |
| Safe binds / no `SUM()::int` | Pass — list path uses Drizzle `count()` / `select` / `inArray` for tags; no money aggregate cast on this path |
| Indexes | Pass — no new index; measure did not show EXPLAIN miss requiring DDL |
| Tag links batch | Pass — single `inArray` after page rows (no N+1) |
| Multi-step writes | N/A — read-path + fixture seed only for v1 |

## Findings

None Critical/Major.

**FYI:** `runCount` still uses `whereClause` captured before keyset cursor conditions; `runRows` uses post-cursor `listWhere`. Pre-existing. Skip-total ledger path never calls COUNT. Exact-total + `cursor` callers still get filter-wide totals (not “remaining after cursor”).
