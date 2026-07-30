# Workspace app

Multi-feature Next.js workspace built around a small **shell** and a unified **Money** finance module (transactions, investments, loans, and savings-style accounts). Pocket ID OIDC handles auth; Drizzle + PostgreSQL 18 hold the data. The UI is a token-driven minimalist design system with Apple/iOS structure, GitHub-inspired light palette, Nord dark palette, and CSS-only motion.

> **All UI work must follow [`docs/DESIGN_GUIDE.md`](docs/DESIGN_GUIDE.md).** No hard-coded colors, fonts, radii, shadows, or motion libraries.

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 with `@theme inline` token bridge
- Drizzle ORM + PostgreSQL 18
- next-auth v5 (Pocket ID OIDC provider)
- visx for charts (Lightweight Charts allowed only for price charts)

## Getting started

```bash
cp .env.example .env
# fill in AUTH_SECRET, AUTH_POCKET_ID_*, AUTH_URL
# suggested: AUTH_SECRET=$(openssl rand -base64 32)

# bring up Postgres 18 for local dev (or point DATABASE_URL elsewhere)
docker compose -f docker-compose-db.yml up -d

# install + apply schema
npm install
npm run db:push

# dev (webpack)
npm run dev
# or Turbopack
npm run dev:turbo
```

Open <http://localhost:3000>.

## Docker (local development DB only)

Use `docker-compose-db.yml` when you only want the local PostgreSQL 18 database for development. The Next.js app still runs directly on your machine with `npm run dev` or `npm run dev:turbo`.

```bash
cp .env.example .env
# optionally override DATABASE_URL if you are not using the default local DB

docker compose -f docker-compose-db.yml up -d
```

What this file does:

- Starts `db` on port `5432`
- Persists data in the named Docker volume `money_pg_data`
- Exposes the default dev database at `postgresql://money:money@localhost:5432/money`

Docker-specific notes:

- Default container credentials are defined in `docker-compose-db.yml`: user `money`, password `money`, database `money`.
- For the app running on your machine, use `localhost` in `DATABASE_URL`, not `db`.
- Stop the database with `docker compose -f docker-compose-db.yml down`; add `-v` if you also want to remove the local volume.

## Docker (production-style)

Use the default `docker-compose.yml` when you want the Next.js app and PostgreSQL to run together as containers with a smaller runtime image.

```bash
cp .env.example .env
# set AUTH_SECRET at minimum (recommended: openssl rand -base64 32)
# fill AUTH_POCKET_ID_* when you want the real login flow to work

docker compose up --build
```

What Compose does:

- Starts `db` on port `5432`
- Starts `pgbouncer` on port `6432` (transaction pool mode)
- Runs a one-shot `migrate` service with checked-in Drizzle migrations
- Starts the production Next.js container on port `3000` only after migrations succeed

Docker-specific notes:

- The app/migration containers default to `DATABASE_URL=postgresql://…@pgbouncer:5432/…`.
- For direct SQL from host tools, continue using `localhost:5432` (Postgres) or `localhost:6432` (PgBouncer).
- The runtime image is built from Next.js standalone output, so it only copies the files needed to serve the app.
- The Docker build uses `next build --webpack` for production-image stability on Next.js 16, while local development can keep using Turbopack.
- If `AUTH_POCKET_ID_*` is unset, the app can still boot, but Pocket ID login will not work until those values are configured.
- Override `NEXT_PUBLIC_APP_URL` if the app is served from anything other than `http://localhost:3000`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` / `dev:turbo` | Start the dev server (kills any prior `next dev` first). |
| `npm run build` | Production build. |
| `npm run start` | Run the production build. |
| `npm run lint` | ESLint (must be clean). |
| `npm run db:generate` | Generate a Drizzle migration. |
| `npm run db:push` | Push schema to the dev DB without a migration. |
| `npm run db:migrate` | Apply pending migrations. |
| `npm run db:baseline` | Mark migrations through a tag as applied (see below). |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run db:reset` | Reset the local DB schema (destructive). |
| `npm run db:recompute-balances` | Recompute Money account balances. |

If `db:migrate` fails on a database that already has schema but an empty `drizzle.__drizzle_migrations` table (common after `db:push`), baseline the last migration that matches your DB, then migrate again:

```bash
ALLOW_BASELINE_DRIZZLE=1 npm run db:baseline -- --through 0023_money_tx_exclude_from_reports
npm run db:migrate
```

