# Tasks: Dedicated Baby Activities page

Ordered vertical slice: chrome → page shell → move ledger → Insights cleanup → Home link → e2e.

**Locked choices (human 2026-09-18):** Decision 1 Option 1 · Decision 2 Option 2 · Decision 3 Option 2 · Decision 4 Option 1.

## Task 1: Nav, header, i18n, icon for Activities

**Description:**
Wire Baby section findability: add **Activities** to `APP_SECTION_NAV.baby` next to Insights (`group: "review"`, href `/baby/activities`), new nav icon id + map, `resolveBabyAppHeader` with `activities.title` and **empty breadcrumbs**, EN/VI message keys (nav, title, empty, cue, load error).

**Acceptance:**

- [x] Section nav shows **Activities** beside Insights and routes to `/baby/activities`.
- [x] Header title resolves for `/baby/activities` with no breadcrumb trail.
- [x] EN + VI strings present for title/nav (cue keys may land in Task 5 if preferred, but nav/title required here).

**Tests (TDD — what turns red first):**

- [x] Unit: `app-section-nav` includes `/baby/activities` in review group next to Insights.
- [x] Unit: `resolveBabyAppHeader("/baby/activities")` → activities title key + `breadcrumbs: []`.

**Files likely touched:**
`lib/app-section-nav.ts`, `lib/app-section-nav.test.ts`, `lib/baby-app-header.ts`, `lib/baby-app-header.test.ts`, `components/icons/icon-baby-nav.tsx`, `components/money-section-tabs.tsx`, `messages/baby/en.ts`, `messages/baby/vi.ts`

**Scope:** M

**Dependencies:** none

**Security / UI checks:** No user-controlled hrefs in nav; icon-only hits stay ≥44px via existing tab primitives.

---

## Task 2: Thin Activities route + Spending-order skeleton

**Description:**
Add `app/(shell)/baby/activities/page.tsx` + `loading.tsx`. Introduce `BabyActivitiesPage` shell (may be stub) and `BabyActivitiesPageSkeleton` mirroring **filter toolbar → period chip → table rows** (Money/Insights filter skeleton style, sharp table placeholders). Use `SHELL_DASHBOARD_STACK` / design tokens.

**Acceptance:**

- [x] `/baby/activities` renders without crashing (stub or real page).
- [x] Loading UI order matches live stack (filters → period → ledger); zero obvious CLS vs final layout.
- [x] No summary stats / trend strip / care-type pill row.

**Tests (TDD — what turns red first):**

- [x] Unit or component test: Activities skeleton exports / structure asserts section order (filters → period → table) if project already tests skeletons this way; else mark manual + e2e later.
- [x] Route exists (smoke via page import or e2e in Task 7).

**Files likely touched:**
`app/(shell)/baby/activities/page.tsx`, `app/(shell)/baby/activities/loading.tsx`, `components/baby-activities-page.tsx` (stub ok), `components/baby-page-skeleton.tsx`

**Scope:** M

**Dependencies:** Task 1

**UI / mobile:** Skeleton radii `--radius-md` / `--radius-sm` per DESIGN_GUIDE; table region sharp; light/dark tokens only.

---

## Task 3: Move ledger onto Activities (fetch + sync without expand gate)

**Description:**
Implement `BabyActivitiesPage`: own draft/applied filters defaulting to `babyInsightsDefaultRange()` (last 7 days), `InsightsDateRangeFiltersBar` (Date + Care menus + Apply/Reset), `AnalyticsPeriodChip`, merged care+growth ledger, show-more, selection, `BabyActivitySelectionBar`, `BabyInsightsEditModal`. Enable **timeline + growth** queries on mount (no `activityOpen`). **Move** Insights timeline list glue with the log: interval sync truncate (`syncTimelineFirstPage` / `applyBabyTimelineSyncTruncate`), auto-page (`allowTimelineAutoFetch` / `BABY_TIMELINE_MAX_PAGES`), and load-more — Activities owns them on mount. Leave Insights without timeline list fetch (Task 4). Reuse helpers (`baby-insights-activity-log`, filters, list-visible, activity-edit, query-options / `BABY_*` query strings). Do **not** change Money.

**Acceptance:**

