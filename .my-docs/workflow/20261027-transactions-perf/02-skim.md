# Skim

**Result:** done

## Findings

### Primary surface (list / load)
- **Route:** `/money` (`app/(shell)/money/(tabs)/page.tsx`) — `MoneyTransactionsPage` + Spending preset + `showSummaryStats`.
- **Alias:** `/money/transactions` redirects to `/money`.
- **Related ledgers:** bills / savings / spending tabs reuse the same page component + SSR prefetch pattern; treat as same list cost class.
- **SSR:** `prefetchMoneyLedger` → `seedMoneyLedgerPage` (`lib/money-ssr-seed.ts`):
  1. `seedMoneyBootstrap` (workspace + `fetchMoneyLookups` with **90d usage LEFT JOINs** on accounts/categories — `lib/money-workspace-bootstrap-data.ts`).
  2. `listMoneyTransactions` page 1 (pageSize **20**, sort `occurredAt` desc) into React Query cache.
  3. When `includeSummary: true` (home `/money`): also `computeMoneyAnalyticsSummary` on the same first-load filter — **extra SSR work on the pain surface**.
- **Client gate before useful filters/table:** page waits on bootstrap + `moneyAnalyticsChartLookups` (`moneyAccounts` / `moneyCategories` / `moneyTags` GraphQL) before preset filter seed; table is `dynamic()`-imported.
- **Table:** `AnalyticsTransactionsTable` with `deferFetchUntilVisible={false}` on full page (`variant` page) so list query runs on mount; uses `total` for page count (`Math.ceil(total / pageSize)`).

### List API (shared)
- **Service:** `listMoneyTransactions` (`lib/money-services/transactions.ts`).
- **Always:** `COUNT(*)` + page `SELECT` in parallel; then tag-links query for page ids.
- **Pagination:** offset unless `cursor` + `sort=occurredAt` (keyset). Default SSR/client first page = offset page 1 (keyset only when cursor present).
- **Filters:** `resolveAnalyticsFiltersForQuery` + `moneyTransactionConditionsForAnalytics` (category expansion, account-type / tag CTE possible).
- **Indexes present:** `money_tx_workspace_occurred_idx`, `money_transaction_workspace_occurred_id_idx` (`db/schema/money.ts`). **Guess:** default-sort miss is less likely than COUNT + filter width + bootstrap/summary joins — **unmeasured**.

### GraphQL
- Field `moneyTransactions` → same `listMoneyTransactions` (`lib/graphql/money-resolvers.ts`).
- Client list options: `moneyTransactionsQueryOptions` / `moneyTransactionsListQueryInput` (`lib/money-query-options.ts`).

### Secondary (shared cost — deprioritize unless measure ties to list)
- **Form lookups:** usage-join lists + `moneyFormBudgetStatus` on add/edit open (not list paint).
- **Post-mutation:** `invalidateMoneyWorkspaceQueries` invalidates all active `["money"]` (+ investment) — hurts save feel; can also refetch a visible list after edits.
- **Bootstrap usage joins:** paid on every ledger SSR + layout bootstrap path — **shared with list TTFB**.

### Constraints / verify bar (guess → Design)
- Workspace RLS / auth already on Money GraphQL; no cookie model change.
- Bigint amounts; no `SUM(…)::int`.
- Skeleton parity for any UI change (`docs/DESIGN_GUIDE.md`).
- Tests: unit for list/count policy + cache keys; e2e for `/money` first paint / rows when UI changes.
- Measure-first: server span around COUNT vs rows vs tags vs bootstrap vs summary; browser waterfall for SSR HTML + hydrated list query.
