# Tasks: Baby log UX, vaccine, Insights charts

Ordered for TDD. **Chosen design: Option A** (Gate 2) — client care-count + thin timeline fix + Start stay / End home + vaccine CRUD.

**Navigate nuance (Gate 2):** Start → stay on page; End (complete session) → redirect `/baby`.

No XL tasks. Checkpoints every 2–3 tasks.

---

## Task 1: Stay vs home navigate helper

**Description:** Extend `lib/baby-care-save-navigate.ts` so callers pass `afterSave: "stay" | "home"` (default `"home"`). Feed/sleep **Start** uses stay; feed/sleep **End** / complete-session save uses home; diaper keeps home. Keep failure paths from navigating.

**Acceptance criteria:**

- [x] `afterSave: "stay"` runs mutate + onSuccess and does **not** `router.push`
- [x] `afterSave: "home"` (or default) still pushes `/baby`
- [x] Rejected mutate / onSuccess never navigates

**Tests (TDD — what turns red first):**

- [x] Unit: `lib/baby-care-save-navigate.test.ts` — stay branch asserts no push; home branch asserts push; error path no push

**Files likely touched:** `lib/baby-care-save-navigate.ts`, `lib/baby-care-save-navigate.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Compact duration + feed/sleep timeline labels

**Description:** Add `formatBabyDurationCompact` (`12m` / `1h 5m`). Update `careSummary` (and/or Insights row helpers) so feed shows **Feed (Breast L/R)** (and clear formula/pump), sleep/feed show stop + duration using display rules in `03-design.md` (feed: `occurredAt` + `durationSec`; sleep: `endedAt − occurredAt`).

**Acceptance criteria:**

- [x] `65` → `1h 5m`; `12` → `12m`; `0` handled sensibly
- [x] Breast L/R labels match success criteria
- [x] Missing duration → no fake duration fragment

**Tests (TDD — what turns red first):**

- [x] Unit: new or extended duration helper test fails until format exists
- [x] Unit: `features/baby/server/timeline.test.ts` — feed breast + durationSec; sleep closed duration; open sleep no duration

**Files likely touched:** `lib/baby-format-duration.ts` (or similar), `features/baby/server/timeline.ts`, `features/baby/server/timeline.test.ts`, `messages/baby/en.ts`, `messages/baby/vi.ts` if summary strings move

**Scope:** M

**Dependencies:** none

---

## Task 3: Feed form Start stay / End home + Start disable + 3AM eye flow

**Description:** Wire feed **Start** to stay on page (disable Start, timer runs). Wire feed **End** / method save that completes the session to `afterSave: "home"`. Reshape layout for 3AM eye flow. Update feed `loading.tsx` / skeleton parity.

**Acceptance criteria:**

- [x] After Start, user stays on `/baby/feed`; Start disabled; timer visible/running
- [x] Successful End / method save redirects to `/baby`
- [x] Primary actions first; optional detail below; skeleton matches
- [x] Light/dark + skeleton order match live form

**Tests (TDD — what turns red first):**

- [x] Unit: navigate helper stay/home already green from Task 1; add form-state helper tests if timer enable/disable extracted
- [x] E2E update deferred to Task 16 — Start stays; End lands home

**Files likely touched:** `components/baby-feed-form.tsx`, `app/(shell)/baby/feed/loading.tsx`, `components/baby-page-skeleton.tsx` if shared

**Scope:** M

**Dependencies:** Task 1

---

## Checkpoint A

- [x] Navigate stay/home unit tests green
- [x] Duration + timeline label unit tests green
- [x] Feed form compiles; Start stay / End home ready for later e2e

---

## Task 4: Sleep form Start stay / End home + Start disable while open

**Description:** Sleep **Start** stays on page; disable Start while an open sleep exists. Sleep **End** uses `afterSave: "home"`. 3AM eye flow + sleep loading skeleton parity.

**Acceptance criteria:**

- [x] Start success stays on `/baby/sleep`; Start disabled while open sleep present
- [x] End success redirects to `/baby`
- [x] Skeleton mirrors new layout

**Tests (TDD — what turns red first):**

- [x] Unit: open-sleep → Start disabled helper if extracted; else cover via existing sleep/server tests + e2e Task 16
- [x] Navigate stay/home already covered

**Files likely touched:** `components/baby-sleep-form.tsx`, `app/(shell)/baby/sleep/loading.tsx`

**Scope:** M

**Dependencies:** Task 1

---

## Task 5: Diaper still navigates home (control)

**Description:** Confirm diaper still uses `afterSave: "home"` (or default). No UX change required beyond helper API update.

**Acceptance criteria:**

- [x] Diaper save still `router.push("/baby")` on success
- [x] No stay behavior on diaper

**Tests (TDD — what turns red first):**

- [x] Unit or e2e: diaper path still home — extend navigate caller test or keep e2e assert home for diaper only

**Files likely touched:** `components/baby-diaper-form.tsx`

**Scope:** S

**Dependencies:** Task 1

---

## Checkpoint B

- [x] Feed/sleep Start stay / End home wired; diaper home
- [x] Start disable rules in place for feed timer + open sleep
- [x] Form skeletons updated

---

## Task 6: Vaccine schema + migration

**Description:** Add `baby_vaccine_dose` enum and `baby_vaccine_entry` table in Drizzle + SQL migration + journal entry. Mirror growth ownership columns. Schema unit smoke as existing baby schema tests.

**Acceptance criteria:**

- [x] Table columns match `03-design.md` DB contract
- [x] Indexes on `(workspace_id, administered_at)` and `(baby_id, administered_at)`
- [x] Migration journal updated

**Tests (TDD — what turns red first):**

- [x] Unit: `db/schema/baby.test.ts` — vaccine table/enum exported / shape asserts fail until added

**Files likely touched:** `db/schema/baby.ts`, `db/schema/baby.test.ts`, `db/migrations/00xx_baby_vaccine.sql`, `db/migrations/meta/_journal.json`, `db/schema/index.ts` if needed

**Scope:** M

**Dependencies:** none

---

## Task 7: Vaccine validators + server service

**Description:** Zod create/list/update/delete schemas; `features/baby/server/vaccines.ts` (or similar) with workspace-scoped CRUD. Required name + dose `first`|`second`.

**Acceptance criteria:**

- [x] Empty name / bad dose rejected
- [x] List supports optional from/to + cursor/limit
- [x] Update/delete NOT_FOUND cross-workspace

**Tests (TDD — what turns red first):**

- [x] Unit: `lib/validators/baby.test.ts` — vaccine schemas
- [x] Unit: `features/baby/server/vaccines.test.ts` — create/list/delete

**Files likely touched:** `lib/validators/baby.ts`, `lib/validators/baby.test.ts`, `features/baby/server/vaccines.ts`, `features/baby/server/vaccines.test.ts`

**Scope:** M

**Dependencies:** Task 6

---

## Task 8: Vaccine GraphQL + client query options

**Description:** Extend typeDefs/resolvers; wire `lib/api-baby.ts` / `lib/baby-query-options.ts` keys + invalidation for vaccine list/create.

**Acceptance criteria:**

- [x] `babyVaccines` + `createBabyVaccine` (+ update/delete if in design) documented
- [x] Query keys include from/to/cursor so cache is safe
- [x] Yoga smoke still passes

**Tests (TDD — what turns red first):**

- [x] Unit: query-options tests for vaccine keys
- [x] Extend `lib/graphql/baby-yoga.test.ts` if pattern exists

**Files likely touched:** `lib/graphql/baby-typeDefs.ts`, `lib/graphql/baby-resolvers.ts`, `lib/api-baby.ts`, `lib/baby-query-options.ts`, `lib/baby-query-options.test.ts`, `lib/graphql/baby-yoga.test.ts`

**Scope:** M

**Dependencies:** Task 7

---

## Checkpoint C

- [x] Vaccine DB + API + client keys green
- [x] No UI yet for vaccines (or stub only)

---

## Task 9: Vaccine page UI + route + skeleton

**Description:** Add `/baby/vaccines` page: create form (name, dose first/second) + list. Match DESIGN_GUIDE; loading skeleton with CLS parity.

**Acceptance criteria:**

- [x] User can create and see vaccines in list
- [x] Required fields enforced in UI
- [x] `loading.tsx` + skeleton match form/list order

**Tests (TDD — what turns red first):**

- [x] Unit: list empty/error helpers if extracted (`lib/baby-vaccine-list-state.ts` pattern like measure)
- [x] E2E create/list in Task 16

**Files likely touched:** `app/(shell)/baby/vaccines/page.tsx`, `loading.tsx`, `components/baby-vaccines-page.tsx` (new), `components/baby-page-skeleton.tsx`

**Scope:** M

**Dependencies:** Task 8

---

## Task 10: Nav + header + i18n for vaccines + duration/chart strings

**Description:** Add hamburger item `/baby/vaccines`; header title map; EN/VI strings for vaccine, duration, chart empties, nav labels. Icon ids may still be temporary until Task 14.

**Acceptance criteria:**

- [x] Nav includes Vaccines capture item
- [x] Header resolves `/baby/vaccines`
- [x] EN + VI keys present

**Tests (TDD — what turns red first):**

- [x] `lib/app-section-nav.test.ts` — vaccines href present
- [x] `lib/baby-app-header.test.ts` — vaccines title
- [x] `lib/baby-i18n.test.ts` if keyed

**Files likely touched:** `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, `messages/baby/en.ts`, `messages/baby/vi.ts`, matching tests

