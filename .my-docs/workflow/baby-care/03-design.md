# Design: Baby care workspace app

## Option A — REST-first + poll timeline (recommended)

**Summary:** Ship Baby Care as a new workspace feature (`WorkspaceAppKey: "baby"`) with **thin REST** under `app/api/baby/**`, services in `features/baby/` / `lib/baby-*`, TanStack Query on the client, and **short polling on the Timeline** while that page is open. i18n = small EN/VI message maps + a language preference. Telegram = isolated module behind env flags (shared family chat → workspace).

**Stack sketch:**

- Shell: registry + `app/(shell)/baby/**` + feature provider (Money/Loans pattern).
- Data: Drizzle tables + RLS via `runInWorkspace`.
- API: REST CRUD + list/cursor for timeline; Zod at route edges.
- Sync: mutate → invalidateQueries → refetch; Timeline adds ~15–30s `refetchInterval` when document visible.
- Charts: visx + `colorByIndex`.
- Telegram: webhook route + bot secret; no browser CSRF; disabled when env unset.

**Pros:**

- Fastest path to month-end MVP; matches [`docs/ADDING_A_FEATURE.md`](../../../docs/ADDING_A_FEATURE.md) thin-route checklist.
- Easy to reason about for create-log APIs (one resource = one route family).
- Polling gives “second caregiver sees it” without SSE/WebSocket infra.
- Simple message maps avoid adopting a full i18n framework under deadline.
- Telegram can ship last; web stays useful with flags off.

**Cons:**

- Less like Money/Loans GraphQL; later “fancy” list filters need more REST endpoints.
- Polling wastes a little traffic vs push; lag up to the poll interval.
- Message maps can get messy if string count grows a lot (still fine for MVP).

---

## Option B — GraphQL-first + invalidate-only

**Summary:** Same product shell and schema, but expose Baby Care through a **separate GraphQL Yoga** endpoint (`/api/graphql/baby`, like Loans). Client uses GraphQL + TanStack Query; sync = **invalidate + refetch only** (no polling). i18n via a library (e.g. `next-intl`). Telegram module same as A (env-flagged, shared chat).

**Stack sketch:**

- Shell / schema / RLS / Telegram / visx: same as A.
- API: GraphQL queries/mutations for baby, events, growth; thin REST only for Telegram webhook.
- Sync: after mutation, invalidate query keys; caregiver B refreshes or remounts to see new rows.
- i18n: library with locale routing or provider.

**Pros:**

- Matches Money/Loans client patterns; one GraphQL bag for nested reads later (timeline + baby + filters).
- Cleaner for a future public API era (schema as contract).
- Library i18n scales better for many screens.

**Cons:**

- More setup (Yoga, schema, client documents) before first “Log feed” works — risky for end of month.
- Without polling/SSE, second caregiver may wait until they navigate/refocus unless we add push later.
- Overlaps Telegram (already new) with another new subsystem (i18n library + GraphQL).

---

## Tradeoffs

| Factor | Option A | Option B |
|--------|----------|----------|
| Cost / time | Lower — REST + dict i18n + poll | Higher — GraphQL + i18n lib first |
| Complexity | Medium (poll + Telegram flags) | Higher (GraphQL + lib i18n + Telegram) |
| Usability | Strong for one-handed log; timeline updates within poll window | Strong logs; shared timeline may feel “stale” until refresh |
| Failure cases | Poll fails → stale until next interval; REST sprawl if over-filtered | GraphQL schema churn slows ship; no poll → missed “who logged what” at 3am |
| Failure if Telegram blocked | Web MVP still ships | Same if flags used; schedule risk higher overall |
| Later offline/CRDT | Event table shape still works | Same |

---

## Recommendation

**Recommend Option A (REST-first + poll timeline).** The month-end cut needs feed/diaper/sleep/growth web UX first; Telegram is already optional behind flags. REST + simple dictionaries + light Timeline polling hits Gate 1 sync (“second caregiver sees it”) without inventing realtime infra or copying Money’s GraphQL tax onto a greenfield feature. Keep internal service functions clean so a GraphQL or public API layer can wrap them later (deferred).

---

## Chosen design (user-approved)

**Option B — GraphQL-first**, with Gate 2 amendments (2026-09-06):

1. **Reuse existing stack:** `graphql-yoga` + Zod validators (same patterns as Money/Loans — no new GraphQL/validation libraries).
2. **Auto sync:** client refetches baby queries on an interval configured by **env minutes** (e.g. `BABY_SYNC_INTERVAL_MINUTES`; pause when tab hidden). Not invalidate-only.
3. **Telegram:** shared platform flag **`TELEGRAM_ENABLED`** (not `BABY_TELEGRAM_ENABLED`) so other features can reuse the same bot/module later. Still needs `TELEGRAM_BOT_TOKEN` + webhook secret. Baby Care uses shared `lib/telegram/*` + baby-specific commands/link table.
4. Telegram link model **B** (one family chat/group per workspace); ship behind env flags.

---

## Shared product decisions (both options)

