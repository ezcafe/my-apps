# TDD test-case review: baby-activities-page

**Result:** needs more tests → Fix ask folded into `04-tasks.md` (Tasks 3, 4, 6, 7) before Gate B
**Round:** 1
**Updated:** 2026-09-18

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Unit: `APP_SECTION_NAV.baby` has `/baby/activities` in review group next to Insights | yes |
| 1 | real | Unit: `resolveBabyAppHeader("/baby/activities")` → `activities.title` + `breadcrumbs: []` (D4) | yes |
| 2 | real | Skeleton / route order filters → period → table | partial |
| 3 | real | Activities mounts with timeline + growth lists enabled (no expand / no `activityOpen`) | yes |
| 3 | real | Insights no longer mounts `baby-activity-log` / timeline list not enabled | yes |
| 3 | real | Chrome order filters → period → ledger; default range = `babyInsightsDefaultRange` (7 days) | yes |
| 3 | real | Existing merge / selection / edit / default-range helper suites stay green | yes |
| 3 | edge | Sync poll / auto-page / load-more owned by Activities (not left on Insights) | partial |
| 3 | real | Empty ledger muted copy; load fail Alert + retry | no |
| 4 | real | Growth enable = existing `moreOpen` (not `activityOpen`, not always-on, not a new flag) | yes |
| 4 | edge | Growth **off** when `moreOpen` is false (collapsed More insights) | partial |
| 4 | edge | Care KPI / counts series-only — no `timelineItems` / `listsEnabled` fallback | partial |
| 4 | real | Update units that assumed Insights Activity log markup | yes |
| 5 | real | Insights cue link href `/baby/activities` | yes |
| 6 | real | Home pending “too old” href → `/baby/activities` (D3) | yes |
| 6 | real | Keep existing `/baby/timeline` → Insights redirect coverage (do not retarget) | yes |
| 7 | real | E2E: open Activities → filter/list → edit or delete (rewrite off Insights expand) | partial |
| 7 | real | E2E: Insights log gone + cue present | yes |
| 7 | edge | E2E: partial multi-delete / load-error paths moved to Activities | partial |
| 7 | edge | Optional More insights → growth charts (D2) | partial |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Critical | 3 + 7 | Activities **load error + retry** (user-visible failure today on Insights log) has no red-first plan; Task 7 soft “as practical” can drop it | Unit or e2e `activities shows load error and retry`: force timeline GraphQL error on `/baby/activities` → destructive Alert (unified load-error copy) + retry; assert **not** muted empty copy. Rewrite existing Insights panel load-error e2e onto Activities. |
| Critical | 3 | **Empty** Activities ledger (quiet muted empty) not in TDD list | Unit/component or e2e `activities empty range is quiet non-error`: default range, empty timeline+growth → muted empty string; no destructive Alert. |
| Major | 4 | Series-only KPIs: existing `preferSeriesInsightCountKpis` still has **“falls back to timeline when series counts missing”** — fights Chosen design | Flip/replace that unit: when `seriesCounts` missing, counts stay empty/zero (or series path only); **no** `timelineFallback` branch used by Insights after move. Name: `preferSeriesInsightCountKpis does not use timeline fallback`. |
| Major | 3 + 4 | Sync / auto-page ownership soft (“prefer unit… else e2e”) — design challenge #7 if sync stays on Insights or never moves | Unit: Insights helper/wiring — timeline list + `syncTimelineFirstPage` / auto-page **disabled** without log. Activities: lists enabled on mount (already planned). If sync stays in-component, e2e must prove Activities list refreshes after first-page sync (or assert Insights no longer schedules timeline sync). |
| Major | 4 | Growth gate boundary: plan says `moreOpen` but not explicit **false → off** | Same unit as growth enable: `babyInsightsGrowthEnabled({ moreOpen: false }) === false` and `true` when `moreOpen: true`; assert no `activityOpen` param. |
| Major | 7 | Select → Edit / Delete (+ partial multi-delete honesty) only “as practical” — those e2e already exist on Insights expand | Require rewrite of existing select/edit/delete and partial-fail selection-bar e2e onto `/baby/activities` (same asserts, new entry URL). Do not delete without replacement. |
| Enhancement | 2 | Skeleton section-order test optional / manual | Keep manual Gate B check; e2e chrome order on Activities is enough if Task 3 chrome assert ships. |
| Enhancement | 7 | More insights expands → growth charts (D2) marked optional | Prefer one e2e or unit already covered by Task 4 `moreOpen` helper; optional e2e only if unit cannot see enable wiring. |

