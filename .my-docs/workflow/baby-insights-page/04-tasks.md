# Tasks: Baby Insights page (merge Growth + Timeline)

Ordered for TDD. **Chosen design: Option A** (Gate 2 — one shared filter chrome: date + all chips Apply together). Tasks 7–9 use **shared** chip placement in one toolbar (not section-local Option B).

No XL tasks. Checkpoints every 2–3 tasks.

---

## Task 1: Growth list `from` / `to` (validator + server)

**Description:** Extend `babyGrowthListInputSchema` and `listBabyGrowthEntries` so optional `from` / `to` filter `recordedAt`. Keep existing `kind` / cursor / limit. Reject inverted ranges.

**Acceptance:**

- [ ] Schema accepts optional ISO datetimes with offset for `from` / `to`
- [ ] Server applies `gte` / `lte` on `recordedAt` when set
- [ ] Bad cursor / bad kind / `from > to` fail validation as today-style errors

**Tests (TDD — what turns red first):**

- [ ] Unit: `lib/validators/baby.test.ts` — from/to parse + from>to reject
- [ ] Unit: `features/baby/server/growth.test.ts` — range filter returns only in-window rows

**Files likely touched:** `lib/validators/baby.ts`, `lib/validators/baby.test.ts`, `features/baby/server/growth.ts`, `features/baby/server/growth.test.ts`

**Scope:** M

**Dependencies:** none

---

## Task 2: GraphQL + client query options for growth range

**Description:** Add `from` / `to` args to `babyGrowthEntries` in typeDefs, resolvers wiring, and `lib/baby-query-options.ts` keys/fetchers. Add `babyInsightsDefaultRange()` (this calendar month) helper with tests.

**Acceptance:**

- [ ] GraphQL query documents `from` / `to` on `babyGrowthEntries`
- [ ] Client query key includes from/to/kind so cache does not collide
- [ ] Default Insights range matches Money “this month” shape (local calendar)

**Tests (TDD — what turns red first):**

- [ ] Unit: growth query options / default range helper tests fail until from/to wired
- [ ] Existing baby GraphQL yoga smoke still passes (extend if needed)

**Files likely touched:** `lib/graphql/baby-typeDefs.ts`, `lib/graphql/baby-resolvers.ts`, `lib/baby-query-options.ts`, `lib/baby-query-options.test.ts`, new or extended default-range helper + test

**Scope:** M

**Dependencies:** Task 1

---

## Checkpoint A

- [ ] Growth range unit tests green
- [ ] Query options include from/to
- [ ] No UI yet — API slice only

---

## Task 3: Nav, header, i18n for Insights + Measure

**Description:** Replace Timeline + Growth nav with one Insights item; add Measure under capture; update header path→title map; add EN/VI strings (`insights.*`, `measure.*`, nav labels).

**Acceptance:**

- [ ] Section nav: Home, Insights, Feed, Sleep, Diaper, Measure, Settings
- [ ] `/baby/insights` and `/baby/measure` resolve header titles/crumbs
- [ ] EN + VI keys present for new labels

**Tests (TDD — what turns red first):**

- [ ] `lib/app-section-nav.test.ts` — Insights href; no growth/timeline items; Measure present
- [ ] `lib/baby-app-header.test.ts` — insights + measure paths

**Files likely touched:** `lib/app-section-nav.ts`, `lib/app-section-nav.test.ts`, `lib/baby-app-header.ts`, `lib/baby-app-header.test.ts`, `messages/baby/en.ts`, `messages/baby/vi.ts`, `lib/baby-i18n.test.ts` if keyed

**Scope:** M

**Dependencies:** none (can parallel Task 1–2)

---

## Task 4: Permanent redirects for old Baby URLs

**Description:** Add Money-style permanent redirects in `next.config.ts`: `/baby/growth` → `/baby/insights`, `/baby/timeline` → `/baby/insights`. No thin redirect pages unless leftovers appear.

**Acceptance:**

- [ ] Both old paths redirect permanently to Insights
- [ ] Documented next to existing `/money/analytics` redirects

**Tests (TDD — what turns red first):**

- [ ] Prefer config assertion test if the repo already tests redirects; else e2e later (Task 12) — note here and cover in e2e

