# Workspace app

Multi-feature Next.js workspace built around a small **shell** and a **Money** feature module. Pocket ID OIDC handles auth; Drizzle + PostgreSQL 18 hold the data. The UI is a token-driven minimalist design system with 4 visual presets (Linear / Apple / Swiss / Notion) × light/dark, all CSS-only motion.

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
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run db:reset` | Reset the local DB schema (destructive). |
| `npm run db:recompute-balances` | Recompute Money account balances. |

## Project layout

```
app/
  (shell)/             Authenticated chrome (rail + header). Routes here inherit ShellLayout.
    money/             Money feature pages — own layout + provider tree.
    settings/          Global settings: visual style + appearance.
  api/                 Thin Next.js route entrypoints; logic lives in features/<x>/server or lib/.
  globals.css          The 4 × 2 token sets + microinteraction utilities.
  layout.tsx           Root layout, fonts, FOUC pre-paint script.
  page.tsx             Public landing.
components/
  ui/                  Token-driven primitives (Button, Card, Field/Input/Select/Textarea,
                       Modal, Popover, Tabs, MultiSelect, Tag, Badge, Skeleton, Alert).
  app-shell.tsx        Desktop rail + mobile header (registry-driven nav).
  notification-provider.tsx  Toasts.
  theme-provider.tsx   {style, mode} provider; persists to localStorage.
  style-settings.tsx   Style picker on /settings (4 live preview cards).
  theme-settings.tsx   Light/dark/system segmented control.
  money-*              Money-specific surfaces (dashboard, edit form, settings panels…).
features/
  money/               Domain server code, barrel re-exports, feature README.
lib/
  features/registry.ts Single source of truth for shell nav.
  theme-chart-palette.ts  Per-preset chart palettes; chart components read via colorByIndex.
  microinteractions.ts withViewTransition + prefersReducedMotion helpers.
db/                    Drizzle schema and migrations.
docs/                  Architecture, design guide, feature checklist.
```

## Design system (mandatory)

- Two orthogonal axes drive every visual decision:
  - `style` → `<html data-style="linear|apple|swiss|notion">` (default `linear`).
  - `mode` → `<html class="dark">` toggled for dark; otherwise light.
- 4 styles × 2 modes = **8 token sets** declared in [`app/globals.css`](app/globals.css). Every preset defines the same semantic names so components never branch on `style`.
- Compose UI from [`components/ui/`](components/ui/) primitives. They already consume tokens (`rounded-[var(--radius-md)]`, `shadow-[var(--shadow-sm)]`, `bg-surface`, etc.).
- Microinteractions are CSS-only (`fx-press`, `fx-fade-in`, `fx-shimmer`, `fx-field` + `fx-field-underline`). For state-driven transitions, use [`withViewTransition`](lib/microinteractions.ts).
- Charts: visx + `colorByIndex(resolved, i, style)` from [`lib/theme-chart-palette.ts`](lib/theme-chart-palette.ts). Never hand-pick chart colors.
- Layout: `shell-main` wrapper + `repeat(auto-fit, minmax(min(100%, …), 1fr))` and container queries. No hard-coded breakpoints for content.
- Status colors: `--accent` for positive, `--destructive` for negative, `--muted` for flat. No `text-emerald-*` / `text-rose-*`.
- Verify every change in all 4 presets × light/dark via `/settings` before merging.

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

## Verification before merging

- `npm run lint`
- `npm run build`
- Walk the changed surface in `/settings` across **all four presets × light/dark**. Swiss is the canary — any leftover hardcoded `shadow-*` or `rounded-*` will visibly break there because Swiss sets `--radius: 0` and disables shadows.
