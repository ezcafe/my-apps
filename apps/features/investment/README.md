# Investment workspace app

`WorkspaceAppKey`: `"investment"`.

- UI: `app/(shell)/investment/**`
- GraphQL: `POST /api/graphql/investment`
- REST activities: `/api/investment/activities` (Bearer `inv_…` token with `appKey: investment`)
- Cron quotes: `POST /api/cron/investment-quotes` with `Authorization: Bearer $CRON_SECRET`
- Cookie: `ctx_workspace_investment`

Market data uses unofficial Yahoo Finance via `yahoo-finance2` (`lib/investment-yahoo.ts`). Do not redistribute quote data.

Domain tables: `investment_instrument`, `investment_activity`, `investment_quote`, `investment_quote_daily`.