## Real scenarios checked

- Happy path: Nav + empty crumbs; Activities lists on mount; Insights log removed; cue; Home → Activities; e2e path rewrite — **mostly planned**.
- User-visible failures: Load error + retry on Activities — **missing** from planned TDD (Critical). Partial multi-delete — **at risk** if e2e soft-skipped.
- Empty / loading / permission: Empty muted ledger — **missing**. Skeleton — partial/manual. Auth/workspace — reuse existing Baby gate (no new API; OK to skip new permission cases).

## Edge scenarios checked

- Boundaries / invalid input: Default 7-day range + growth off when More insights collapsed — **partial** (need explicit `moreOpen: false`). Series timeline fallback must be **removed/tested**.
- Concurrency / double-submit / idempotency: Multi-delete partial settle — covered today in e2e; must **move** with Task 7, not drop.
- Offline / partial data / race: Timeline sync truncate / auto-page move — **partial**; needs a hard ownership assert (unit or e2e).

## Fix ask for Build

Concrete tests to add or strengthen (few strong ones):

1. **Task 3 / 7 — `activities load error shows alert and retry`:** On `/baby/activities`, mock timeline failure → one destructive load-error message + retry control; not empty-state copy. Port the current Insights Activity-log load-error e2e.
2. **Task 3 / 7 — `activities empty ledger is quiet`:** Empty timeline+growth for default range → muted empty; no error Alert.
3. **Task 4 — `preferSeriesInsightCountKpis` (or Insights KPI path) series-only:** Replace “falls back to timeline…” with assert that missing series does **not** count from `timelineFallback` (align with Chosen: series-only care KPIs).
4. **Task 4 — `growthEnabled follows moreOpen only`:** Helper or enable wiring: `moreOpen false → growth query disabled`; `moreOpen true → enabled`; no `activityOpen` / always-true / new flag name.
5. **Task 3 / 4 — sync ownership:** Assert Insights does **not** enable timeline list sync/auto-page after move; Activities owns list enable on mount (pair with planned enable unit).
6. **Task 7 — keep ledger mutation coverage:** Rewrite Insights expand e2e for select → Edit/Delete and partial multi-delete onto Activities; fail the build if those scenarios are only deleted.
7. **Task 6 — strengthen Home unit:** In `baby-home` too-old pending markup, assert `href="/baby/activities"` (and copy no longer implies timeline-only), not only link text.

Fold into `04-tasks.md` Task 3, 4, 6, and 7 TDD bullets before Gate B when practical.

## Round notes

- Design-review `03a` Result **clean**; human locks honored in this review: D1 dedicated page, D2 `moreOpen` growth, D3 Home-only retarget (timeline → Insights stays), D4 empty crumbs.
- Skimmed `lib/app-section-nav.test.ts`, `lib/baby-app-header.test.ts`, `components/baby-home.test.ts` (too-old still “Open the timeline”), `lib/baby-insights-kpis.test.ts` (timeline fallback still tested), and `e2e/baby-care.spec.ts` (many `baby-activity-log` expand flows + load-error + partial delete + timeline→Insights redirect).
- Chrome / nav / cue / enable-on-mount plans are strong. Gaps are the **user-visible empty + error** paths, **series-only KPI** flip, **sync ownership**, and **hard** e2e rewrite of mutation flows — not a longer weak list.
- Result **needs more tests** until Fix ask items 1–6 are in `04-tasks.md` (or equivalent red-first cases). Item 7 is Major-leaning but small.
- **Parent fold (2026-09-18):** Fix ask 1–7 folded into `04-tasks.md` Tasks 3, 4, 6, 7 TDD/acceptance. Ready for Gate B (Build must implement those red-first cases).
)
