# Workspace app

Next.js workspace with a shared **shell** and a **Money** finance module (transactions, investments, loans, savings). Auth is Pocket ID (OIDC); data is PostgreSQL via Drizzle.

This README is the runbook: **local development** and **production on a server**. Product and UI docs live under [`docs/`](docs/).

## Requirements

- **Local app:** Node.js `^22.22.2 || ^24.15.0 || >=26` and **pnpm 10+** (Corepack or `npm install -g pnpm@10.5.2`)
- **Database / production stack:** Docker Engine with the Compose plugin
- A [Pocket ID](https://pocket-id.org/docs/guides/oidc-client-authentication) OIDC client (needed to sign in)

Copy [`.env.example`](.env.example) to **`.env`** for both paths. Compose interpolates that file; Next.js loads it too. Never commit real secrets.

---

## Run locally

The app runs on your machine. Docker only starts PostgreSQL.

### 1. Environment

```bash
cp .env.example .env
```

Set at least:

| Variable | Local value |
|----------|-------------|
| `DATABASE_URL` | `postgresql://money:money@localhost:5432/money` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `AUTH_POCKET_ID_ISSUER` | Your Pocket ID base URL |
| `AUTH_POCKET_ID_ID` / `AUTH_POCKET_ID_SECRET` | OIDC client id and secret |

In Pocket ID, add redirect URI `http://localhost:3000/api/auth/callback/pocket-id`.

`CRON_SECRET` is optional locally. Recurrence `POST`s are accepted without a secret when it is unset.

### 2. Database

```bash
pnpm run docker:db
# same as: docker compose -f docker-compose-db.yml up -d
```

This starts Postgres on `localhost:5432` (user/password/database `money`) and keeps data in the `money_pg_data` volume.

Stop it with `pnpm run docker:db:down`. Add `-v` to the Compose `down` command if you also want to wipe the volume.

Do not run this file and the production Compose file at the same time — both bind port `5432` and share the same volume name.

### 3. Install, schema, dev server

```bash
pnpm install
pnpm run db:push
pnpm run dev
# or: pnpm run dev:turbo
```

pnpm only allows native build scripts for packages listed in `pnpm.onlyBuiltDependencies` in `package.json`.

Open [http://localhost:3000](http://localhost:3000). Sign in at `/login`.

Useful while developing:

```bash
pnpm run db:studio          # browse the local DB
pnpm run db:migrate         # apply checked-in migrations instead of db:push
pnpm run db:reset           # wipe local schema (destructive)
```

If `db:migrate` fails because the schema already exists (typical after `db:push`) but `drizzle.__drizzle_migrations` is empty:

```bash
ALLOW_BASELINE_DRIZZLE=1 pnpm run db:baseline -- --through 0023_money_tx_exclude_from_reports
pnpm run db:migrate
```

### Recurrence (optional)

Create a template under **Money → Settings → Recurrence**, then:

```bash
curl -sS -X POST http://localhost:3000/api/cron/money-recurrence
```

The create form offers **Every 5 minutes (dev)** only when `NODE_ENV=development`.

---

## Run on a production server

Use the default [`docker-compose.yml`](docker-compose.yml): Postgres, PgBouncer, a one-shot migrator, and the Next.js production image. The app does not need Node installed on the host.

### 1. Server prerequisites

- Docker Engine + Compose plugin
- Git
- A public hostname (reverse proxy or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)) pointing at host port `3000`

Clone the repo onto the server and work from the project root.

### 2. Environment

```bash
cp .env.example .env
```

Generate secrets, then edit `.env`:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # CRON_SECRET (if you will schedule recurrence)
```

| Variable | Production |
|----------|------------|
| `AUTH_SECRET` | Required. Compose will not start the app without it. |
| `AUTH_POCKET_ID_ISSUER` / `AUTH_POCKET_ID_ID` / `AUTH_POCKET_ID_SECRET` | Required. Compose will not start the app without them. |
| `AUTH_URL` and `NEXT_PUBLIC_APP_URL` | Public **HTTPS** origin, e.g. `https://app.example.com`. Do not leave `http://localhost:3000` behind a tunnel or OIDC redirects break. |
| `CRON_SECRET` | Required in production for `POST /api/cron/money-recurrence` (route returns `401` if unset). |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Override the Compose defaults (`money` / `money` / `money`) on a real server. |
| `DATABASE_URL` | Host-oriented URL is fine in `.env`. Compose **overrides** it inside `app` and `migrate` to `…@pgbouncer:5432/…`. |

In Pocket ID, add redirect URI `https://your-app.example/api/auth/callback/pocket-id` (same origin as `AUTH_URL`).

### 3. Start the stack

```bash
docker compose --env-file .env up --build -d
# foreground equivalent: pnpm run docker:up
```

What starts:

1. `db` on host `5432`
2. `pgbouncer` on host `6432` (transaction pooling)
3. `migrate` — applies checked-in Drizzle migrations, then exits
4. `app` on host `3000` — only after migrate succeeds

Check it:

```bash
docker compose --env-file .env ps
docker compose --env-file .env logs -f app
```

Host tools can use `localhost:5432` (Postgres) or `localhost:6432` (PgBouncer). The app container talks to PgBouncer, not `localhost`.

Stop:

```bash
pnpm run docker:down
# or: docker compose --env-file .env down
```

### 4. Updates

```bash
git pull
docker compose --env-file .env up --build -d
```

The migrator runs again on each `up`. Do not use `db:push` against production.

### 5. Recurring transactions

Money posts due recurrence templates via `POST /api/cron/money-recurrence`. Each run creates **at most one transaction per template** and advances the schedule (missed slots are skipped, not backfilled).

Verify:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.example/api/cron/money-recurrence
```

Expected body: `{ "processed": n, "generated": n, "errors": [] }`.

Schedule from the **host** (the app image has no cron). Daily at 00:05 server time:

```cron
CRON_SECRET=your-generated-secret
APP_URL=https://your-app.example

5 0 * * * curl -sS -f -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/money-recurrence" >> /var/log/money-recurrence-cron.log 2>&1
```

If the hostname is only reachable on the server itself, use `http://127.0.0.1:3000` as `APP_URL`. Keep `CRON_SECRET` in a root-only env file if you do not want it in crontab.

| Symptom | Likely cause |
|---------|----------------|
| `401 Unauthorized` | Wrong or missing `CRON_SECRET` on the app or the curl |
| `503 db_unavailable` | Postgres / PgBouncer not reachable |
| `"generated": 0` | No active template with `nextRunAt <= now` |

---

## Commands

| Command | When |
|---------|------|
| `pnpm run docker:db` / `docker:db:down` | Local Postgres only |
| `pnpm run docker:up` / `docker:down` | Full production-style stack |
| `pnpm run dev` / `dev:turbo` | Local Next.js (webpack / Turbopack) |
| `pnpm run build` / `pnpm start` | Production Node on the host (you still need Postgres) |
| `pnpm run lint` / `typecheck` / `test` | Checks |
| `pnpm run db:generate` | Create a Drizzle migration |
| `pnpm run db:push` | Push schema in **dev** (no migration file) |
| `pnpm run db:migrate` | Apply migrations |

Prefer Compose on a server. `pnpm run build && pnpm start` is only useful if you already run PostgreSQL yourself.

---

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — shell vs feature layers, Money bootstrap
- [`docs/ADDING_A_FEATURE.md`](docs/ADDING_A_FEATURE.md) — shipping a new product area
- [`docs/DESIGN_GUIDE.md`](docs/DESIGN_GUIDE.md) — UI tokens and primitives (mandatory for UI work)
- [`docs/API.md`](docs/API.md) / [`docs/openapi.yaml`](docs/openapi.yaml) — personal Bearer tokens (`mny_…`); create them under **Settings → API tokens**
- [`features/money/README.md`](features/money/README.md) — Money server/client conventions

Shell nav is [`lib/features/registry.ts`](lib/features/registry.ts), not `app-shell.tsx`.