Use `db:reset` instead when you can wipe local data and replay all migrations from scratch.

## Project layout

```
app/
  (shell)/             Authenticated chrome (rail + header). Routes here inherit ShellLayout.
    money/             Money feature pages — own layout + provider tree.
    settings/          Global settings: appearance, date format, API tokens.
  api/                 Thin Next.js route entrypoints; logic lives in features/<x>/server or lib/.
  globals.css          Light/dark token sets + microinteraction utilities.
  layout.tsx           Root layout, fonts, FOUC pre-paint script.
  page.tsx             Public landing.
components/
  ui/                  Token-driven primitives (Button, Card, Field/Input/Select/Textarea,
                       Modal, Popover, Tabs, MultiSelect, Tag, Badge, Skeleton, Alert).
  app-shell.tsx        Desktop rail + mobile header (registry-driven nav).
  notification-provider.tsx  Toasts.
  theme-provider.tsx   Appearance provider; persists to localStorage.
  theme-settings.tsx   Light/dark/system segmented control.
  money-*              Money-specific surfaces (dashboard, edit form, settings panels…).
features/
  money/               Domain server code, barrel re-exports, feature README.
lib/
  features/registry.ts Single source of truth for shell nav.
  theme-chart-palette.ts  Chart palettes; chart components read via colorByIndex.
  microinteractions.ts withViewTransition + prefersReducedMotion helpers.
db/                    Drizzle schema and migrations.
docs/                  Architecture, design guide, feature checklist.
```

## Design system (mandatory)

- Fixed Apple/iOS structure with two color palettes:
  - `style` → `<html data-style="apple">` (always).
  - `mode` → `<html class="dark">` toggled for Nord dark; otherwise GitHub-inspired light.
- **2 token sets** declared in [`app/globals.css`](app/globals.css). Components never branch on `style`.
- Compose UI from [`components/ui/`](components/ui/) primitives. They already consume tokens (`rounded-[var(--radius-md)]`, `shadow-[var(--shadow-sm)]`, `bg-surface`, etc.).
- Microinteractions are CSS-only (`fx-press`, `fx-fade-in`, `fx-shimmer`, `fx-field` + `fx-field-underline`). For state-driven transitions, use [`withViewTransition`](lib/microinteractions.ts).
- Charts: visx + `colorByIndex(resolved, i, style)` from [`lib/theme-chart-palette.ts`](lib/theme-chart-palette.ts). Never hand-pick chart colors.
- Layout: `shell-main` wrapper + `repeat(auto-fit, minmax(min(100%, …), 1fr))` and container queries. No hard-coded breakpoints for content.
- Status colors: `--accent` for positive, `--destructive` for negative, `--muted` for flat. No `text-emerald-*` / `text-rose-*`.
- Verify every change in light and dark modes via `/settings` before merging.

Forbidden: `rounded-md`/`rounded-lg`/`rounded-xl`/`rounded-2xl`, `shadow-sm`/`shadow-md`/`shadow-lg`, hand-picked hex colors or font families, JS animation libraries (Framer Motion / Motion One / GSAP), manual portals for dialogs (use `Modal`).

Full rules + primitive table + microinteraction utilities: [`docs/DESIGN_GUIDE.md`](docs/DESIGN_GUIDE.md).

## Architecture & adding features

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — shell vs feature layers, workspace cookies, where Money bootstrap runs.
- [`docs/ADDING_A_FEATURE.md`](docs/ADDING_A_FEATURE.md) — checklist for shipping a new product area (Tasks, Notes, …).
- [`features/money/README.md`](features/money/README.md) — Money-specific server / client conventions and the thin-route pattern.

Shell navigation is registry-driven: edit [`lib/features/registry.ts`](lib/features/registry.ts), not `app-shell.tsx`.

## Auth

