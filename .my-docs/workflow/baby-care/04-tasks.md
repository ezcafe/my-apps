# Tasks: Baby care workspace app

**Gate 2 chosen: Option B** — GraphQL Yoga + Zod (reuse existing libs), env-minute auto sync, shared `TELEGRAM_ENABLED`, feature EN/VI dictionaries.

**Goal order:** shell → schema → profile → GraphQL → i18n → home → feed → diaper → sleep → timeline+sync → growth/charts → shared Telegram last.

---

## Task 1: Add `baby` workspace app key + migrate

**Description:** Add `"baby"` to `WORKSPACE_APP_KEYS` and generate/apply the enum migration.

**Acceptance:**

- [x] `"baby"` is a valid `WorkspaceAppKey`
- [ ] Migration applies cleanly on empty and existing DBs

**Tests (TDD — what turns red first):**

- [x] Schema assertion: `WORKSPACE_APP_KEYS` includes `"baby"` (fails before edit)

**Files likely touched:** `db/schema/workspace.ts`, `db/migrations/*`

**Scope:** S

**Dependencies:** none

---

## Task 2: Registry nav + empty Baby shell route

**Description:** Register Baby Care in registry, shell icon, `app/(shell)/baby/page.tsx` placeholder + layout stub.

**Acceptance:**

- [x] Signed-in user sees Baby Care in nav and can open `/baby`
- [x] Active workspace cookie uses app key `"baby"`
- [x] No Money/Loans bootstrap on `/baby`

**Tests (TDD — what turns red first):**

- [x] Registry unit test: `workspaceAppKey === "baby"` and href matches

**Files likely touched:** `lib/features/registry.ts`, `components/app-shell.tsx`, `app/(shell)/baby/**`

**Scope:** M

**Dependencies:** Task 1

---

### Checkpoint A (after Tasks 1–2)

- [x] Migration + types clean
- [x] Nav → `/baby` opens placeholder
- [ ] Human glance: light/dark shell OK

---

## Task 3: Baby domain schema + RLS

**Description:** Add Drizzle tables: `baby_profile`, `care_event`, `growth_entry`, `baby_telegram_link`. RLS via `runInWorkspace` pattern. Export from schema index.

**Acceptance:**

- [ ] Tables migrate; one baby per workspace (unique workspace_id)
- [x] RLS policies mirror Money/Loans

**Tests (TDD — what turns red first):**

- [x] Schema/unit: unique baby workspace constraint defined (or integration insert isolation)

**Files likely touched:** `db/schema/baby*.ts`, `db/schema/index.ts`, migrations

**Scope:** M

**Dependencies:** Task 1

---

## Task 4: `requireBabyContext` + ensure profile service

**Description:** Mirror Loans `require*Context`. Service ensures one baby profile for workspace.

**Acceptance:**

- [x] Context resolves workspace membership for `"baby"` cookie
- [x] Ensure profile is idempotent

**Tests (TDD — what turns red first):**

- [x] Service test: ensureProfile twice → one row

**Files likely touched:** `lib/api-baby.ts`, `features/baby/server/profile.ts`

**Scope:** M

**Dependencies:** Task 3

---

### Checkpoint B (after Tasks 3–4)

- [x] Schema/RLS + profile service tests green

---

## Task 5: Baby GraphQL Yoga endpoint + Zod validators

**Description:** Add `/api/graphql/baby` using existing `graphql-yoga` + patterns from `lib/graphql/loans-*` / `money-yoga`. Zod in `lib/validators/baby.ts`. Wire `babyProfile` query + ensure mutation if needed. Do **not** put baby into Money GraphQL bag.

**Acceptance:**

- [x] Authenticated GraphQL query returns profile for active baby workspace
- [x] Unauthorized → GraphQL/auth error consistent with Loans
- [x] No new GraphQL/validation libraries

**Tests (TDD — what turns red first):**

- [x] Yoga/handler test: `babyProfile` query succeeds with mock context (red first)

**Files likely touched:** `lib/graphql/baby-*.ts`, `app/api/graphql/baby/route.ts`, `lib/validators/baby.ts`

**Scope:** M

**Dependencies:** Task 4

---

## Task 6: EN/VI dictionaries + language preference

**Description:** Feature message maps + `t(key)`; locale preference (mirror date-format prefs). No new i18n framework.

**Acceptance:**

- [x] Nav label + home strings switch EN ↔ VI
- [x] Missing key falls back to `en`

**Tests (TDD — what turns red first):**

- [x] Unit: `t("home.logFeed", "vi")` returns Vietnamese; unknown key falls back

**Files likely touched:** `lib/baby-i18n.ts`, `messages/baby/{en,vi}.ts`, prefs hook/UI

**Scope:** M

**Dependencies:** Task 2

---

## Task 7: One-handed home UI — Log feed · Log nap · Timeline

**Description:** Minimal home with three large CTAs; skeletons match. Wire provider/layout like Money/Loans.

