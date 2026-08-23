# Investment workspace app

`WorkspaceAppKey`: `"investment"`.

- UI: `app/(shell)/investment/**` and Money `/money/investments/**`
- GraphQL: `POST /api/graphql/investment` (also under Money GraphQL)
- REST activities: `/api/investment/activities` (Bearer `inv_…` token with `appKey: investment`) — opens a buy/sell journal row
- Cron quotes: `POST /api/cron/investment-quotes` with `Authorization: Bearer $CRON_SECRET`
- Cookie: `ctx_workspace_investment`

Market data uses unofficial Yahoo Finance via `yahoo-finance2` v4 (`lib/investment-yahoo.ts`) — quotes and daily historical closes. Do not redistribute quote data.

Domain tables: `investment_instrument` (`kind` stocks/fx/coins/commodities, `symbol` as identity with `name` kept in sync, `contract_size`, ledger defaults), `investment_trade_journal` (open/closed trades), `money_transaction` + `money_transaction_investment` (closed P&L and deposit/withdraw cash), `investment_quote`, `investment_quote_daily`.

**Journal vs cash:** The default **Trade** mode on `/money/investments/new` (and **Trade** on `/money/new`) writes a closed `investment_trade_journal` row plus a money transaction for net P&L (`lots × instrument.contract_size × price diff − fees`). **Open** writes `investment_trade_journal` only (`status=open`) using the selected symbol’s Money account. **Close** on `/money/investments/new` posts P&L for an existing open row. Instruments live at `/money/investments/instruments` (create at `/money/investments/instruments/new`). **Deposit / Withdraw** on `/money/new` are ordinary Money income/expense transactions (amount, account, category) — no symbol, fee, or journal row.

Holdings use **open journal lots**. The **Value over time** chart is realized P&L plus mark-to-market on still-open lots, using Yahoo daily closes (backfilled into `investment_quote_daily` when the range is empty). Legacy `money_transaction_investment` lots are not used for holdings. No auto-migration.

Holdings notional = `|openLots| × contractSize × priceMinor`.