- [x] Opening Activities loads the list without expanding anything.
- [x] Chrome order: filters → period chip → ledger; FilterMenu style (not solid All/Feed/Sleep pills); ghost Edit; floating bar when selected.
- [x] Timeline sync poll + auto-page + load-more live on Activities (not left behind as dead Insights-only glue).
- [x] Filter, select, edit, delete care and growth rows; list refreshes; selection clears.
- [x] Empty = quiet muted copy; load error = Alert + retry; light + dark usable.

**Tests (TDD — what turns red first):**

- [x] Unit/component: mount Activities → timeline + growth queries **enabled** without expand (`activityOpen` absent); assert enable wiring or a tiny `babyActivitiesListsEnabled()` helper that returns `true`.
- [x] Unit/component: Insights render after move has **no** `baby-activity-log` (or assert timeline list query not enabled on dashboard) — fail first if log still mounts.
- [x] Unit/component: Activities chrome order filters → period chip → ledger; default applied range = last 7 days via `babyInsightsDefaultRange`.
- [x] Unit: default range helper still last 7 days (existing `babyInsightsDefaultRange` tests stay green).
- [x] Unit: merge/selection/edit helpers unchanged (existing tests); add only if extract breaks exports.
- [x] Unit/component or e2e: **`activities empty ledger is quiet`** — empty timeline+growth → muted empty copy; no destructive Alert.
- [x] Unit/component or e2e: **`activities load error shows alert and retry`** — timeline GraphQL failure → load-error Alert + retry; not empty-state copy (port Insights Activity-log load-error coverage).
- [x] Unit or e2e: **sync ownership** — Insights does not schedule timeline sync/auto-page; Activities owns list enable + sync/auto-page/load-more on mount.
**Files likely touched:**
`components/baby-activities-page.tsx`, `components/baby-insights-dashboard.tsx` (extract/remove log + sync), `components/baby-activity-selection-bar.tsx`, `components/baby-insights-edit-modal.tsx`, `lib/baby-insights-*.ts`, `lib/baby-query-options.ts`

**Scope:** M

**Dependencies:** Task 2

**Security:** Mutations only through existing GraphQL; never trust client for ownership; no `dangerouslySetInnerHTML` for row text; selected ids passed as opaque ids only.

**UI / mobile:** ≥44px Edit / bar actions; no hover-only; mobile card split if Money ledger does.

---

## Task 4: Insights — remove Activity log; growth on existing `moreOpen`

**Description:**
Strip Activity log panel / expand gate / timeline list fetch / sync / auto-page from `BabyInsightsDashboard` (`activityOpen`, `listsEnabled`, timeline infinite query, sync interval truncate, timeline auto-page — all gone). Keep charts / KPIs / More insights. Per **Decision 2 Option 2**, set Insights **growth** enable to existing **`moreOpen`** (`data-testid="baby-more-insights"`) — not always-on; not a new parallel flag; not the old `activityOpen`. Collapsed More insights may show growth empty/skeleton until expand — intentional. After timeline off, care counts / care KPIs are **series-only** (`babyInsightsSeries`); do not keep `timelineItems` fallback. Update Insights skeleton to drop collapsed Activity log block.

**Acceptance:**

- [x] Insights has no Activity log UI (`baby-activity-log` gone).
- [x] Growth fetch runs when `moreOpen` is true; does not depend on removed `activityOpen`.
- [x] Timeline list query, sync truncate, and timeline auto-page stay **off** Insights.
- [x] Care KPI / care-count paths do not fall back to timeline list (series-only).
- [x] Insights filters remain independent of Activities filters.
- [x] Insights loading skeleton no longer mirrors collapsed Activity log.

**Tests (TDD — what turns red first):**

- [x] Unit: **`growthEnabled follows moreOpen only`** — `moreOpen: false → growth off`; `moreOpen: true → growth on`; no `activityOpen` / always-true / new flag name.
- [x] Unit: **`preferSeriesInsightCountKpis` series-only** — replace “falls back to timeline…”; missing series does **not** count from `timelineFallback`.
- [x] Update any unit tests that assumed Activity log markup on Insights.

**Files likely touched:**
`components/baby-insights-dashboard.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/insights/loading.tsx`

**Scope:** M

**Dependencies:** Task 3

**Security:** No change to authz model; ensure removing UI does not leave dead client paths that mutate without UI confirmation.

---

## Task 5: Insights → Activities cue

**Description:**
Add quiet one-line cue under Insights heading (before charts): e.g. “Looking for past entries? **Open Activities**” linking to `/baby/activities`. Muted text + teal link; not an alert banner. i18n EN/VI.