**Acceptance:**

- [x] Home shows only those three primary actions (growth secondary)
- [x] Hit targets ≥44px; light/dark OK
- [x] Skeleton parity

**Tests (TDD — what turns red first):**

- [x] RTL: three action labels present (EN)

**Files likely touched:** `app/(shell)/baby/**`, `components/baby-*`, loading skeletons

**Scope:** M

**Dependencies:** Tasks 5–6

---

### Checkpoint C (after Tasks 5–7)

- [x] GraphQL baby endpoint live; home CTAs + i18n

---

## Task 8: Feed mutations (breast L/R, formula, pump + timers)

**Description:** GraphQL mutations + UI for full feeding log via services + Zod.

**Acceptance:**

- [x] Create feed for each method; optional duration/amount
- [ ] Appears in subsequent timeline query (needs DB + browser QA)

**Tests (TDD — what turns red first):**

- [x] Service/Zod: invalid method rejected; valid breast_l creates row

**Files likely touched:** feed service, baby GraphQL resolvers, feed UI

**Scope:** M

**Dependencies:** Task 5

---

## Task 9: Diaper mutation

**Description:** Create diaper wet/dirty/mixed via GraphQL + large-button UI.

**Acceptance:**

- [x] Three kinds creatable in one tap flow
- [x] Validation rejects bad kind

**Tests (TDD — what turns red first):**

- [x] Service test: wet/dirty/mixed OK; other → validation error

**Files likely touched:** diaper service + UI + resolvers

**Scope:** S

**Dependencies:** Task 8

---

## Task 10: Sleep start/end — conflict rule

**Description:** Mutations `startBabySleep` / `endBabySleep`. One open sleep per baby; second start → conflict.

**Acceptance:**

- [x] Start opens sleep; end closes it
- [x] Second start while open → conflict; UI message EN/VI

**Tests (TDD — what turns red first):**

- [x] Service test: two starts without end → second throws conflict

**Files likely touched:** sleep service + UI + resolvers

**Scope:** M

**Dependencies:** Task 8

---

### Checkpoint D (after Tasks 8–10)

- [ ] Feed, diaper, sleep work end-to-end on web (needs live DB)
- [x] Focused tests green

---

## Task 11: Timeline GraphQL query — cursor list + day window

**Description:** `babyTimeline` unions care events + growth; `from`/`to`, `limit` + `cursor`; sort time desc.

**Acceptance:**

- [x] Mixed types with discriminator
- [x] Pagination via cursor
- [x] Workspace isolation

**Tests (TDD — what turns red first):**

- [ ] Integration: seed feed+diaper; timeline returns both in order (needs DB)

**Files likely touched:** `features/baby/server/timeline.ts`, baby GraphQL typeDefs/resolvers

**Scope:** M

**Dependencies:** Tasks 8–10

---

## Task 12: Timeline UI + env-minute auto sync

**Description:** Timeline UI. Auto sync: `refetchInterval` from `BABY_SYNC_INTERVAL_MINUTES` (public/safe exposure). Pause when tab hidden. Invalidate on mutate.

**Acceptance:**

- [x] Home “Timeline” opens day view
- [x] Interval follows env minutes (sensible default if unset, e.g. 1)
- [x] Hidden tab does not poll
- [x] Empty day = empty state, not error
- [x] Skeleton parity

**Tests (TDD — what turns red first):**

- [x] Unit: parse env minutes → ms interval; invalid/missing → default
- [x] Hook/component: interval `false` when document hidden

**Files likely touched:** timeline components, `lib/baby-sync-interval.ts`, query options, `.env.example`

**Scope:** M

**Dependencies:** Task 11

---

### Checkpoint E (after Tasks 11–12)

- [ ] Two sessions: A logs, B sees within sync interval
- [x] Timeline empty/error/loading correct

---

## Task 13: Growth + meds GraphQL + forms

**Description:** CRUD growth_entry kinds via GraphQL; Growth section (not home hero).

**Acceptance:**

- [x] Each kind creatable/editable/deletable
- [x] Entries on timeline union

**Tests (TDD — what turns red first):**

- [x] Create weight with numeric value; reject empty kind

**Files likely touched:** growth service + resolvers + UI

**Scope:** M

**Dependencies:** Tasks 4, 11

---

## Task 14: Growth charts (visx)

**Description:** visx + `colorByIndex` for weight/height/head. Skeleton for chart card.

**Acceptance:**

- [x] At least weight (+ one more) chart from entries
- [x] Light/dark from theme palette; no hard-coded hex

**Tests (TDD — what turns red first):**

- [x] Unit: mapper entries → `{x,y}[]`

**Files likely touched:** `components/baby-growth-chart*.tsx`, growth page

**Scope:** M

**Dependencies:** Task 13

---

### Checkpoint F (after Tasks 13–14)

- [x] Growth/meds + charts usable
- [x] Web MVP feature-complete **without** Telegram
- [x] Lint/typecheck clean on baby paths

