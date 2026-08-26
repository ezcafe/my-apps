# HTTP API for automation and Postman

In-app tutorial: sign in and open **Help** (`/help`). When the API surface changes, update this file and [`lib/api-help-content.ts`](../lib/api-help-content.ts) together.

The workspace app exposes **GraphQL** (primary) and **REST** endpoints. The web UI uses session cookies; external clients use **personal API tokens**.

## Base URL

Set `AUTH_URL` in `.env` (e.g. `http://localhost:3000` in development).

## Authentication

### Browser (web app)

Session cookie from Pocket ID / NextAuth after signing in at `/login`.

### Automation / Postman

1. Sign in to the app and open **Settings → API tokens**.
2. Create a token (bound to one workspace for Money, Savings, or Investment). Copy the secret once (`mny_…`, `sav_…`, or `inv_…`).
3. Send on every request:

```http
Authorization: Bearer mny_<secret>
```

Token management routes (`/api/tokens`) require a **session** only — you cannot create or revoke tokens with a Bearer token.

### Scopes

| Scope | Allows |
|-------|--------|
| `read` | GraphQL queries, read-only REST |
| `write` | GraphQL mutations, CSV import REST |

Tokens without `write` receive `403` on mutations and import routes.

### Workspace binding

Each token is tied to a single `workspace_id` and `appKey` at creation. You do not need per-app workspace cookies when using Bearer auth.

## GraphQL

| App | Endpoint |
|-----|----------|
| Money | `POST /api/graphql` (aliases: `/savings`, `/investment`, `/loans`) |

**POST only.** Cookie/session requests require a matching `Origin` (CSRF). Bearer API tokens skip Origin checks. Auth is resolved once per request (shared with rate limiting).

**Content-Type:** `application/json`

Guards: max depth 10, max tokens 1000, max aliases 15; introspection disabled in production.

Money example:

```bash
curl -sS "$AUTH_URL/api/graphql" \
  -H "Authorization: Bearer mny_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { moneyAccounts { id name } }"}'
```

Export the schema for Postman:

```bash
npm run api:export-schema
# → docs/money.graphql
```

In Postman: **New → GraphQL**, import `docs/money.graphql`, set Authorization → Bearer Token.

### Database roles (production)

Migrations create `money_app` (no `BYPASSRLS`) and `money_cron` (`BYPASSRLS`). Point `DATABASE_URL` at `money_app` in production so RLS is real defense-in-depth. Cron routes use `SET LOCAL ROLE money_cron` for cross-tenant scans. Local Compose may still use the owner role through PgBouncer.

## REST

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/workspace/list?app=money` | Session or Bearer | List workspaces (session typical) |
| `POST` | `/api/money/import/preview` | Bearer + write | Multipart CSV preview |
| `POST` | `/api/money/import/commit` | Bearer + write | Commit import |
| `POST` | `/api/money/import/abandon` | Bearer + write | Discard preview |
| `POST` | `/api/money/import/{kind}` | Bearer + write | Direct CSV row import |
| `POST` | `/api/cron/money-recurrence` | `Bearer $CRON_SECRET` (required all envs) | Process due recurrence templates |
| `POST` | `/api/cron/loan-reminders` | `Bearer $CRON_SECRET` (required all envs) | Due loan push reminders |
| `GET` | `/api/savings/activities` | Bearer `sav_` + read | List savings activities |
| `POST` | `/api/savings/activities` | Bearer `sav_` + write | Create savings activity |
| `GET/PATCH/DELETE` | `/api/savings/activities/{id}` | Bearer `sav_` | Read/update/delete activity |
| `GET` | `/api/investment/activities` | Bearer `inv_` + read | List investment activities (session: same-origin) |
| `POST` | `/api/investment/activities` | Bearer `inv_` + write | Create investment activity (session: same-origin) |
| `GET/PATCH/DELETE` | `/api/investment/activities/{id}` | Bearer `inv_` | Read/update/delete (session: same-origin) |
| `POST` | `/api/cron/investment-quotes` | `Bearer $CRON_SECRET` (required all envs) | Refresh Yahoo quotes for all instruments |
| `GET` | `/api/tokens` | Session only | List your tokens |
| `POST` | `/api/tokens` | Session only | Create token |
| `DELETE` | `/api/tokens/{id}` | Session only | Revoke token |

OpenAPI description: [`docs/openapi.yaml`](openapi.yaml) — import into Postman via **Import → OpenAPI**.

## Error envelope

REST errors use JSON:

```json
{ "error": "Human message", "code": "unauthorized" }
```

Common codes: `unauthorized`, `forbidden`, `bad_request`, `not_found`, `db_unavailable`.

GraphQL errors use standard `errors[].message` with `extensions.code` (e.g. `UNAUTHORIZED`, `FORBIDDEN`).

## Security

- Use HTTPS in production; never commit tokens or put them in client-side code.
- Revoke compromised tokens in Settings immediately.
- Prefer read-only tokens when automation only needs to export data.
