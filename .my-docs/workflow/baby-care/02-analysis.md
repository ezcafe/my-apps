# Analysis: Baby care workspace app

## What exists today

**No Baby Care product code** — no routes, schema tables, APIs, or UI for feeding/diaper/sleep/growth. The shell already supports **workspace-backed features** (Money is the live model; Investments/Loans reuse Money’s workspace cookie). Reserved app keys `"notes"` and `"tasks"` exist in DB enums but have **no** routes or modules yet.

**Workspace + auth (reuse as-is):** shared/personal workspaces, membership (`owner` / `member`), per-app active cookie, session auth (NextAuth) plus Money-scoped API tokens. Caregivers already share a workspace via membership — fits Gate 1 “everyone edits.”

**Closest patterns:** Money/Loans GraphQL + TanStack Query bootstrap; thin REST for imports/cron; web-push loan reminders (not Telegram); visx charts; design-system large hit targets (`Button` `lg` / `fx-hit-40`).

### Cross-cutting patterns (i18n / Telegram / realtime)

| Area | Status in this repo |
|------|---------------------|
| **i18n (EN+VI)** | **Absent.** No `next-intl` / i18next. UI strings are English in components. Preferences cover **date format** only ([`components/preferences-provider.tsx`](../../../components/preferences-provider.tsx), [`lib/date-format-preference.ts`](../../../lib/date-format-preference.ts)). MVP EN+VI needs a **new** string layer (Design). |
| **Telegram** | **Absent.** No bot SDK, webhook route, or env pattern. Only mention is this workflow. Closest notify analog: **web-push** for loans ([`lib/loans-push-server.ts`](../../../lib/loans-push-server.ts), cron [`app/api/cron/loan-reminders/route.ts`](../../../app/api/cron/loan-reminders/route.ts)). |
| **Realtime** | **Absent** SSE/WebSocket. Shared UI sync = **mutate → invalidateQueries → refetch** (Money/Loans). No live multi-tab push. MVP “second caregiver sees it” can be query refresh / light polling (Design). |

### Dev-decision routing note

`user-context-mode` MCP authenticated successfully. Lookup into qan `Work/Dev/{HTML|CSS|Js}` was **blocked** (outside this repo’s analysis scope). Analysis is grounded in **this repo**: `docs/ARCHITECTURE.md`, `docs/ADDING_A_FEATURE.md`, `docs/DESIGN_GUIDE.md`, and Money/Loans code.

## Dependencies

**Must change (same repo):**

1. **`WORKSPACE_APP_KEYS`** — add a baby-care key (e.g. `"baby"` / `"baby-care"`) in [`db/schema/workspace.ts`](../../../db/schema/workspace.ts); migrate.
2. **New domain schema + RLS** — baby profile (one per workspace), care events, growth/meds; follow Money RLS (`app.workspace_id` + [`runInWorkspace`](../../../db/index.ts)).
3. **Shell registry + icon** — [`lib/features/registry.ts`](../../../lib/features/registry.ts), [`components/app-shell.tsx`](../../../components/app-shell.tsx).
4. **Routes + provider** — `app/(shell)/baby*/**`, feature layout/provider (Money/Loans pattern).
5. **APIs** — thin `app/api/...` and/or GraphQL; services under `features/baby*/` or `lib/baby*-services/`.
6. **i18n** — new string catalog + language preference (extend prefs or localStorage; Design).
7. **Telegram** — new bot webhook + link between chat and workspace member; new secrets (Design). Cron auth pattern exists ([`lib/cron-auth.ts`](../../../lib/cron-auth.ts)) if notify is scheduled.

**Stay compatible / do not break:**

- Money/Investments/Loans cookies and GraphQL.
- Shell `kind: "core"` routes free of feature bootstrap.
- Public API tokens stay Money-only for now ([`lib/api-token-app-keys.ts`](../../../lib/api-token-app-keys.ts)); Gate 1 defers public baby API.
- Design system tokens / skeleton parity ([`docs/DESIGN_GUIDE.md`](../../../docs/DESIGN_GUIDE.md)).

**Other repos:** none found. Single app at `/Users/ptquang86/ws/my-apps`.

## Reference files (for Build)

### Architecture & checklist

| Path | Why it matters |
|------|----------------|
| [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) | Shell vs feature layers; workspace cookies; where bootstrap lives. |
| [`docs/ADDING_A_FEATURE.md`](../../../docs/ADDING_A_FEATURE.md) | Checklist: app key → registry → layout provider → thin API → UI. |
| [`docs/DESIGN_GUIDE.md`](../../../docs/DESIGN_GUIDE.md) | Tokens, primitives, motion, ≥44×44 targets, light/dark, charts. |
| [`AGENTS.md`](../../../AGENTS.md) | Agent rules: feature bootstrap, Drizzle array/`SUM` pitfalls. |

### Workspace, registry, auth