---

## Task 15: Shared Telegram module — `TELEGRAM_ENABLED` + no-op

**Description:** Add `lib/telegram/` with `isTelegramEnabled()` reading **`TELEGRAM_ENABLED`** (+ token/secret). Notify/send helpers no-op when off. Shared so other features can reuse later. Document in README / `.env.example` (no secrets).

**Acceptance:**

- [x] Flags off → notify no-ops, no throw
- [x] Webhook route returns `503` + `telegram_disabled` when off
- [x] No `BABY_TELEGRAM_ENABLED` flag

**Tests (TDD — what turns red first):**

- [x] Unit: enabled=false → notify resolves without fetch

**Files likely touched:** `lib/telegram/*`, `app/api/telegram/webhook/route.ts` stub, `.env.example`

**Scope:** S

**Dependencies:** none (prefer after Checkpoint F)

---

## Task 16: Baby Telegram link (shared chat = workspace)

**Description:** GraphQL link/unlink + settings UI for model B (`baby_telegram_link`). Uses shared telegram module.

**Acceptance:**

- [x] One chat per workspace; replace or conflict documented
- [x] Unlink clears
- [x] UI off when Telegram disabled

**Tests (TDD — what turns red first):**

- [x] Service/GraphQL: link → get chat id; unlink clears

**Files likely touched:** baby telegram link service + resolvers + settings UI

**Scope:** M

**Dependencies:** Tasks 3, 15

---

## Task 17: Telegram notify on care create

**Description:** After create feed/diaper/sleep/growth, if enabled + linked, post short summary to family chat via shared send helper.

**Acceptance:**

- [x] Flags off → no outbound calls
- [x] On + linked → one message
- [x] Token never logged

**Tests (TDD — what turns red first):**

- [x] Mocked fetch: enabled+linked → one Telegram API POST; disabled → zero

**Files likely touched:** baby notify hook, `lib/telegram/send.ts`, event services

**Scope:** M

**Dependencies:** Tasks 15–16, 8–10, 13

---

## Task 18: Telegram add-log commands

**Description:** Shared webhook verifies secret; baby command parser creates feed/diaper/sleep/health via same services (`source: telegram`).

**Acceptance:**

- [x] Valid secret + linked chat creates events
- [x] Wrong secret → 401/403
- [x] Unlinked chat ignored
- [ ] Rows show on web timeline (needs live bot + DB)

**Tests (TDD — what turns red first):**

- [ ] Bad secret rejected; good secret + feed command inserts feed (parser unit covered; insert needs DB)

**Files likely touched:** webhook handler, baby command parser, services

**Scope:** M

**Dependencies:** Tasks 16–17

---

### Checkpoint G (after Tasks 15–18)

- [x] Web MVP unchanged with Telegram off
- [ ] With test bot + group: notify + add-log work

---

## Task 19: Polish pass — a11y, skeletons, copy

**Description:** Skeleton parity, EN/VI gaps, feedback per DESIGN_GUIDE, no home clutter. Confirm deferred features absent.

**Acceptance:**

- [ ] `01-idea.md` MVP success criteria met
- [ ] Light/dark checked
- [x] No prediction/PDF/CRDT/public API in code

**Tests (TDD — what turns red first):**

- [x] Smoke RTL for home three actions if missing; fix failing tests

**Files likely touched:** baby UI/loading, message maps

**Scope:** M

**Dependencies:** Tasks 7–14; 15–18 if Telegram in cut

---

## Checkpoints (index)

| After | Tasks | Verify |
|-------|-------|--------|
| A | 1–2 | Nav + empty `/baby` |
| B | 3–4 | Schema/RLS + profile |
| C | 5–7 | GraphQL + i18n + home |
| D | 8–10 | Feed/diaper/sleep E2E |
| E | 11–12 | Timeline + env sync |
| F | 13–14 | Growth + charts (**web MVP shippable**) |
| G | 15–18 | Shared Telegram optional |

---

## Parallelization notes

- Task 6 (i18n) can parallel Tasks 3–5 after Task 2.
- Task 15 (Telegram shell) anytime after Task 3; prefer after Checkpoint F.
- Do not parallelize conflicting migrations.

---

## Out of scope (do not add tasks)

- Sleep prediction, reports/PDF, offline/CRDT, public API tokens, multi-baby, role matrices, SSE/WebSocket, new GraphQL/validation/i18n libraries, `BABY_TELEGRAM_ENABLED`.

---

## Env vars (Build)

| Var | Purpose |
|-----|---------|
| `BABY_SYNC_INTERVAL_MINUTES` | Client auto-refetch interval (minutes) |
| `TELEGRAM_ENABLED` | Shared Telegram on/off |
| `TELEGRAM_BOT_TOKEN` | Bot token |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook verify |

---

*Tasks updated 2026-09-06 for Gate 2 Option B + amendments.*
