# Lens: API

**Result:** clean  
**Updated:** 2026-10-27T20:10:00+07:00  
**Round:** 1

## Checklist

| Item | Verdict |
|------|---------|
| Design contract match (`includeTotal` default true; skip → `total: null`; `hasMore: Boolean!`) | Pass — Zod + typeDefs + docs/money.graphql + help catalog |
| Additive / non-silent break | Pass — `total` Int!→Int is intentional soften; default `includeTotal: true` keeps exact totals for old callers |
| Ban sentinel `-1` | Pass — policy returns `null` only; units assert ≠ -1 |
| List pagination + continuation | Pass — pageSize+1 probe on skip-total; exact path uses COUNT + `page*pageSize < total` |
| Validate at edge | Pass — `transactionListQuerySchema` in `listMoneyTransactions`; GraphQL resolves via same service |
| Query key / SSR input carry `includeTotal` | Pass — `moneyTransactionsListQueryInput` + RQ key; seed uses ledger helper |
| Auth / workspace boundary | Pass — resolver `requireMoneyWorkspace`; no new cookie/auth surface |
| Error shape / internals leak | Pass — existing `mapServiceError`; no new error variants |
| Docs / help | Pass — `api-help-content` documents default COUNT, skip-total, `hasMore` |
| Client selection set | Pass — `MONEY_TRANSACTIONS_QUERY` selects `total` + `hasMore` |

## Findings

None Critical/Major.

**Optional:** `prefetchMoneyLedger` options type only lists `includeSummary`; `includeTotal` still flows via seed default. Extend the type if a caller must override without reaching `seedMoneyLedgerPage` directly.