| Topic | Choice |
|-------|--------|
| App key | `"baby"` (`WorkspaceAppKey`) |
| Babies | One baby row per workspace (unique `workspace_id`) |
| Editors | Any workspace member may create/edit/delete care data (no role UI) |
| Home | Log feed · Log nap · Timeline (large hit targets) |
| Charts | visx + theme palette |
| Telegram link | Model B — one shared family chat/group per workspace |
| Telegram ship | Shared module behind `TELEGRAM_ENABLED` (+ token/secret); web does not block on bot |
| Sync | Auto refetch interval from env minutes (Option B amendment) |
| Deferred | Sleep prediction; reports/PDF; offline/CRDT; public API tokens |

---

## Contracts (chosen: Option B + amendments)

### Data ownership

- **Workspace** owns: baby profile, care events, growth/health rows, Telegram chat link.
- **User (session)** is actor: `createdByUserSub` / `updatedByUserSub` on rows for audit, not for ACL (everyone edits).
- **No Money API tokens** for baby in MVP ([`lib/api-token-app-keys.ts`](../../../lib/api-token-app-keys.ts) unchanged).
- **Telegram chat** is a channel into the same workspace data; bot verifies Telegram secret + linked `chatId`, then writes via `runInWorkspace` (bypass browser CSRF).

### Schema sketch (high level)

```
baby_profile
  id, workspace_id (unique), display_name, birth_date?, created_at, updated_at

care_event
  id, workspace_id, baby_id
  type: feed | diaper | sleep
  occurred_at (start); ended_at? (sleep / timed feed)
  payload jsonb  -- type-specific fields (see events)
  created_by_user_sub, updated_by_user_sub, created_at, updated_at
  source: web | telegram

growth_entry
  id, workspace_id, baby_id
  kind: weight | height | head | temperature | medication
  recorded_at, value_text / value_num?, unit?, notes?
  created_by_user_sub, …

baby_telegram_link
  workspace_id (unique), chat_id, linked_at, linked_by_user_sub
```

RLS: `workspace_id = current_setting('app.workspace_id')` (Money migration pattern). All feature reads/writes go through `runInWorkspace`.

### Care event payloads (internal shape)

| Type | Required fields (plain) |
|------|-------------------------|
| `feed` | `method`: `breast_l` \| `breast_r` \| `formula` \| `pump`; optional `durationSec`, `amountMl`, `notes` |
| `diaper` | `kind`: `wet` \| `dirty` \| `mixed`; optional `notes` |
| `sleep` | `phase`: `start` \| `end` **or** single row with `ended_at` null until end; prefer **one open sleep** per baby (end updates same row) |

Growth/meds live in `growth_entry`, not `care_event`, so timeline can union both for “day view.”

### API / module shape (Option B — chosen)

**Modules:**

| Module | Role |
|--------|------|
| `lib/api-baby.ts` | `requireBabyContext`, error helpers (mirror Loans) |
| `features/baby/server/*` | Create/list/update/delete domain ops (Zod at edges) |
| `lib/graphql/baby-*.ts` + `app/api/graphql/baby/route.ts` | Yoga schema + resolvers (reuse Money/Loans GraphQL patterns) |
| `lib/validators/baby.ts` | Zod input schemas |
| `lib/baby-i18n.ts` + `messages/baby/{en,vi}.ts` | Feature dictionaries (no new i18n framework unless already in repo) |
| `lib/telegram/*` | **Shared** env gate (`TELEGRAM_ENABLED`), webhook verify, send message — reusable by other features |
| `lib/baby-telegram/*` or baby resolvers | Baby commands + workspace chat link (uses shared telegram) |
| `components/baby-*` + `app/(shell)/baby/**` | UI + skeletons |
| Thin REST | Telegram webhook only (`/api/telegram/webhook` preferred shared, or baby path that delegates) |

**GraphQL sketch** (session auth, mirror Loans):

| Kind | Name | Purpose |
|------|------|---------|
| Query | `babyProfile` | Get or ensure one baby |
| Query | `babyTimeline(from, to, cursor, limit)` | Union events + growth |
| Query | `babyGrowthEntries` / filters | List growth/meds |
| Query | `babyTelegramLink` | Link status for workspace |
| Mutation | `createBabyFeed` / `createBabyDiaper` / `startBabySleep` / `endBabySleep` | Care logs |
| Mutation | `updateBabyEvent` / `deleteBabyEvent` | Edit/delete |
| Mutation | `createBabyGrowth` / `update` / `delete` | Growth/meds |
| Mutation | `linkBabyTelegramChat` / `unlinkBabyTelegramChat` | Model B chat id |

Reuse `createYoga` / `createSchema` / context helpers from [`lib/graphql/`](../../../lib/graphql/). Map service errors like Loans.

### Timeline sync approach (Gate 2 amendment)

| Mode | Behavior |
|------|----------|
| **Chosen** | On mutate: invalidate `baby` query keys + refetch. **Auto sync:** `refetchInterval` = `BABY_SYNC_INTERVAL_MINUTES` from env (exposed safely to client via public config or server-injected default). Pause when `document.visibilityState !== "visible"`. Default if unset: e.g. `1` minute (Build may pick a sensible default). |
| Dropped | Invalidate-only without interval; hard-coded 15–30s without env. |

