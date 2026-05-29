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
2. Create a token (bound to one Money workspace). Copy the secret once (`mny_…`).
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

Each token is tied to a single `workspace_id` at creation. You do not need the `ctx_workspace_money` cookie when using Bearer auth.

## GraphQL

- **Endpoint:** `POST /api/graphql` (also supports `GET` for GraphQL Yoga)
- **Content-Type:** `application/json`

Example:

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

## REST

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/workspace/list?app=money` | Session or Bearer | List workspaces (session typical) |
| `POST` | `/api/money/import/preview` | Bearer + write | Multipart CSV preview |
| `POST` | `/api/money/import/commit` | Bearer + write | Commit import |
| `POST` | `/api/money/import/abandon` | Bearer + write | Discard preview |
| `POST` | `/api/money/import/{kind}` | Bearer + write | Direct CSV row import |
| `POST` | `/api/cron/money-recurrence` | `Bearer $CRON_SECRET` | Process due recurrence templates (scheduled job) |
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
