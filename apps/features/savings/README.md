# Savings workspace app

`WorkspaceAppKey`: `"savings"`.

- UI: `app/(shell)/savings/**`
- GraphQL: `POST /api/graphql/savings`
- REST activities: `/api/savings/activities` (Bearer `sav_…` token with `appKey: savings`)
- Cookie: `ctx_workspace_savings`

Domain tables: `savings_account`, `savings_activity` (`db/schema/savings.ts`).