**Files likely touched:** `next.config.ts`

**Scope:** S

**Dependencies:** none

---

## Checkpoint B

- [ ] Nav/header/i18n tests green
- [ ] Redirects present in config
- [ ] Ready for Measure + Insights UI

---

## Task 5: Measure capture route (form + recent list/edit)

**Description:** New `/baby/measure` page + loading skeleton. Move create/update/delete UI from current growth page onto Measure (form + recent list). Post-save navigate like other capture (`/baby`). Insights must not keep editors.

**Acceptance:**

- [ ] User can add / edit / delete a measurement on Measure
- [ ] Skeleton matches form + list order (CLS)
- [ ] Mutations invalidate baby growth/timeline query keys

**Tests (TDD — what turns red first):**

- [ ] Extract pure helpers if any (kind/value) with unit tests first
- [ ] E2E later (Task 12); unit-test any new navigate/invalidation helpers

**Files likely touched:** `app/(shell)/baby/measure/page.tsx`, `loading.tsx`, `components/baby-measure-form.tsx` (or similar), skeletons, pieces from `components/baby-growth-page.tsx`

**Scope:** M

**Dependencies:** Task 3

---

## Task 6: Home CTA for Measure

**Description:** Add “Log measurement” (or i18n equivalent) to `BABY_HOME_ACTIONS` / Home CTAs alongside feed/sleep/diaper.

**Acceptance:**

- [ ] Home shows Measure CTA → `/baby/measure`
- [ ] Unit list of home actions includes the new href

**Tests (TDD — what turns red first):**

- [ ] `lib/baby-home-actions.test.ts` fails until Measure action added

**Files likely touched:** `lib/baby-home-actions.ts`, `lib/baby-home-actions.test.ts`, `components/baby-home.tsx` if not data-driven, i18n keys

**Scope:** S

**Dependencies:** Task 5 (or Task 3 if CTA can land before page body)

---

## Checkpoint C

- [ ] Measure page loads; create works in manual smoke
- [ ] Home CTA present
- [ ] Growth write no longer required on old growth page (may still exist until Task 10)

---

## Task 7: Insights route shell — date bar, period chip, skeleton

**Description:** Add `/baby/insights` + loading skeleton. Build `BabyInsightsDashboard` shell: `SHELL_FULL_SPAN` + stack, `InsightsDateRangeFiltersBar`, Apply/Reset, period chip, default this month. Wire applied range state (draft vs applied) like Loans Insights.

**Acceptance:**

- [ ] Page renders filter chrome with this-month default
- [ ] Skeleton order: filters → chip → (KPI slot) → (growth slot) → (timeline slot)
- [ ] Apply/Reset update applied range without full remount bugs

**Tests (TDD — what turns red first):**

- [ ] Unit helper tests for default range / dirty Apply if extracted
- [ ] Manual: light/dark + no obvious CLS vs skeleton

**Files likely touched:** `app/(shell)/baby/insights/page.tsx`, `loading.tsx`, `components/baby-insights-dashboard.tsx`, `components/baby-page-skeleton.tsx` or insights skeleton beside money analytics skeletons

**Scope:** M

**Dependencies:** Task 2, Task 3

---

## Task 8: Insights KPIs + Growth section (kind chips + charts)

**Description:** KPI strip from applied-range data (honest counts / latest weight). Growth section under shared date: charts + read-only list filtered by **shared** growth kind chips (Apply with date). Fetch growth with `from`/`to`. View-only — link/CTA to Measure only.

**Acceptance:**

- [ ] KPIs update when Apply changes the date range
- [ ] Shared growth kind chips (applied with date) filter chart/list; care chips do not wipe charts
- [ ] No create/edit/delete controls on Insights
- [ ] Empty states when no data (not error)

**Tests (TDD — what turns red first):**

- [ ] Unit: KPI derive helper from sample timeline/growth items
- [ ] Unit: growth series with kind filter (reuse/extend `baby-growth-series` tests)

**Files likely touched:** `components/baby-insights-dashboard.tsx`, KPI helper module + test, chart reuse from `baby-growth-chart.tsx`, i18n

**Scope:** M

**Dependencies:** Task 7

---

## Task 9: Insights Timeline section (care chips + month list)

