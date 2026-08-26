# Investments (Money workspace)

Top-level UI at `/investments`. **Not** a separate `WorkspaceAppKey` — [`lib/workspace-investment.ts`](../../lib/workspace-investment.ts) uses the Money workspace cookie.

- UI: `app/(shell)/investments/**` (`/investments` ledger, `/investments/insights`, `/investments/new`, `/investments/instruments`)
- GraphQL: `POST /api/graphql/investment` (also under Money GraphQL)
- REST activities: `/api/investment/activities` (Bearer `inv_…` token with `appKey: investment`) — opens a buy/sell journal row
- Cron quotes: `POST /api/cron/investment-quotes` with `Authorization: Bearer $CRON_SECRET`
- Cookie: same as Money (`workspaceCookieName("money")`)

Market data uses unofficial Yahoo Finance via `yahoo-finance2` v4 (`lib/investment-yahoo.ts`) — quotes and daily historical closes. Do not redistribute quote data.

Domain tables: `investment_instrument` (`kind` stocks/fx/coins/commodities, `symbol` as identity with `name` kept in sync, `contract_size`, ledger defaults), `investment_trade_journal` (open/closed trades), `money_transaction` + `money_transaction_investment` (closed P&L and deposit/withdraw cash), `investment_quote`, `investment_quote_daily`.

**Journal vs cash:** The default **Trade** mode on `/investments/new` (and **Trade** on `/money/new`) writes a closed `investment_trade_journal` row plus a money transaction for net P&L (`lots × instrument.contract_size × price diff − fees`). **Open** writes `investment_trade_journal` only (`status=open`) using the selected symbol’s Money account. **Close** on `/investments/new` posts P&L for an existing open row. Instruments live at `/investments/instruments` (create at `/investments/instruments/new`). **Deposit / Withdraw** on `/money/new` are ordinary Money income/expense transactions (amount, account, category) — no symbol, fee, or journal row.

Holdings use **open journal lots**. Insights **Results over time** is realized P&L plus mark-to-market on still-open lots, using Yahoo daily closes (backfilled into `investment_quote_daily` when the range is empty). Do **not** label holdings notional as portfolio value. Legacy `money_transaction_investment` lots are not used for holdings. No auto-migration.

`/investments/insights` first paint: date-range filter bar (same chrome as Money Insights, dates only) + KPIs (results, open notional, realized P&L, open lots) + results-over-time + allocation by kind. **More insights** loads realized vs unrealized, P&L by symbol, drawdown, hit rate, and holdings/open tables. GraphQL: `investmentInsightsAtf` / `investmentInsightsMore`.

Holdings notional = `|openLots| × contractSize × priceMinor`.
