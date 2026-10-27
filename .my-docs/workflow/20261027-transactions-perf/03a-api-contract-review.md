# API contract review

**Result:** clean

**Round:** 2 (re-review after design-update settle-gen:0)  
**Updated:** 2026-10-27  
**Skills:** api-and-interface-design (+ repo GraphQL / list patterns)

## FIRST (gates)

| Check | Status |
|-------|--------|
| Design present (`03-design.md` Result done) | ok |
| Grill closed (`02b-grill.md` frontier-empty) | ok |
| Notes `design-stale` | absent |
| design-update unpaid | no (Run-log paid settle-gen:0; Design post Fix asks) |

## Scope reviewed

- Updated `03-design.md` API contracts / Concept 2 / Locked picks vs Round 1 Majors.
- Surfaces: GraphQL `MoneyTransactionConnection`, `listMoneyTransactions`, `transactionListQuerySchema` / `JSONObject` query, `moneyTransactionsListQueryInput`, `moneyTransactionsQueryOptions` (+ RQ key), SSR seed dehydrate, ledger pager + analytics/drilldown consumers.
- No new REST; read-only list flag; existing workspace GraphQL auth.

## Prior Majors (Round 1) — disposition

| # | Prior Major | Disposition |
|---|-------------|-------------|
| 1 | Lock one skipped-COUNT shape: flag default on; `total` null after `Int` soften **or** never sentinel; always `hasMore` from pageSize+1; ban `-1` | **Closed** — Design locks `includeTotal` default `true`; when `false` → skip COUNT, `total: null` after `Int!`→`Int`; `hasMore: Boolean!` from **pageSize+1** only; **ban `-1`**. Exact-total callers keep default. |
| 2 | Skip-total flag on query input + React Query key + SSR seed so ledger ≠ drilldown cache | **Closed** — Design requires `includeTotal` on Zod/`JSONObject`, `moneyTransactionsListQueryInput`, `moneyTransactionsQueryOptions` queryKey, and SSR seed/dehydrate; ledger may pass `false` only after measure; drilldown/analytics stay `true`. |

## Findings (Round 2)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | client typed I/O | GraphQL + cache keys are locked; Build still must mirror them on `MoneyTransactionsListResponse` (`total: number \| null`, `hasMore: boolean`), `listMoneyTransactions` return type, `MONEY_TRANSACTIONS_QUERY` selection of `hasMore`, and `docs/money.graphql` sync with `money-typeDefs`. | Treat as Build acceptance / Task checklist — not a Design contract gap. |
| Enhancement | docs | Help catalog still describes always-present `total`. | Update `lib/api-help-content.ts` when flag lands (already in Design Docs / help). |
| Nit | hasMore when `includeTotal: true` | Design allows Build to derive `hasMore` from `(page * pageSize) < total` **or** pageSize+1; skip-total path is locked to pageSize+1. | Fine for contract; unit-test the chosen default-path formula so “Page N of M” stays correct. |
| Nit | ssr summary | `includeSummary` off `/money` SSR remains caller-only. | No GraphQL break. |

**Critical:** none  
**Major:** none (both Round 1 Majors paid by design-update)  
**Auth / workspace:** pass — existing GraphQL workspace scope; no cookie/CORS change; no cross-workspace lookup reuse.  
**Errors / idempotency:** N/A for read-only list flag; mutating paths out of v1.  
**Additive fields:** pass — `includeTotal` default preserves COUNT; `hasMore` additive; nullable `total` intentional soften with default-on path.  
**Repo patterns:** pass — extend `listMoneyTransactions` + GraphQL connection; no new REST.

## API checklist

| Item | Notes |
|------|-------|
| Typed I/O | pass in Design (GraphQL + Zod + RQ/SSR input); client TS/query document = Build mirror |
| Single error shape | pass (unchanged reads) |
| Validation at edges | pass — extend `transactionListQuerySchema` |
| List pagination | pass — `hasMore` locked for skip-total; exact total default for pager “of M” |
| Additive fields | pass — flag default true; `hasMore` additive; null total only when flag false |
| Naming | pass — `includeTotal` / `hasMore` locked |
| Idempotency | n/a (GET/list) |
| Matches repo | pass |

## Fix ask for my-dev-flow-design

None — Result **clean**.

## Proposed Has (parent applies)

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)