**Description:** Timeline under Growth: **shared** care-type chips (Apply with date) filter rows client-side; infinite query uses applied `from`/`to` (not today-only). Keep auto-sync refresh keyed to applied range. Flat list (no decorative cards per row).

**Acceptance:**

- [ ] Timeline respects applied month/range
- [ ] Care chips narrow visible types; growth section unaffected
- [ ] Load-more / sync still work for the applied range
- [ ] Skeleton list parity with live list density

**Tests (TDD — what turns red first):**

- [ ] Unit: pure filter of timeline items by care chip selection
- [ ] Extend any timeline query-option tests for non-today bounds if present

**Files likely touched:** `components/baby-insights-dashboard.tsx`, reuse/adapt `components/baby-timeline.tsx` pieces, filter helper + test

**Scope:** M

**Dependencies:** Task 7 (ideally after Task 8 for stack order)

---

## Checkpoint D

- [ ] Insights shows filters → shared chips → KPIs → growth → timeline
- [ ] Kind chips live in **shared toolbar** (Option A); Apply commits date + chips together
- [ ] View-only confirmed; Measure still writes

---

## Task 10: Remove old Growth + Timeline routes

**Description:** Delete `/baby/growth` and `/baby/timeline` page modules and obsolete components only used there (after Insights/Measure absorb view/write). Keep shared chart/helpers. Redirects from Task 4 remain.

**Acceptance:**

- [ ] No app routes left for growth/timeline pages
- [ ] Imports/tests updated; no dead nav hrefs
- [ ] Bookmarks hit Insights via permanent redirect

**Tests (TDD — what turns red first):**

- [ ] Nav/header tests already forbid old hrefs (Task 3)
- [ ] Fix any unit tests that imported deleted pages

**Files likely touched:** `app/(shell)/baby/growth/**`, `app/(shell)/baby/timeline/**`, `components/baby-growth-page.tsx` if fully replaced, cleanup refs

**Scope:** M

**Dependencies:** Task 5, Task 8, Task 9, Task 4

---

## Task 11: i18n polish + baby-i18n coverage for Insights/Measure copy

**Description:** Finish EN/VI strings for empty states, KPI labels, chip labels, period chip, Measure form. Ensure `t()` keys resolve in tests.

**Acceptance:**

- [ ] No raw English hardcoded in new UI (use baby i18n)
- [ ] VI keys mirror EN structure for new namespaces

**Tests (TDD — what turns red first):**

- [ ] `lib/baby-i18n.test.ts` or message key presence checks for new keys

**Files likely touched:** `messages/baby/en.ts`, `messages/baby/vi.ts`, related tests

**Scope:** S

**Dependencies:** Tasks 5–9

---

## Task 12: E2E — Insights, redirects, Measure add

**Description:** Update `e2e/baby-care.spec.ts`: open Insights via nav; assert growth+timeline content regions; hit `/baby/growth` and `/baby/timeline` and expect Insights; add measurement via Measure (replace old growth form path).

**Acceptance:**

- [ ] E2E covers Insights entry + redirect + Measure create happy path
- [ ] Old growth-nav assertions removed/replaced

**Tests (TDD — what turns red first):**

- [ ] Playwright specs fail on missing Insights nav / old growth menu until UI matches

**Files likely touched:** `e2e/baby-care.spec.ts`

**Scope:** M

**Dependencies:** Task 10, Task 6

---

## Checkpoint E (pre–Gate 3 / test workflow)

- [ ] Unit tests for validators, growth range, nav, header, KPI/filter helpers green
- [ ] Manual: light + dark Insights + Measure; skeleton parity spot-check
- [ ] E2E Insights + redirects + Measure green
- [ ] No growth editors on Insights

---

## Boundaries

| Tier | Rule |
|------|------|
| **Always** | Insights view-only; Measure owns growth writes; skeleton parity with live stack; DESIGN_GUIDE tokens |
| **Ask first** | New timeline `types` server filter; new KPI GraphQL; schema/index changes |
| **Never** | Money ledger filters on Baby; fake KPIs; keep `/baby/growth` or `/baby/timeline` as live pages |

---

*Tasks drafted 2026-09-06 for Gate 2. No production code in this stage.*