| Path | Why it matters |
|------|----------------|
| [`db/schema/workspace.ts`](../../../db/schema/workspace.ts) | `WORKSPACE_APP_KEYS`, members, defaults — add baby key here. |
| [`lib/workspace-context.ts`](../../../lib/workspace-context.ts) | `workspaceCookieName`, `getActiveWorkspaceId`, membership helpers. |
| [`lib/workspace-list.ts`](../../../lib/workspace-list.ts) | List workspaces for switcher/settings. |
| [`lib/features/registry.ts`](../../../lib/features/registry.ts) | Nav entry + `workspaceAppKey`. |
| [`components/app-shell.tsx`](../../../components/app-shell.tsx) | Wire new `ShellNavIconId` SVG. |
| [`lib/api-auth.ts`](../../../lib/api-auth.ts) | Session + API-key resolution (session path for MVP). |
| [`lib/api-money.ts`](../../../lib/api-money.ts) | Copy shape: `requireMoneyContext`, errors, `withMoneyWorkspaceRls`. |
| [`lib/api-loans.ts`](../../../lib/api-loans.ts) | Sibling `require*Context` for a non-Money feature. |
| [`app/api/workspace/active/route.ts`](../../../app/api/workspace/active/route.ts) | Set active workspace cookie per `app`. |
| [`lib/validators/workspace.ts`](../../../lib/validators/workspace.ts) | Zod for workspace payloads. |
| [`lib/bootstrap.ts`](../../../lib/bootstrap.ts) | Ensure membership / personal workspace on first use. |
| [`components/workspace-settings.tsx`](../../../components/workspace-settings.tsx) | Workspace list UI pattern for a feature settings surface. |

### Money / Loans bootstrap & data (copy patterns, not finance)

| Path | Why it matters |
|------|----------------|
| [`app/(shell)/money/layout.tsx`](../../../app/(shell)/money/layout.tsx) | SSR prefetch + Suspense + hydrated provider. |
| [`components/money-route-layout.tsx`](../../../components/money-route-layout.tsx) | Route chrome + `MoneyHydratedWorkspace`. |
| [`components/money-workspace-provider.tsx`](../../../components/money-workspace-provider.tsx) | Feature provider scoped to feature routes only. |
| [`components/loans-workspace-provider.tsx`](../../../components/loans-workspace-provider.tsx) | Smaller sibling provider + invalidate pattern. |
| [`app/(shell)/loans/layout.tsx`](../../../app/(shell)/loans/layout.tsx) | Loans layout remounting Money + loans providers. |
| [`lib/get-query-client.ts`](../../../lib/get-query-client.ts) | Per-request QueryClient + browser singleton. |
| [`lib/money-ssr-prefetch.ts`](../../../lib/money-ssr-prefetch.ts) | SSR seed into TanStack Query. |
| [`lib/money-query-options.ts`](../../../lib/money-query-options.ts) | Query keys + invalidate helpers. |
| [`features/money/README.md`](../../../features/money/README.md) | Thin route → server handler convention. |
| [`features/money/index.ts`](../../../features/money/index.ts) | Feature barrel (GraphQL today; REST for multipart). |
| [`db/schema/money.ts`](../../../db/schema/money.ts) | Enum + `workspaceId` table style to mirror. |
| [`db/schema/loans.ts`](../../../db/schema/loans.ts) | Feature tables + push subscription table shape. |
| [`db/schema/index.ts`](../../../db/schema/index.ts) | Export new schema module. |
| [`db/migrations/0009_money_rls.sql`](../../../db/migrations/0009_money_rls.sql) | RLS policy template (`app.workspace_id`). |
| [`db/migrations/0019_loans.sql`](../../../db/migrations/0019_loans.sql) | Adding a new domain + migrate journal pattern. |
| [`db/index.ts`](../../../db/index.ts) | `runInWorkspace` / `withBypassRls`. |

### API / GraphQL / guards

| Path | Why it matters |
|------|----------------|
| [`lib/graphql/http-handler.ts`](../../../lib/graphql/http-handler.ts) | GraphQL POST, CSRF, rate limit. |
| [`lib/graphql/context.ts`](../../../lib/graphql/context.ts) | Auth + workspace membership on GraphQL ctx. |
| [`lib/graphql/money-yoga.ts`](../../../lib/graphql/money-yoga.ts) | Yoga wiring for a feature GraphQL endpoint. |
| [`lib/gql-client.ts`](../../../lib/gql-client.ts) | Browser GraphQL client pattern. |
| [`app/api/graphql/route.ts`](../../../app/api/graphql/route.ts) | Money GraphQL entry. |
| [`app/api/graphql/loans/route.ts`](../../../app/api/graphql/loans/route.ts) | Separate GraphQL namespace for a sibling feature. |
| [`lib/request-guards.ts`](../../../lib/request-guards.ts) | `assertSameOriginStrict`, bounded JSON, CSRF. |
| [`lib/rate-limit.ts`](../../../lib/rate-limit.ts) | Per-route rate limits. |
| [`app/api/money/import/commit/route.ts`](../../../app/api/money/import/commit/route.ts) | Thin REST + `requireMoneyContext` + RLS. |
| [`lib/cron-auth.ts`](../../../lib/cron-auth.ts) | Bearer `CRON_SECRET` for scheduled jobs. |

