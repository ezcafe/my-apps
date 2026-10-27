# Skim

**Result:** done

## Findings

### Surface 1 — Investments overview ledger (`/investments`)

- **Route:** `app/(shell)/investments/page.tsx` — parallel SSR: `prefetchMoneyLedger(…, MONEY_LEDGER_INVESTMENT, { includeSummary: true })` + `prefetchInvestmentOverview` → `seedInvestmentOverview`.
- **Client:** `InvestmentOverviewPage` loads ATF (`investmentInsightsAtfQueryOptions`), holdings, open activities **above** the ledger; then embeds `MoneyTransactionsPage` with `preset={MONEY_LEDGER_INVESTMENT}`, `variant="section"`, `showSummaryStats` (section forces `showStats=false` — strip unused in UI; SSR still seeds summary).
- **Ledger table:** section → `deferFetchUntilVisible={true}` on `AnalyticsTransactionsTable` (`components/money-transactions-page.tsx`). Standalone variant uses `moneyLedgerListIncludeTotal()` → **false** on client (sibling skip-COUNT path).
- **Shared money list stack:** same `listMoneyTransactions` / GraphQL `moneyTransactions` / RQ keys as sibling `20261027-transactions-perf`. Sibling locks: `includeTotal` + `hasMore` (pageSize+1), ban `total: -1`, SSR omit `includeSummary` on `/money` via `moneyLedgerSsrIncludeSummary()`. **Investments still hard-codes `includeSummary: true`.**
- **Guess vs `/money`:** investments SSR still pays summary + overview seed while section defer may delay below-fold list paint even with dehydrated cache. **Unmeasured.**

### Surface 2 — Loan detail installments

- **Detail:** `getLoanDetail` (`lib/loans-services/loans.ts`) always `loadInstallmentStates(loanId)` — full schedule join; builds `computeLoanSummary`, `buildProgressChartSeries`, next-pending, then embeds **all** rows on `loan.installments`.
- **UI:** `LoanInstallmentsTable` client-filters `all` / `upcoming` (= `pending`) / `paid` over the embedded array — no windowing; caption uses full-array paid/overdue counts.
- **Existing pager API:** `listLoansInstallments` (`lib/loans-services/installments-list.ts`) — workspace-scoped; optional `loanId` / `from` / `to` / `status` (`pending`|`paid`|`skipped`); **limit+1 → `nextCursor`**; order by installment id asc. GraphQL already wired (`lib/graphql/loans-resolvers.ts`).
- **Filter map guess:** UI `upcoming` → API `status=pending`; `paid` → `paid`; `all` → omit status. Caption totals / chart / summary still need slim detail path (not full embed for table alone).
- **Note:** `listLoans` (list page) also loads full installment states per loan for summary — **out of v1 scope** unless measure ties detail pain to list; Gate A scoped loan **detail** table.

### Sibling contract reference (read-only)

- Workflow `20261027-transactions-perf` `03-design`: measure-first + fixture; `includeTotal` / `hasMore`; SSR summary defer; workspace-scoped cache. Do **not** edit that workflow.

### Constraints / verify bar (guess → Design)

- Workspace RLS / auth on Money + Loans GraphQL; no cookie model change.
- Bigint minors; no `SUM(…)::int`.
- Skeleton parity for pager / table chrome (`docs/DESIGN_GUIDE.md`).
- Tests: unit for investment SSR summary flag + installment list paging/filter map; e2e when UI paging lands.
- Measure-first: investments — SSR ledger vs summary vs overview seed vs deferred client list; loans — `loadInstallmentStates` / detail payload vs `listLoansInstallments` page-1 + table paint.