**Scope:** M

**Dependencies:** Task 9 (or parallel after route path known)

---

## Checkpoint D

- [x] Vaccine vertical slice usable in UI
- [x] Nav/header/i18n green

---

## Task 11: Shared growth chip bar on Measure

**Description:** Replace Measure kind `<Select>` with the same growth kind chip model Insights uses (`lib/baby-insights-filters` or extracted shared helper). Update Measure skeleton.

**Acceptance criteria:**

- [x] Weight / Height / Head / Temperature / Medication chips on Measure
- [x] Selected kind drives create + list filter same as today’s select
- [x] Skeleton chip row parity

**Tests (TDD — what turns red first):**

- [x] Unit: shared chip toggle helper tests (reuse Insights filter tests or extract)
- [x] `lib/baby-measure-list-state.test.ts` if filter wiring changes

**Files likely touched:** `components/baby-measure-page.tsx`, `lib/baby-insights-filters.ts` or new shared module, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/measure/loading.tsx`

**Scope:** M

**Dependencies:** none (Insights chips already exist)

---

## Task 12: Insights timeline row stop time + duration display

**Description:** Insights timeline UI shows stop time only (per display rules) and compact duration beside feed/sleep rows; keep diaper/growth sensible.

**Acceptance criteria:**

- [x] Feed/sleep rows show stop clock + `12m` / `1h 5m` when known
- [x] No long `toLocaleString` dump as the primary time if product wants stop-only (match design)
- [x] Skeleton unchanged unless row layout shifts

**Tests (TDD — what turns red first):**

- [x] Unit: row display helper tests (stop + duration from timeline item)
- [x] Relies on Task 2 server summary/duration

**Files likely touched:** `components/baby-insights-dashboard.tsx`, small helper + test under `lib/`

**Scope:** M

**Dependencies:** Task 2

---

## Task 13: Insights Money-style chart cards (growth + care-count)

**Description:** Wrap/replace growth charts with Money chart-card chrome. Plot selected numeric growth kinds (not only weight/height). Add care-count-over-time card via `aggregateCareCountsByDay` from loaded timeline (Option A). Honest empty states; no fake metrics. Update Insights skeleton for card grid.

**Acceptance criteria:**

- [x] Chart cards use shared analytics chrome / `CHART_CARD_*` heights
- [x] Head/temp appear when numeric data + chip selected; medication without numbers skipped/empty
- [x] Care-count card reflects real care types in range
- [x] Skeleton grid matches card order

**Tests (TDD — what turns red first):**

- [x] Unit: `aggregateCareCountsByDay` tests
- [x] Unit: growth series for head/temp (extend `lib/baby-growth-series.test.ts`)
- [x] E2E chart region in Task 16

**Files likely touched:** `components/baby-insights-dashboard.tsx`, `components/baby-growth-chart.tsx`, `lib/baby-growth-series.ts`, new `lib/baby-care-counts.ts` + test, `components/baby-page-skeleton.tsx`, maybe thin card under `components/baby-insights-chart-cards/`

**Scope:** M

**Dependencies:** Task 12 optional; can parallel after timeline data shape known

---

## Checkpoint E

- [x] Measure chips live
- [x] Insights timeline copy + chart cards green in unit tests
- [x] Skeletons updated for Insights/Measure

---

## Task 14: Dedicated Baby hamburger SVGs

**Description:** Add dedicated SVG icons for **all** Baby hamburger items (home, insights, feed, sleep, diaper, measure, vaccines, settings as needed). Extend `AppSectionTabIconId` with Baby-specific ids; map in `money-section-tabs` (or extract icon module). Do not reuse Money `bills`/`import`/`spending` for care jobs.

**Acceptance criteria:**

- [x] Each Baby nav item has a job-matching dedicated SVG
- [x] Vaccine has its own icon
- [x] Light/dark readable (currentColor stroke)

**Tests (TDD — what turns red first):**

- [x] `lib/app-section-nav.test.ts` — Baby items use new icon ids (not `bills`/`import` for sleep/diaper)

**Files likely touched:** `components/icons/*`, `lib/app-section-nav.ts`, `components/money-section-tabs.tsx`, tests

**Scope:** M

**Dependencies:** Task 10 (vaccines nav item exists)

---

## Task 15: i18n sweep + Insights growth chips parity check

**Description:** Final EN/VI pass for any missing strings (charts, vaccine dose labels, feed Start disabled, empty chart). Confirm Insights growth chip bar still present (no regression).

**Acceptance criteria:**

- [x] No raw English keys on changed surfaces in VI locale
- [x] Insights + Measure both expose growth kind chips

**Tests (TDD — what turns red first):**

- [x] `lib/baby-i18n.test.ts` / message key presence tests
- [x] Insights filter tests still green

**Files likely touched:** `messages/baby/en.ts`, `messages/baby/vi.ts`, filter tests

**Scope:** S

**Dependencies:** Tasks 3–4, 9–14

---

## Task 16: E2E updates (stay, vaccine, chips, charts, icons)

**Description:** Update Playwright: feed/sleep **Start stays** on log page; **End lands home**; diaper still home; vaccine create/list; Measure chips; Insights chart regions; nav vaccine item. Align with design success criteria.

**Acceptance criteria:**

- [x] Feed/sleep e2e no longer require `/baby` home after save
- [x] Vaccine happy path covered
- [x] Measure chips + Insights charts asserted at region level
- [x] Specs pass locally with project e2e command

**Tests (TDD — what turns red first):**

- [x] `e2e/baby-care.spec.ts` — Start stays / End home asserts (red first), then forms; add vaccine/chart/measure cases

**Files likely touched:** `e2e/baby-care.spec.ts`

**Scope:** M

**Dependencies:** Tasks 3–5, 9–14

---

## Checkpoint F (ready for review/test workflows)

- [x] All unit suites for this slug green
- [x] E2E updated and green for Start stay / End home, vaccine, chips, charts
- [x] DESIGN_GUIDE + skeleton parity on changed surfaces
- [x] Non-goals untouched (no schedule engine, no Telegram vaccine)

---

## Parallelization notes

| Safe parallel | Sequential |
|---------------|------------|
| Task 2 vs Task 1 | Task 3–5 after Task 1 |
| Task 6–8 vaccine API vs Task 1–5 UX | Task 9 after Task 8 |
| Task 11 Measure chips vs vaccine UI | Task 13 after growth series helpers |
| Task 14 icons after Task 10 nav | Task 16 last |

## Option B swap (only if Gate 2 picks B)

- Replace Task 13 aggregation with server `babyCareCounts` validator + service + GraphQL + client.
- Add task: structured `BabyTimelineItem` fields (`label`, `stopAt`, `durationCompact`) before Insights row UI.