### Notify analog (not Telegram — copy discipline only)

| Path | Why it matters |
|------|----------------|
| [`lib/loans-push-server.ts`](../../../lib/loans-push-server.ts) | Outbound notify + env gating when keys missing. |
| [`lib/loans-services/push.ts`](../../../lib/loans-services/push.ts) | Persist subscriptions per user. |
| [`lib/loans-services/reminders.ts`](../../../lib/loans-services/reminders.ts) | Cron selects due rows across workspaces. |
| [`app/api/cron/loan-reminders/route.ts`](../../../app/api/cron/loan-reminders/route.ts) | Cron + `withBypassRls` + notify loop. |

### UI / charts / home actions

| Path | Why it matters |
|------|----------------|
| [`components/ui/button.tsx`](../../../components/ui/button.tsx) | `lg`, `iconOnly`, `fx-hit-40` for one-handed CTAs. |
| [`components/ui/`](../../../components/ui/) | Field, Modal, Tabs, Skeleton, Alert, Card. |
| [`app/globals.css`](../../../app/globals.css) | Semantic tokens, `fx-*` utilities. |
| [`components/charts/line-chart.tsx`](../../../components/charts/line-chart.tsx) | Growth series (visx) reference. |
| [`lib/theme-chart-palette.ts`](../../../lib/theme-chart-palette.ts) | `colorByIndex` for theme-safe chart colors. |
| [`components/charts/chart-colors.ts`](../../../components/charts/chart-colors.ts) | Chart color helpers used by cards. |
| [`app/(shell)/money/(tabs)/page.tsx`](../../../app/(shell)/money/(tabs)/page.tsx) | Feature home composition. |
| [`app/(shell)/money/(tabs)/loading.tsx`](../../../app/(shell)/money/(tabs)/loading.tsx) | Skeleton parity example. |
| [`lib/microinteractions.ts`](../../../lib/microinteractions.ts) | View transitions / reduced motion. |
| [`components/preferences-provider.tsx`](../../../components/preferences-provider.tsx) | Client preference pattern to extend for language. |
| [`db/schema/user-preferences.ts`](../../../db/schema/user-preferences.ts) | Server prefs table if language is stored server-side. |

## Constraints and risks

- **Month-end deadline** — Telegram + full logs + EN/VI is a large MVP; Telegram has **zero** prior art here (highest schedule risk).
- **No i18n stack** — shipping VI means inventing catalogs and a language switch; easy to under-estimate.
- **RLS required** — new tables need policies + always `runInWorkspace`; forgetting RLS is a tribal footgun (see Money migrations).
- **Roles vs Gate 1** — DB still has `owner`/`member`; product says everyone edits. Do **not** build role UI; still use membership for access. Owner-only ops (if any) should stay rare.
- **One baby / workspace** — enforce in schema/API (unique baby per workspace), not multi-baby UI.
- **Online-only MVP** — no offline/CRDT; concurrent edits = last-write-wins unless Design adds a light rule.
- **Sync lag** — without SSE, caregiver B may need refresh/poll; Design must pick a simple approach.
- **Telegram auth ≠ session cookie** — bot webhooks cannot use browser Origin/CSRF; need bot secret + explicit user↔chat link. Privacy = normal workspace auth for **web**; Telegram is an extra channel (Gate 1: no extra privacy bar).
- **Do not reuse Money GraphQL bag** — keep a separate namespace (`/api/graphql/baby*` or REST) so Money stays isolated.
- **Public API deferred** — do not expand [`API_TOKEN_APP_KEYS`](../../../lib/api-token-app-keys.ts) for baby in MVP.
- **postgres.js arrays / bigint SUM** — follow AGENTS.md when writing SQL.
- **Skeleton parity** — every home/log/timeline UI change needs matching loading UI.

## Settled decisions (do not relitigate)

From Gate 1 ([`01-idea.md`](./01-idea.md)):

- MVP: full feeding, diaper, sleep, growth/meds, Telegram notify + add-log, EN + VI.
- Deferred: sleep prediction, reports/PDF, offline/CRDT, public API.
- One baby per workspace; everyone edits; home = Log feed · Log nap · Timeline.
- Telegram events: sleep, feed, diaper, health (notify + create).
- Later conflict model: CRDT; later prediction: next sleep/diaper/feeding.
- Deadline: end of month (2026-09); privacy: normal workspace auth.
- Charts: visx (+ theme palette) per repo rules.

## Blocking questions — answered (2026-09-06)

1. **Telegram ↔ workspace link:** **B** — one shared family Telegram chat/group linked to the workspace (notifies go there; add-log from anyone in that group via the bot).
2. **Telegram hosting readiness:** Ship Telegram as a **shippable module behind env flags** (works when bot token + webhook are set; web MVP does not block on Telegram).

Non-blocking for Design (pick options in `03-design.md`): GraphQL vs REST for baby APIs; timeline refresh strategy; i18n library vs simple dictionaries; exact `WorkspaceAppKey` string.

---

*Analyze drafted 2026-09-06; Telegram Qs answered. Gate 1 settled decisions preserved. No production code. Design not finalized.*