**Acceptance:**

- [x] Cue visible on Insights without expand.
- [x] Link goes to `/baby/activities`.
- [x] Matches 01b / ui-ref intent (one-line, not banner).

**Tests (TDD — what turns red first):**

- [x] Component or e2e (Task 7): Insights shows cue link with href `/baby/activities`.

**Files likely touched:**
`components/baby-insights-dashboard.tsx`, `messages/baby/en.ts`, `messages/baby/vi.ts`, optionally Insights skeleton thin cue placeholder

**Scope:** S

**Dependencies:** Task 4

**UI:** Semantic tokens; focusable link; skeleton parity if cue always present.

---

## Task 6: Home pending link only (timeline redirect unchanged)

**Description:**
Per **Decision 3 Option 2**, **do not** change `next.config.ts` timeline redirects — `/baby/timeline` stays → Insights; `/baby/growth` stays → Insights. Update `baby-home.tsx` pending “too old” link to `/baby/activities` (adjust copy keys if needed so it does not say “timeline” if that confuses).

**Acceptance:**

- [x] Home pending link opens `/baby/activities`.
- [x] `/baby/timeline` still redirects to Insights (unchanged).
- [x] `/baby/growth` still redirects to Insights (unchanged).

**Tests (TDD — what turns red first):**

- [x] Unit/component (`baby-home`): too-old pending markup `href="/baby/activities"` (copy no longer implies timeline-only if keys change).
- [x] Do **not** rewrite timeline→Activities redirect asserts; leave existing timeline→Insights coverage green.

**Files likely touched:**
`components/baby-home.tsx`, related tests, `messages/baby/en.ts` / `vi.ts` if copy changes — **not** `next.config.ts` this pass

**Scope:** S

**Dependencies:** Task 1 (route exists); better after Task 2

**Security:** Fixed destination `/baby/activities` only; no open redirect from query params.

---

## Task 7: E2E — Activities path, cue, Insights log gone

**Description:**
Retarget `e2e/baby-care.spec.ts` Activity log flows from Insights expand to `/baby/activities`. Assert Spending-like chrome (filters + ledger), **require rewrite** of select → Edit/Delete and partial multi-delete settle onto Activities (do not delete without replacement). Insights has **no** activity log panel; Insights cue present. Cover empty quiet + load-error/retry on Activities if not fully covered by unit. Prefer unit for `moreOpen` growth gate; optional e2e More insights expand only if unit cannot see wiring. Do **not** assert timeline→Activities redirect.

**Acceptance:**

- [x] E2E covers open Activities → filter/list → select → Edit and/or Delete (prior Insights log coverage rewritten, not soft-skipped).
- [x] E2E covers partial multi-delete honesty on Activities (rewrite existing Insights selection-bar partial-fail coverage).
- [x] E2E asserts Insights Activity log absent + cue to Activities present.
- [x] Empty and/or load-error paths covered on Activities (unit or e2e).
- [x] Old Insights Activity-log expand tests removed or rewritten (no skipped silent holes).
- [x] Home pending → Activities covered if practical; timeline redirect remains Insights if already covered.

**Tests (TDD — what turns red first):**

- [x] Rewrite failing Insights `baby-activity-log` expand tests first (select/edit/delete + partial delete + load-error); watch them fail against new UI; implement until green (with Tasks 3–5).
- [x] Fail Build if mutation/selection e2e scenarios are deleted without Activities replacements.

**Files likely touched:**
`e2e/baby-care.spec.ts` (+ fixtures if any)

**Scope:** M

**Dependencies:** Tasks 3–6

**UI / a11y:** Prefer role/label selectors stable with ghost Edit + selection bar.

---

## Checkpoints

After Tasks 1–2:

- [x] Nav opens Activities route; loading skeleton order looks right in light + dark.

After Tasks 3–5:

- [x] Manual: find → edit/delete on Activities; cue works; no dual log; More insights expand loads growth (Decision 2 Option 2).
- [x] Focused unit tests for header/nav/enable helpers pass.

After Tasks 6–7:

- [x] Home link → Activities verified; timeline redirect still Insights.
- [x] E2E suite green for Activities + Insights cue + no Insights log.
- [x] Confirm ui-refs still match at Gate B (filters → period → ledger; FilterMenu; ghost Edit; floating bar).