No SSE/WebSocket in MVP. No offline queue.

### i18n approach

**Chosen for ship speed:** feature EN/VI dictionaries (`t(key)`), same as original Option A maps — **do not add next-intl** unless already in the repo. Locale preference mirrors date-format preference pattern. Default `en`. Baby Care strings + shell nav label only.

### Telegram env-flagged module (shared)

**Enable when all set:**

- `TELEGRAM_ENABLED=true` (shared across features — **not** baby-prefixed)
- `TELEGRAM_BOT_TOKEN=…`
- `TELEGRAM_WEBHOOK_SECRET=…` (verify webhook)

When disabled/missing: web link UI shows “Telegram off”; webhook returns `503`/`telegram_disabled`; **no** notify calls; create-log from bot unavailable. Web logging unaffected. Loans/Money may later call the same `lib/telegram` send helper.

**Link model B:** one `baby_telegram_link` row per workspace → one `chat_id` (group). Notify posts into that chat. Add-log: messages from that chat matching bot commands create events as `source: telegram` (actor = `linked_by_user_sub` preferred).

**Commands (MVP):** bot can **create** feed / diaper / sleep start|end / health note, and **push a short confirm** into the group.

### Errors (one shape)

Match existing Loans style for REST:

```json
{ "error": "Human message", "code": "conflict" }
```

| HTTP | `code` (examples) | When |
|------|-------------------|------|
| 400 | `bad_request` | Malformed JSON / bad params |
| 401 | `unauthorized` | No session (web) |
| 403 | `forbidden` | Not a workspace member |
| 404 | `not_found` | Missing event / baby |
| 409 | `conflict` | Second open sleep; duplicate telegram link |
| 422 | `validation_failed` | Zod field errors (`details` optional) |
| 503 | `db_unavailable` / `telegram_disabled` | DB down / bot flags off |

Do not leak stacks or Telegram token material.

### Domain events (internal, for notify hooks)

After successful write, services may emit a plain object (in-process, not a bus):

```ts
{
  workspaceId: string;
  babyId: string;
  kind: "feed" | "diaper" | "sleep" | "growth";
  action: "created" | "updated" | "deleted";
  summary: string; // already localized or key+params
  source: "web" | "telegram";
}
```

Telegram notify subscriber no-ops if flags off.

---

## Challenges answered

### Do we need this?

- **Workspace feature + schema + home logs + timeline:** Yes — core Gate 1 outcome.
- **Growth/meds + visx:** Yes — Gate 1 must-have; keep charts thin (one series chart reused).
- **EN+VI:** Yes — Gate 1; feature dictionaries (no new i18n lib).
- **Telegram in same month:** Shared module behind `TELEGRAM_ENABLED` — not a web blocker.
- **GraphQL:** Yes — chosen Option B; reuse Yoga + Zod already in repo.
- **SSE / CRDT / PDF / prediction / public API:** No for MVP.

### What fails?

- **Two caregivers start sleep at once** → conflict on second start; UI shows “Sleep already open.”
- **Telegram group not linked / flags off** → no notify/add-log; web still works.
- **Sync lag** → up to `BABY_SYNC_INTERVAL_MINUTES` before caregiver B sees a row.
- **Last-write-wins on concurrent edit** → acceptable until CRDT; show `updated_at` if useful.
- **Forgot RLS** → cross-workspace leak risk — migrations + `runInWorkspace` are mandatory checkpoints.
- **i18n keys missing** → fall back to English key or `en` string (never blank crash).

### Is this overspecified?

- **Not overspecified:** app key, one-baby rule, GraphQL operations, error codes, open-sleep conflict, shared Telegram flags + link model, env sync minutes, EN/VI maps.
- **Left loose on purpose:** exact bot command grammar, notify-every-web-create vs quiet mode, whether language lives in DB prefs vs localStorage, cursor encoding — Build can choose without redesign.
- **Avoided:** role matrices, multi-baby, REST dual surface for baby domain, CRDT fields, public tokens, prediction models, new GraphQL/validation libraries.

### ADR?

Gate 2 record: **Option B + amendments** in this file. Optional later ADR in `docs/` if desired.

---

## Boundaries for Build

| Tier | Rule |
|------|------|
| **Always** | Follow `ADDING_A_FEATURE` + `DESIGN_GUIDE`; RLS + `runInWorkspace`; skeleton parity; Telegram no-ops without `TELEGRAM_ENABLED`; reuse Yoga + Zod; TDD per task |
| **Ask first** | New npm deps (e.g. Grammy/Telegraf); changing `"baby"` key string; expanding API tokens to baby |
| **Never** | Mount baby bootstrap in global shell; put baby into Money GraphQL bag; ship CRDT/PDF/prediction in this MVP; commit bot tokens; invent `BABY_TELEGRAM_ENABLED` |

---

*Design drafted 2026-09-06. Gate 2 approved Option B + amendments 2026-09-06.*