next-auth v5 with the Pocket ID OIDC provider. Configure `AUTH_POCKET_ID_*` and redirect URIs per the [Pocket ID OIDC docs](https://pocket-id.org/docs/guides/oidc-client-authentication). The login page is at `/login`.

## External API (Postman / automation)

Personal Bearer tokens (`mny_…`) for GraphQL and REST without a browser session. Create tokens under **Settings → API tokens**. See [`docs/API.md`](docs/API.md), [`docs/openapi.yaml`](docs/openapi.yaml), and `npm run api:export-schema` for Postman.

## Recurring transactions (cron)

Money can auto-post due recurrence templates via a scheduled HTTP job. Each run creates **at most one transaction per template**, then advances the schedule to the next future slot (missed slots are fast-forwarded without posting extra rows).

**Endpoint:** `POST /api/cron/money-recurrence`

**Response:**

```json
{ "processed": 1, "generated": 1, "errors": [] }
```

| Field | Meaning |
|-------|---------|
| `processed` | Templates checked this run |
| `generated` | Transactions created |
| `errors` | Per-template failures (empty when all succeed) |

### 1. Generate a secret

Add `CRON_SECRET` to your environment (see [`.env.example`](.env.example)):

```bash
openssl rand -base64 32
```

```bash
# .env or production env
CRON_SECRET=your-generated-secret
```

In **production**, the route returns `401` if `CRON_SECRET` is unset. In **local dev**, the route accepts unauthenticated requests when `CRON_SECRET` is empty so you can test with plain `curl`.

### 2. Verify manually

Replace the URL and secret for your deployment:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.example/api/cron/money-recurrence
```

Local dev (no secret required):

```bash
curl -sS -X POST http://localhost:3000/api/cron/money-recurrence
```

Create a recurring transaction under **Money → Settings → Recurrence** (or toggle **Repeat this transaction** on `/money`) before testing.

### 3. Linux cron

Run every day at 00:05 (server local time). Adjust the schedule to match your timezone needs.

```bash
crontab -e
```

```cron
CRON_SECRET=your-generated-secret
APP_URL=https://your-app.example

5 0 * * * curl -sS -f -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/money-recurrence" >> /var/log/money-recurrence-cron.log 2>&1
```

Notes:

- Store `CRON_SECRET` in a root-only file (e.g. `/etc/money-cron.env`) and `source` it from the crontab line if you prefer not to inline secrets.
- Use `-f` so cron mails you on non-2xx responses (when `curl` is built with failure on HTTP errors).

### 4. systemd timer

Useful when you want journald logging and explicit service units.

`/etc/systemd/system/money-recurrence-cron.service`:

```ini
[Unit]
Description=Money recurrence cron
After=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/money-cron.env
ExecStart=/usr/bin/curl -sS -f -X POST -H "Authorization: Bearer ${CRON_SECRET}" "${APP_URL}/api/cron/money-recurrence"
```

`/etc/systemd/system/money-recurrence-cron.timer`:

```ini
[Unit]
Description=Run Money recurrence cron daily

[Timer]
OnCalendar=*-*-* 00:05:00
Persistent=true

[Install]
WantedBy=timers.target
```

`/etc/money-cron.env`:

```bash
CRON_SECRET=your-generated-secret
APP_URL=https://your-app.example
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now money-recurrence-cron.timer
sudo systemctl list-timers | grep money-recurrence
```

### 5. Docker Compose

If the app runs in Compose, run curl from the host (or a sidecar) against the published port — the Next.js container does not need a separate cron process inside the image.

Example host crontab when the app is on `localhost:3000`:

```cron
5 0 * * * curl -sS -f -X POST -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/money-recurrence"
```

Ensure `CRON_SECRET` is set in the app container environment (e.g. in `.env` consumed by `docker compose`).

### 6. Local dev: 5-minute recurrence

The create form shows **Every 5 minutes (dev)** only when `NODE_ENV=development`. Production builds hide it and the API rejects that cadence if sent directly.

To test short intervals locally:

1. Create a recurring transaction with **Every 5 minutes (dev)**.
2. Trigger the cron on a short interval, for example every minute:

```bash
while true; do
  curl -sS -X POST http://localhost:3000/api/cron/money-recurrence
  echo
  sleep 60
done
```

Each successful call posts at most one transaction and moves `nextRunAt` forward.

### Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `401 Unauthorized` | Wrong or missing `CRON_SECRET` in production |
| `503 db_unavailable` | Postgres not reachable (`DATABASE_URL`) |
| `"generated": 0` | No active templates with `nextRunAt <= now` |
| `"errors": [...]` | Invalid template data (account archived, bad category, etc.) |

See also [`docs/API.md`](docs/API.md) for the REST table entry.

## Verification before merging

- `npm run lint`
- `npm run build`
- Walk the changed surface in `/settings` across **light and dark modes**.
