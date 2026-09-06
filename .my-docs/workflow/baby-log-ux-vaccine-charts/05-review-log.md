# Review log: baby-log-ux-vaccine-charts

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `features/baby/server/vaccines.test.ts:68-76` | **Mock theater / missing service coverage.** The “documents NOT_FOUND for cross-workspace delete/update” case only re-asserts `createBabyVaccineSchema` rejects empty name. Task 7 required create/list/delete (+ NOT_FOUND). Unlike `care-events.test.ts` (memory deps), no test exercises `createBabyVaccine` / `listBabyVaccines` / `updateBabyVaccine` / `deleteBabyVaccine` ownership or cursor/range behavior. GraphQL still exposes update/delete. | fixed |
| Major | `lib/baby-care-session-state.test.ts:9-21` | **Mock theater.** `isBabyFeedStartDisabled` / `isBabySleepStartDisabled` are identity wrappers (`return timerRunning` / `return hasOpenSleep`). Tests assert `f(true) === true` and cannot catch Start-disable wiring failures (Checkpoint B). Only `isOpenSleepTimelineItem` has real behavior. | fixed |
| Major | `lib/baby-timeline-row-display.test.ts:34-47` (gap vs `lib/baby-timeline-row-display.ts:32-44`) | **Incomplete Gate 2 duration path.** `babyTimelineDurationLabel` is only tested via summary regex (`· 12m`). Payload `durationSec` and sleep `endedAt − at` fallbacks are untested; no negatives for open sleep / diaper / missing duration. Insights stop+duration can break while tests stay green on hand-written EN summaries. | fixed |
| Major | `e2e/baby-care.spec.ts:391-392` (+ form callers) | **Gate 2 navigate suite is auth-gated with no unit caller asserts.** Feed Start stay / method→home, sleep Start stay / End home, diaper home, vaccine create all sit under `test.skip(!hasAuthStorage, …)`. No unit test locks `afterSave: "stay"|"home"` on feed/sleep/diaper forms. Without `E2E_STORAGE_STATE`, CI can stay green while Gate 2 navigate regresses. | fixed |
| Enhancement | `lib/baby-query-options.test.ts:167-209` | Care/growth `invalidateBabyQueries` scopes are covered; **`vaccines` scope is not.** Create UI depends on `invalidateBabyQueries(..., "vaccines")` to refresh the list. | fixed |
| Enhancement | `lib/baby-timeline-row-display.test.ts:49-57` | `formatBabyTimelineStopClock` only checks `includes(":") \|\| /\d/.test(out)` — nearly always true; weak / locale-loose, not tied to “no year dump” failure mode. | fixed |
| Enhancement | `e2e/baby-care.spec.ts:456-462` | Insights charts assert only `baby-insights-charts` visibility. No check that care-count and growth chart cards (or honest empties) appear — thin vs Gate 2 chart cards. | fixed (care-count only; growth card reopened below) |
| Enhancement | `lib/graphql/baby-yoga.test.ts:136-161` | Schema smoke validates `babyVaccines` + `createBabyVaccine` only; omits `updateBabyVaccine` / `deleteBabyVaccine` document validation. | fixed |
| Enhancement | `e2e/baby-care.spec.ts:456-466` | **Incomplete prior Enhancement.** Care-count card is asserted (`baby-care-count-chart`); **growth chart cards are not** (`baby-growth-chart-card` exists in `components/baby-growth-chart.tsx:44` and mounts when growth kinds empty). Gate 2 still needs growth card (or honest empty) coverage beyond the charts region wrapper. | fixed |
| Enhancement | `features/baby/server/vaccines.test.ts:163-224` vs `vaccines.ts:218-247` | **List from/to untested.** Task 7 AC: list supports optional from/to + cursor. Cursor paging is covered; Zod rejects inverted from/to; **service never asserts range filtering** (rows outside from/to excluded). Regressions in `listBabyVaccines` date wiring stay green. | fixed |
| Enhancement | `features/baby/server/vaccines.ts:226-229` (gap in `vaccines.test.ts`) | **Missing failure mode.** Bad cursor → `Validation failed: bad cursor` (same pattern as growth/timeline). No vaccine list test rejects a garbage cursor. | fixed |
| Nit | `features/baby/server/vaccines.test.ts` vs `lib/validators/baby.test.ts` | Duplicate Zod vaccine schema cases; service file still mirrors validator happy/sad paths. | open |
| FYI | `lib/app-section-nav.test.ts:45-59` | Dedicated Baby **icon ids** are asserted (not Money `bills`/`import`). The `money-section-tabs` id→SVG component map is not tested; SVG render itself is unproven by automated tests. | open |
| FYI | `e2e/baby-care.spec.ts:417-422` | Sleep Start/End e2e conditionally ends an already-open nap before Start — order-sensitive leftover state; usually OK, worth watching for flakes. | open |

**Round notes:**

- Mapped Gate 2 behaviors → tests:
  - **Feed/sleep Start stay / End home:** helper unit (`lib/baby-care-save-navigate.test.ts`) is solid (stay/home + mutate/onSuccess failure). Sleep form uses stay/home; feed Start is client timer (no navigate). End-session home for feed is method save. Caller wiring + e2e depend on auth skip block (Major above).
  - **Timeline Breast L/R + `12m` / `1h 5m`:** `careSummary` + `formatBabyDurationCompact` units are good; Insights display helper coverage incomplete (Major).
  - **Vaccine list CRUD:** create+list validators + e2e happy path; update/delete/service NOT_FOUND = mock theater (Major). UI is create+list only.
  - **Measure + Insights growth chips:** chip helpers + Insights filter e2e + measure chips e2e — adequate for happy path.
  - **Care-count + growth chart cards:** `aggregateCareCountsByDay` + `growthEntriesToSeries` units OK; e2e region-only (Enhancement).
  - **Dedicated Baby nav icons:** href + icon id unit OK; component map FYI.
- Prefer Fix: real vaccine service tests (memory/deps or pure list helpers), delete identity Start-disable theater or replace with form-state wiring tests, extend timeline row duration cases, add `afterSave` caller contracts and/or non-skipped navigate coverage.

**Fix round (adversarial-tests):**

- **Vaccine service:** Added `VaccineDeps` (care-events pattern) + memory-store tests for create / list (workspace filter + cursor paging) / update / delete + cross-workspace `NOT_FOUND`.
- **Start-disable:** Helpers now include pending / openChecked; feed + sleep forms call them; tests cover those combinations.
- **Timeline duration:** Added `durationSec`, sleep `endedAt − at`, and null negatives (open sleep / diaper / missing payload).
- **Navigate contracts:** Exported `BABY_CARE_AFTER_SAVE`; forms use it; unit locks stay/home per action.
- **Enhancements:** `invalidateBabyQueries(..., "vaccines")` unit; stronger stop-clock assert (`/\d{1,2}:\d{2}/`, no year/month); e2e asserts `baby-care-count-chart`; care-count series-key unit; yoga schema smoke includes update/delete vaccine mutations.

**Round 2 (re-verify after Fix round 1):**

- **Prior Critical/Major/Enhancement — verified real (not mock theater):**
  - Vaccine create/list/update/delete + cross-workspace `NOT_FOUND` exercise real service fns via `VaccineDeps` memory store (`vaccines.test.ts:147-282`).
  - Start-disable helpers encode pending / openChecked OR logic; forms call them (`baby-care-session-state.ts` + form wiring).
  - Timeline duration covers `durationSec`, sleep `endedAt − at`, and null negatives (`baby-timeline-row-display.test.ts:49-120`).
  - Navigate: `BABY_CARE_AFTER_SAVE` used by feed/sleep/diaper forms; unit locks + stay/home helper paths (`baby-care-save-navigate.test.ts`).
  - Vaccines invalidate scope, stop-clock HH:MM/no-year, yoga update/delete schema smoke — real.
- **Gate 2 map (round 2):**
  - Feed/sleep navigate + Start disable: unit OK; e2e still auth-gated (acceptable with contracts).
  - Timeline Breast L/R + `12m` / `1h 5m`: server `careSummary` + client duration helpers OK.
  - Vaccine CRUD + ownership: fixed; **from/to + bad cursor still thin** (Enhancements).
  - Measure + Insights chips: OK.
  - Chart cards: care-count e2e OK; **growth card e2e still missing** (Enhancement).
  - Dedicated nav icon ids: OK; SVG map still FYI.
- **New open blockers:** 3 Enhancement (growth chart e2e, vaccine list from/to, vaccine bad cursor). Prefer Fix those before Quality lens.
- **Verdict:** not clean.

**Fix round 2 (adversarial-tests Enhancements):**

- **Growth chart e2e:** Insights charts test now asserts `baby-growth-chart-card` (first) after care-count; empty growth chips still mount cards.
- **Vaccine list from/to:** Service test creates before/in/after rows and asserts inclusive from+to, from-only, and to-only filters.
- **Vaccine bad cursor:** Service test expects `Validation failed: bad cursor` for `cursor: "!!!"`.
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test features/baby/server/vaccines.test.ts` — 9 pass.
- **Self-approve:** no — verifier re-runs adversarial-tests lens.

**Round 3 (RE-RUN 2 — re-verify after Fix round 2):**

- **Prior Enhancement 1 — growth chart e2e — verified real:** `e2e/baby-care.spec.ts:467` asserts `baby-growth-chart-card`.first(); live card mounts `data-testid` in `components/baby-growth-chart.tsx:44`; Insights empty growth chips → all numeric kinds (`growthKindSelected` when `growthKinds.length === 0`); skeletons lack that testid (no false pass on loading chrome).
- **Prior Enhancement 2 — vaccine list from/to — verified real:** `vaccines.test.ts:226-292` calls `listBabyVaccines` with before/in/after rows; asserts inclusive from+to (only InRange), from-only, to-only. Service wires `new Date(input.from|to)` into `deps.listVaccines` (`vaccines.ts:232-237`); dropping or one-siding that wiring fails the suite (not mock theater for service date wiring).
- **Prior Enhancement 3 — bad cursor — verified real:** `vaccines.test.ts:294-306` expects `Validation failed: bad cursor` for `cursor: "!!!"`; thrown in service after `decodeBabyVaccineCursor` (`vaccines.ts:227-229`) before deps.list — deps unused on this path. Suite re-run: 9 pass.
- **Gate 2 map (round 3):** Navigate stay/home + Start disable, timeline Breast L/R + duration, vaccine CRUD + from/to + bad cursor, Measure/Insights chips, care-count + growth chart cards, dedicated nav icon ids — covered. Open Nit (Zod dup) + FYIs (SVG map, sleep e2e order) do not block.
- **New Critical / Major / Enhancement:** none.
- **Verdict:** Adversarial test review: clean.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-measure-page.tsx` (list) vs `lib/baby-growth-kind-chips.ts` (`babyMeasureKindFilter`) | **Task 11 AC miss.** Selected kind must drive create **and** list filter. Helper is implemented and unit-tested, but Measure maps all `entries` with no `babyMeasureKindFilter` call — chips only set the create/edit form kind. Height/Weight/etc. rows stay mixed after chip change. | fixed |
| Major | `components/baby-insights-dashboard.tsx` (`careCountDays` + `hasMoreTimeline`) | **Option A care-count honesty gap.** Design required mitigate timeline truncation (raise limit, auto-page the window, or honest partial note). Chart aggregates only loaded pages; Load more is manual and there is no partial copy. `insights.emptyCareCount` (“No care events in this range…”) can show while `hasNextPage` is still true — silent under-count. | fixed |
| Major | `components/baby-sleep-form.tsx` (`OPEN_SLEEP_Q` `limit: 30`) | **Start-disable can miss open sleep.** Check scans only the first 30 merged timeline items (care + growth). Busy windows can bury an open nap → Start enabled until unique-constraint conflict. Gate 2: disable Start while open sleep exists. | fixed |
| Major | `components/baby-page-skeleton.tsx` `BabyInsightsPageSkeleton` charts grid | **Skeleton / CLS parity.** Live Insights can mount four growth cards + care-count (five cards when growth chips empty). Skeleton renders three chart slots only. Breaks DESIGN_GUIDE / Task 13 skeleton-grid AC (zero CLS). | fixed |
| Enhancement | `features/baby/server/timeline.ts` `careSummary` + Insights row (`babyTimelineDurationLabel`) | Duration shows twice: inside `summary` (`· 12m`) and again beside the stop clock. Extra noise for night scanning; prefer one place. | fixed |
| Enhancement | `lib/baby-care-counts.ts` `dayKey` | Buckets by **UTC** day (`toISOString().slice(0, 10)`). Local late-night / early-morning logs (e.g. UTC+7) can land on the wrong calendar day vs caregiver expectation. | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx` `aggregateCareCountsByDay(filteredTimeline)` | Care-count uses care-chip-filtered rows, so Feed-only filter zeros sleep/diaper series. Design example implied a full care mix; either chart from unfiltered care rows or document chip coupling. | fixed |
| Major | `lib/baby-query-options.ts` `BABY_TIMELINE_MAX_PAGES` (4) + Insights `hasMoreTimeline` / `partialCareCount` | **Honesty fix incomplete at page cap.** After 4×200 timeline pages, `hasNextPage` is false (Load more hidden) while `nextCursor` can remain → partial copy still says “load more timeline below.” Busy months can under-count with no way to finish loading. | fixed |
| Enhancement | Insights growth (`limit: 50` × `BABY_GROWTH_MAX_PAGES` 4) | Growth chart series can under-count with no partial note; Load more also disappears at the cap. | fixed |
| Enhancement | `components/baby-sleep-form.tsx` open-sleep `catch` | Check error → fail-open (`hasOpenSleep` false, `openChecked` true) so Start enables while open nap may still exist. | fixed |
| Enhancement | `detectOpenSleepAcrossTimelinePages` after `maxPages` | Returns false when pages remain past cap — residual vs design open-sleep query; not a dedicated open-nap read. | fixed |
| Major | `lib/baby-query-options.ts` `replaceBabyTimelineFirstPage` + `components/baby-insights-dashboard.tsx` sync interval | **Sync wipe undoes care-count multi-page honesty.** Interval sync (~1m default) replaces infinite cache with **first page only**, dropping auto-fetched pages 2–4 and any manual Load more past the auto-cap. Care-count under-counts until auto-fetch re-walks; busy months cannot stably finish loading past page 4. Conflicts with Fix round 2 Load-more-past-cap. | fixed |
| Enhancement | `components/baby-sleep-form.tsx` + `babyOpenSleepCheckState` error/unknown | **Fail-closed strands End with no retry UI.** `openChecked: false` + `hasOpenSleep: false` disables Start **and** End; no open-session banner, no error/retry. Network blip or rare `unknown` (cap) leaves both actions dead until remount. Start-disable intent is met; End cannot clear a real open nap. | fixed |
| Major | `lib/baby-query-options.ts` `replaceBabyTimelineFirstPage` + Insights sync flatten | **Sync merge keeps pages 2+ even when fresh first-page cursor no longer matches** `old.pageParams[1]`. Boundary insert/delete → gap or duplicate ids in flattened timeline; care-count/KPIs can look “ready” while wrong. | fixed |
| Enhancement | `baby-sleep-form.tsx` unknown open-sleep | **No status copy on unknown** (error has Retry); End enabled without “check incomplete” hint. | fixed |
| Enhancement | `replaceBabyTimelineFirstPage` merge-when-chain-matches + Insights sync | **Deeper pages stay stale when page-1 `nextCursor` is unchanged.** Backdated insert/delete on pages 2+ never rebuilds while chain matches; charts/KPIs can look `ready` while wrong. Truncate-on-break fixed gap/dup only. | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx` sync `setQueryData` vs in-flight `fetchNextPage` | **Sync truncate can lose to an in-flight Load more / auto-page.** TanStack infinite `onFetch` snapshots pages at fetch start; if `fetchNextPage` completes after sync truncate, it writes `[...oldPages, newPage]` and overwrites the fresh first page. Stale multi-page cache returns; Option A honesty briefly undone until the next clean sync. Prefer `cancelQueries` on the timeline key before `setQueryData`, or skip sync while `isFetchingNextPage`. | fixed |
| Nit | `components/baby-care-count-chart.tsx` `rx={2}` | Hardcoded bar corner radius; prefer radius tokens per DESIGN_GUIDE. | open |
| Nit | `lib/baby-growth-kind-chips.ts` `selectBabyGrowthKindChip` | Unused `current` parameter (always returns `next`). | open |
| FYI | Prior adversarial Nit/FYI | Zod vaccine schema duplication; icon id→SVG map untested; sleep e2e order-sensitivity — still open from test lens; not re-filed as Quality blockers. | open |

**Round notes:**

- **Context:** Quality lens vs Gate 2 Option A (Start stay / End home; vaccine; chips; charts; icons) and `04-tasks.md`. Adversarial tests previously clean; this pass is implementation quality, not test theater.
- **Correctness / Gate 2 map:**
  - Navigate stay/home + feed timer Start stay / method→home / sleep Start stay / End home / diaper home: OK.
  - Timeline Breast L/R + compact duration helpers: OK (with duplicate-display Enhancement).
  - Vaccine DB/API/UI create+list + dedicated nav icons: OK.
  - Insights growth chips + Money-style chart chrome: present.
  - Measure chips: present for create, **list filter not wired** (Major).
  - Care-count Option A: real aggregation, **truncation honesty missing** (Major).
  - Sleep Start disable: helper OK, **open-sleep discovery incomplete** (Major).
- **Architecture:** Dead `babyMeasureKindFilter` (tested, unused) is a wiring miss, not an extra abstraction win.
- **Performance:** Care-count under-count is honesty/correctness more than hot-path cost; auto-paging the Insights window would also address it.
- **Security:** Workspace-scoped vaccine CRUD + RLS migration look aligned; deeper authz left to Security lens.
- **Verdict:** Request changes — 4 Major open. Not clean.

**Fix round (quality):**

- **Measure list filter:** Wired `babyMeasureKindFilter(entries, kind)` into Measure list + empty state (`visibleEntries`).
- **Care-count honesty (Option A):** Insights timeline page limit raised to `BABY_INSIGHTS_TIMELINE_PAGE_LIMIT` (200); auto-fetch next pages until cap; `babyCareCountChartCopy` + `insights.partialCareCount` when API still has `nextCursor` (no false empty).
- **Open sleep Start-disable:** `detectOpenSleepAcrossTimelinePages` walks cursor pages (limit 50, max 20) until open nap found or done; sleep form uses it.
- **Skeleton CLS:** `BabyInsightsPageSkeleton` chart grid now 5 slots (4 growth + care-count).
- **Duration once:** Insights uses `babyTimelineSummaryLabel` (strips `· 12m`) + duration beside stop clock; server `careSummary` unchanged for home.
- **Local day buckets:** `careCountDayKey` uses `toLocalDateString` (Insights calendar).
- **Care-count vs care chips:** Aggregates from unfiltered `timelineItems` so care-type chips do not zero other series.
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-care-counts.test.ts lib/baby-care-session-state.test.ts lib/baby-timeline-row-display.test.ts lib/baby-query-options.test.ts lib/baby-growth-kind-chips.test.ts lib/baby-i18n.test.ts` — pass.
- **Self-approve:** no — verifier re-runs Quality lens.
- **Nits left open:** chart `rx={2}`; unused `current` on chip select.

**Quality (re-run notes) — after Fix round 1:**

- **Prior Critical/Major/Enhancement — verified real (not mock theater):**
  1. **Measure list filter:** `baby-measure-page.tsx` uses `visibleEntries = babyMeasureKindFilter(entries, kind)` for list + empty `entryCount`.
  2. **Care-count honesty mechanisms:** `BABY_INSIGHTS_TIMELINE_PAGE_LIMIT` (200), Insights `useEffect` auto-`fetchNextPage`, `babyCareCountChartCopy` + `insights.partialCareCount` (no false empty while `nextCursor`). **But see new Major — page cap breaks the Load-more path.**
  3. **Open-sleep walk:** `detectOpenSleepAcrossTimelinePages` (limit 50, max 20) wired in `baby-sleep-form.tsx`; unit covers later-page find.
  4. **Skeleton 5 cards:** `BabyInsightsPageSkeleton` renders five `BabyGrowthChartSkeleton` slots.
  5. **Duration once:** Insights uses `babyTimelineSummaryLabel` (strips `· 12m` / `1h 5m`) + duration beside stop clock.
  6. **Local day buckets:** `careCountDayKey` → `toLocalDateString` (not UTC ISO slice).
  7. **Care-count unfiltered:** `aggregateCareCountsByDay(timelineItems)` — not `filteredTimeline`.
- **New open blockers:**

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/baby-query-options.ts` `babyTimelineNextPageParam` + `BABY_TIMELINE_MAX_PAGES` (4) vs `components/baby-insights-dashboard.tsx` (`hasMoreTimeline` / `timelineIncomplete` / `insights.partialCareCount`) | **Care-count honesty still broken at the page cap.** Auto-page + partial note land, but next-page stops after 4×200 rows while last page can still have `nextCursor`. Then `hasNextPage` is false → **Load more hidden**, yet `timelineIncomplete` stays true and copy says “load more timeline below for the full range.” Busy month windows can hit the cap; caregivers cannot continue loading. Option A required full window load **or** an honest partial path users can finish. | fixed |
| Enhancement | `lib/baby-query-options.ts` growth Insights path (`limit: 50` × `BABY_GROWTH_MAX_PAGES` 4) + growth chart cards | Same class as care-count: growth series stop after ~200 rows with **no** partial note; at the cap Load more also disappears. Charts can look empty/short while more data exists in range. | fixed |
| Enhancement | `components/baby-sleep-form.tsx` open-sleep `catch` | Check failure sets `hasOpenSleep(false)` and `openChecked(true)` → **Start enabled (fail-open)**. Gate 2 wants Start disabled while an open nap exists; network blips re-enable Start until unique-constraint conflict. Prefer fail-closed (`openChecked` false or treat error as unknown-open). | fixed |
| Enhancement | `lib/baby-care-session-state.ts` `detectOpenSleepAcrossTimelinePages` after `maxPages` | Exhausting 20 pages returns `false` even if `nextCursor` remains — residual miss vs design “query/cache open sleep (DB unique).” Better than first-30-only; still not a dedicated open-sleep read. | fixed |

- **Nit/FYI (still open, do not block):** chart `rx={2}`; unused `current` on `selectBabyGrowthKindChip`; prior adversarial Zod dup / SVG map / sleep e2e order.
- **Gate 2 map (Quality re-run):** Navigate stay/home, timeline Breast L/R + duration-once, vaccine, chips, icons, Measure filter wiring — OK. Care-count Option A honesty **not** fully OK (Major). Sleep Start-disable improved but fail-open + maxPages residual (Enhancement).
- **Verdict:** Request changes — 1 Major + 3 Enhancement open. Not clean.

**Fix round 2 (quality):**

- **Timeline Load more past auto-cap (a):** `babyTimelineNextPageParam` always returns `nextCursor` so `hasNextPage` / Load more stay available; Insights auto-fetch stops via `babyInsightsShouldAutoFetchNextPage` + `BABY_TIMELINE_MAX_PAGES`.
- **Honest partial copy:** `babyCareCountChartCopy` takes `canLoadMore` → `partial` vs `partialCapped`; i18n `insights.partialCareCount` (tap Load more) + `insights.partialCareCountCapped`.
- **Growth same pattern:** `babyGrowthNextPageParam` always follows cursor; `babyGrowthChartCopy` + section/empty partial notes (`insights.partialGrowth` / `partialGrowthCapped`).
- **Open-sleep fail-closed:** `detectOpenSleepAcrossTimelinePages` returns `open` | `closed` | `unknown` (unknown when max pages + cursor remain); `babyOpenSleepCheckState` maps error/unknown → `openChecked: false`; sleep form uses it (Start stays disabled; End not falsely enabled).
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-query-options.test.ts lib/baby-care-session-state.test.ts lib/baby-care-counts.test.ts lib/baby-growth-series.test.ts lib/baby-i18n.test.ts` — pass.
- **Self-approve:** no — verifier re-runs Quality lens.
- **Nits left open:** chart `rx={2}`; unused `current` on chip select.

**Quality (RE-RUN 2) — after Fix round 2:**

- **Prior Critical/Major/Enhancement — verified real (not mock theater):**
  1. **Timeline Load more past auto-cap:** `babyTimelineNextPageParam` returns `nextCursor` regardless of page count (`baby-query-options.ts:209-214`); Insights auto-fetch gated by `babyInsightsShouldAutoFetchNextPage` + `BABY_TIMELINE_MAX_PAGES` (`baby-insights-dashboard.tsx:256-266`); unit asserts cursor past max (`baby-query-options.test.ts:335-349`).
  2. **partial vs partialCapped:** `babyCareCountChartCopy({ canLoadMore })` → `partial` / `partialCapped`; Insights wires `canLoadMore: hasMoreTimeline` + i18n keys (`baby-care-counts.ts:29-39`, dashboard `:385-393`, `messages/baby/en.ts:82-85`).
  3. **Growth same honesty:** `babyGrowthNextPageParam` always follows cursor; `babyGrowthChartCopy` + `partialGrowth` / `partialGrowthCapped`; Load more when `hasMoreGrowth` (`baby-growth-series.ts:20-30`, dashboard `:398-418`, `:698-714`).
  4. **Open-sleep fail-closed on error:** sleep form `catch` → `babyOpenSleepCheckState("error")` → `openChecked: false` (`baby-sleep-form.tsx:87-92`); Start stays disabled via `isBabySleepStartDisabled`.
  5. **Page cap → unknown → fail-closed:** `detectOpenSleepAcrossTimelinePages` returns `"unknown"` after max pages with cursor (`baby-care-session-state.ts:85-96`); mapped to `openChecked: false`; unit covers unknown + Start disabled (`baby-care-session-state.test.ts:118-165`).
- **New open blockers:**

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `replaceBabyTimelineFirstPage` + Insights sync | Sync (~1m) drops all timeline pages after the first, undoing auto-page care-count and any Load more past auto-cap. | fixed |
| Enhancement | Sleep open-check fail-closed UI | error/unknown disables Start and End with no retry/error affordance. | fixed |

- **Nit/FYI (still open, do not block):** chart `rx={2}`; unused `current` on chip select; prior adversarial Zod dup / SVG map / sleep e2e order.
- **Gate 2 map (Quality RE-RUN 2):** Navigate stay/home, timeline Breast L/R + duration-once, vaccine, chips, icons, Measure filter, Start-disable fail-closed, growth/care partial copy + Load more past auto-cap helpers — OK. Care-count Option A honesty **regresses on sync wipe** (Major).
- **Verdict:** Request changes — 1 Major + 1 Enhancement open. Not clean.

**Fix round 3 (quality):**

- **Timeline sync preserves pages:** `replaceBabyTimelineFirstPage` merges the refreshed first page into existing infinite cache (`[fresh, ...old.pages.slice(1)]`) instead of wiping to one page. Empty/single-page cache still seeds `[firstPage]`.
- **Sleep fail-closed UI:** `babyOpenSleepCheckState` now returns `endEnabled` + `checkFailed`. error → Start off + message + Retry; unknown → Start off, End on; open → Start off, End on. Sleep form wires Retry (`sleep.checkFailed` / `sleep.retryCheck`) and End uses `endEnabled`.
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-query-options.test.ts lib/baby-care-session-state.test.ts lib/baby-i18n.test.ts` — pass.
- **Self-approve:** no — verifier re-runs Quality lens.
- **Nits left open:** chart `rx={2}`; unused `current` on chip select.

**Quality (RE-RUN 3) — after Fix round 3:**

- **Prior Critical/Major/Enhancement — verified real (not mock theater):**
  1. **Timeline sync merge keeps pages 2+:** `replaceBabyTimelineFirstPage` returns `[firstPage, ...old.pages.slice(1)]` when `old.pages.length > 1` (`baby-query-options.ts:241-254`); Insights interval sync uses it (`baby-insights-dashboard.tsx:236-239`). Unit asserts length 3 and deeper page ids kept (`baby-query-options.test.ts:258-270`). Empty/single-page still seeds `[firstPage]` only. **Wipe-to-one-page regression is fixed** — but see new Major on cursor-chain honesty.
  2. **Sleep open-check UI:** `babyOpenSleepCheckState("error")` → `endEnabled: false`, `checkFailed: true`; `"unknown"` / `"open"` → `endEnabled: true`, Start fail-closed via `openChecked: false` / `hasOpenSleep` (`baby-care-session-state.ts:72-104`). Form wires Retry + `sleep.checkFailed` / `sleep.retryCheck`; End uses `!endEnabled` (`baby-sleep-form.tsx:185-221`). Unit maps all four outcomes (`baby-care-session-state.test.ts:135-192`). i18n keys present EN/VI.

- **New open blockers:**

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/baby-query-options.ts` `replaceBabyTimelineFirstPage` + Insights sync + `aggregateCareCountsByDay(timelineItems)` | **Sync merge breaks cursor-page chain when page 1 changes.** Deeper pages are always kept even if fresh `nextCursor` ≠ the cursor that fetched page 2 (`old.pageParams[1]`). After insert/delete near the page boundary, flattened pages can **gap or duplicate** ids. Care-count / KPIs / timeline list then over- or under-count. Auto-fetch will not rebuild (already at `BABY_TIMELINE_MAX_PAGES`). `timelineIncomplete` can be false while counts are wrong → silent “ready” chart, worse than wipe+re-walk. Unit only covers matching `cursor-1` happy path — not a shifted first page. Prefer: drop pages 2+ when first-page cursor/content chain breaks; or invalidate/refetch loaded pages; or dedupe+honest rebuild. | fixed |
| Enhancement | `components/baby-sleep-form.tsx` + `babyOpenSleepCheckState("unknown")` | **Unknown scan has no status copy.** Error shows alert + Retry; unknown only disables Start and enables End with no “check incomplete” note. Caregiver may not know End is speculative after the page cap. | fixed |

- **Nit/FYI (still open, do not block):** chart `rx={2}`; unused `current` on `selectBabyGrowthKindChip`; prior adversarial Zod dup / SVG map / sleep e2e order.
- **Gate 2 map (Quality RE-RUN 3):** Navigate stay/home, Measure filter, vaccine, chips, icons, duration-once, sleep Start-disable + error Retry / unknown End — OK. Care-count Option A honesty after multi-page **sync merge** — not OK (Major).
- **Verdict:** Request changes — 1 Major + 1 Enhancement open. Not clean.

**Fix round 4 (quality):**

- **Sync cursor-chain honesty:** `replaceBabyTimelineFirstPage` keeps pages 2+ only when `fresh.nextCursor === old.pageParams[1]`; otherwise truncates to first-page-only so Load more / auto-fetch can rebuild. Unit covers chain OK keep + chain broken truncate (+ null nextCursor).
- **Sleep unknown copy:** `babyOpenSleepCheckState("unknown")` sets `checkIncomplete: true`; sleep form shows `sleep.checkIncomplete` (EN/VI); End stays enabled. i18n unit asserts the key.
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-query-options.test.ts lib/baby-care-session-state.test.ts lib/baby-i18n.test.ts` — pass.
- **Self-approve:** no — verifier re-runs Quality lens.
- **Nits left open:** chart `rx={2}`; unused `current` on chip select.

**Quality (RE-RUN 4) — after Fix round 4:**

- **Prior Critical/Major/Enhancement — verified real (not mock theater):**
  1. **Sync cursor-chain honesty:** `replaceBabyTimelineFirstPage` compares `fresh.nextCursor` to `old.pageParams[1]`; mismatch (including null while deeper pages exist) returns first-page-only; match keeps `[firstPage, ...old.pages.slice(1)]` (`baby-query-options.ts:243-266`). Insights sync still uses it (`baby-insights-dashboard.tsx:236-239`). Units cover keep-on-match, truncate-on-shift, truncate-on-null (`baby-query-options.test.ts:258-298`). Suite re-run: pass.
  2. **Sleep unknown copy:** `babyOpenSleepCheckState("unknown")` → `checkIncomplete: true`, `endEnabled: true`, Start fail-closed (`baby-care-session-state.ts:95-102`). Form state + `t("sleep.checkIncomplete")` with `aria-live` (`baby-sleep-form.tsx:62-72`, `:191-195`). EN/VI strings + i18n unit (`messages/baby/en.ts:50-51`, `vi.ts:52-53`, `baby-i18n.test.ts:60-62`). Unit maps unknown vs error (`baby-care-session-state.test.ts:151-188`).

- **New open blockers:**

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `replaceBabyTimelineFirstPage` merge-when-chain-matches + Insights sync | **Deeper pages stay stale when page-1 `nextCursor` is unchanged.** Sync refreshes only page 1. Inserts/deletes/edits that land only on pages 2+ (e.g. backdated care in a busy month) never rebuild while the chain still matches — care-count/KPIs/timeline can look `ready` (`timelineIncomplete` false at cap end) while wrong. Truncate-on-break fixes boundary gap/dup; it does not refresh matched deeper pages. Prefer: refetch loaded pageParams on sync, periodic full invalidate, or accept and document as Option A sync limit. | fixed |

- **Nit/FYI (still open, do not block):** chart `rx={2}`; unused `current` on `selectBabyGrowthKindChip`; prior adversarial Zod dup / SVG map / sleep e2e order.
- **Gate 2 map (Quality RE-RUN 4):** Navigate stay/home, Measure filter, vaccine, chips, icons, duration-once, sleep Start-disable + error Retry / unknown incomplete copy, care-count Load more past auto-cap + sync truncate-on-chain-break — OK. Residual: stale pages 2+ when cursor unchanged (Enhancement).
- **Verdict:** Request changes — 1 Enhancement open. Not clean.

**Fix round 5 (quality):**

- **Option A sync truncate:** `replaceBabyTimelineFirstPage` always returns first-page-only (drops pages 2+ on every Insights sync). Care-count honesty over keeping deep cache; Load more / auto-fetch refill after brief shrink. Removes merge-when-chain-matches path that left backdated page-2+ edits stale.
- **Tests:** Replaced keep-on-match case with assert that matching `nextCursor` still truncates; chain-break / null / empty / sole-page cases stay truncate.
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-query-options.test.ts` — 28 pass.
- **Self-approve:** no — verifier re-runs Quality lens.
- **Nits left open:** chart `rx={2}`; unused `current` on chip select.

**Quality (RE-RUN 5) — after Fix round 5:**

- **Prior Enhancement (stale pages 2+ when chain matches) — verified real (Option A truncate):**
  1. `replaceBabyTimelineFirstPage` ignores `_old` and **always** returns `{ pages: [firstPage], pageParams: [null] }` (`lib/baby-query-options.ts:244-252`). No merge-when-chain-matches path remains.
  2. Insights interval sync still applies it via `setQueryData` (`baby-insights-dashboard.tsx:236-239`).
  3. Unit asserts truncate even when fresh `nextCursor` matches `old.pageParams[1]` (`baby-query-options.test.ts:258-270`); chain-break / null / empty / sole-page also truncate. Suite: 28 pass.
  4. Auto-fetch re-walk after shrink still gated by `babyInsightsShouldAutoFetchNextPage` + `BABY_TIMELINE_MAX_PAGES`; Load more stays on `nextCursor` (`babyTimelineNextPageParam`). Brief under-count + partial copy until refill matches chosen Option A tradeoff.

- **New open blockers:**

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `components/baby-insights-dashboard.tsx` sync `setQueryData` vs in-flight `fetchNextPage` (+ TanStack infinite `onFetch` snapshot) | **Sync truncate can lose to an in-flight Load more / auto-page.** `fetchNextPage` captures pages at start; if it finishes after sync truncate, it writes `[...oldPages, newPage]` and overwrites the fresh first page — stale multi-page cache returns and Option A honesty is undone until a later clean sync. Prefer `cancelQueries` on the timeline key before `setQueryData`, or skip sync while `isFetchingNextPage`. | fixed |

- **Nit/FYI (still open, do not block):** chart `rx={2}`; unused `current` on `selectBabyGrowthKindChip`; prior adversarial Zod dup / SVG map / sleep e2e order.
- **Gate 2 map (Quality RE-RUN 5):** Navigate stay/home, Measure filter, vaccine, chips, icons, duration-once, sleep Start-disable + error Retry / unknown incomplete copy, care-count Load more past auto-cap + **always truncate on sync (Option A)** — OK. Residual: rare sync vs `fetchNextPage` race (Enhancement).
- **Verdict:** Request changes — 1 Enhancement open. Not clean.

**Fix round 6 (quality):**

- **Sync vs fetchNextPage race (Option A):** Added `applyBabyTimelineSyncTruncate` — `await cancelQueries({ queryKey })` then `setQueryData` with `replaceBabyTimelineFirstPage`. Insights interval sync uses it so an in-flight Load more / auto-page cannot append onto a pre-truncate snapshot and restore stale multi-page cache.
- **Growth:** No interval sync truncate for growth infinite query — same race does not apply; no change.
- **Test:** Unit asserts cancel → set order and first-page-only result (`applyBabyTimelineSyncTruncate`).
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-query-options.test.ts` — 29 pass.
- **Self-approve:** no — verifier re-runs Quality lens.
- **Nits left open:** chart `rx={2}`; unused `current` on chip select.

**Quality (RE-RUN 6) — after Fix round 6:**

- **Prior Enhancement (sync vs in-flight fetchNextPage) — verified real (not mock theater):**
  1. `applyBabyTimelineSyncTruncate` awaits `cancelQueries({ queryKey })` then `setQueryData` with `replaceBabyTimelineFirstPage` (`lib/baby-query-options.ts:259-269`).
  2. Insights interval sync calls it (no raw `setQueryData` on the timeline key) (`baby-insights-dashboard.tsx:237-241`).
  3. Unit asserts call order `["cancel", "set"]` and first-page-only cache (`baby-query-options.test.ts:331-364`). Suite: 29 pass.
  4. First-page fetch completes before cancel/truncate, so cancel targets in-flight page walks, not the sync payload fetch.

- **New Critical / Major / Enhancement:** none. Residual Nit/FYI only (chart `rx={2}`; unused `current` on chip select; prior adversarial Zod dup / SVG map / sleep e2e order). No new theoretical race loops — cancel-before-set closes the filed Enhancement.

- **Gate 2 map (Quality RE-RUN 6):** Navigate stay/home, Measure filter, vaccine, chips, icons, duration-once, sleep Start-disable + error Retry / unknown incomplete copy, care-count Load more past auto-cap + always truncate on sync + cancel before truncate — OK.

- **Verdict:** Quality review: clean.

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| | | | |

**Round notes:**

- **Subagent:** `security-review` unavailable (usage limit, retried once). Manual review against `security-and-hardening` + focus areas below.
- **Scope checked:** vaccine schema/migration/service, GraphQL vaccine resolvers + typeDefs/validators, care save navigate, Insights query/data path (workspace scoping, input validation, IDOR).
- **Vaccine authz / IDOR:**
  - Reads: `requireBabyWorkspace` → `runInWorkspace(workspaceId)` → `listBabyVaccines(workspaceId, …)` with `eq(workspaceId)`.
  - Writes: `requireBabyWriteWorkspace` (session write / `hasWriteScope`) → create/update/delete under same workspace RLS transaction.
  - Update/delete: `findVaccine` / `updateVaccine` / `deleteVaccine` all `id` **and** `workspaceId`; cross-workspace → `NOT_FOUND` (tests cover).
  - Create: `babyId` from `ensureBabyProfile(workspaceId)` only — not client-supplied (no babyId IDOR).
  - Migration `0038_baby_vaccine.sql`: `ENABLE` + `FORCE ROW LEVEL SECURITY` + `workspace_id = app_current_workspace_id()` USING/WITH CHECK — matches other baby tables.
- **Input validation:** Zod create/update/list (name max 200, notes max 2000, dose enum, datetime offset, list limit 1–100, from≤to, update `id` uuid). GraphQL `source` string still constrained by `babyCareSourceSchema`. Cursors decoded then parameterized via Drizzle (no raw SQL concat).
- **Insights:** Client chips filter already-fetched rows only. Timeline/growth loads go through `buildBabyInsightsQueryFns` → session GraphQL (`/api/graphql/baby`) with CSRF + rate limit; workspace from auth cookie path (`getBabyWorkspaceIdForUser` + `verifyMoneyWorkspaceAccess`), not client workspace args. API keys get `workspaceId: null` (Baby session-only).
- **Care save navigate:** Hardcoded `BABY_AFTER_CARE_SAVE_HREF = "/baby"`; stay/home is UX only — no open redirect / auth bypass surface.
- **Secrets / injection:** No new secrets; parameterized queries; React text for vaccine name (no `dangerouslySetInnerHTML`).
- **Critical / Major / Enhancement:** none.
- **Verdict:** Security review: clean.

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `lib/baby-query-options.ts` `BABY_INSIGHTS_TIMELINE_PAGE_LIMIT` (200) vs `lib/validators/baby.ts` `babyTimelineInputSchema.limit` `.max(100)` | **Insights timeline/sync page size is invalid.** `buildBabyInsightsQueryFns` sends `limit: 200` for timeline + sync first page; Zod rejects `limit > 100` (`validators/baby.test.ts` asserts rejection). Every Insights timeline GraphQL call fails validation → care-count auto-page / honesty path never runs. The “raise page limit” Option A mitigation is dead and breaks the Insights hot path. Align constant to ≤100 or raise the server max. | fixed |
| Major | `components/baby-insights-dashboard.tsx` sync interval + auto-`fetchNextPage` + `applyBabyTimelineSyncTruncate` | **Sync truncate forces a recurring auto-page waterfall.** Default sync ~1m (`baby-sync-interval.ts`) always truncates to first page, then the auto-fetch effect re-walks pages 2…`BABY_TIMELINE_MAX_PAGES` (sequential `fetchNextPage`). Idle Insights tab pays up to ~4 GraphQL round-trips × 2 DB keyset reads each minute even when data is unchanged. Option A honesty is fine; prefer: skip truncate when already on page 1 and unchanged, raise sync interval for multi-page windows, or pause auto-refill until user interaction. | fixed |
| Major | `components/baby-sleep-form.tsx` + `lib/baby-care-session-state.ts` `detectOpenSleepAcrossTimelinePages` (limit 50 × max 20) | **Open-sleep Start-disable is a sequential timeline walk.** Mount walks up to 20 cursor pages of merged care+growth timeline (no date filter) before Start enables — classic async waterfall on the night path. Server already has indexed `findOpenSleep` (`features/baby/server/care-events.ts`, partial unique `baby_care_event_open_sleep_uq`) but GraphQL/UI does not use it. Prefer one open-sleep query (or reuse last-care) instead of paging history. | fixed |
| Enhancement | `lib/baby-query-options.ts` `babyTimelineNextPageParam` / `babyGrowthNextPageParam` | **Client Load more is uncapped.** Next-page helpers always follow `nextCursor` (auto-fetch only is capped). Timeline shrinks on sync; growth has **no** sync truncate — rapid Load more can grow QueryClient + full list DOM without a window. Reuse `windowBabyGrowthInfiniteData` / a timeline window, or stop retaining pages past a soft cap with honest copy. | fixed |
| Enhancement | `components/baby-vaccines-page.tsx` + `babyVaccinesQueryOptions` | **Vaccine list drops cursor.** API supports `nextCursor` + limit 1–100; UI uses a single `useQuery` page (50) with no Load more / infinite query. Fine while logs are few; long-lived workspaces silently truncate. | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx` timeline + growth lists | **Full-list DOM after auto-page.** Insights maps entire `filteredTimeline` / `filteredGrowth` (hundreds of rows after 4×~100). No virtualization / `content-visibility`. Charts are dynamically imported (good); the lists are the heavier render cost. | fixed |

**Round notes:**

- **Lens:** Performance (N+1, unbounded fetch, pagination, waterfalls, hot-path waste, bundle). React/Next UI changed → also checked vercel-react-best-practices (async waterfalls, bundle, client fetch).
- **Option A care-count:** Not re-opened as “must use server buckets.” Client aggregation + caps + honest partial stays the design. Findings target broken limit, sync re-walk cost, and related client retention — not a forced Option B.
- **What looks fine:** Timeline server path uses `Promise.all` care+growth keyset (`async-parallel`); vaccine list SQL is keyset + limit; charts use `next/dynamic` + `ssr: false` (bundle-dynamic-imports); sync `cancelQueries` before truncate avoids fetch races (correctness, not waste).
- **N+1:** No new per-row GraphQL/DB loops in vaccine CRUD or chart helpers. Open-sleep walk is a **page** waterfall, not classic N+1, but same class of sequential RTTs.
- **Critical / Major / Enhancement:** 1 Critical + 2 Major + 3 Enhancement open.
- **Verdict:** Request changes — not clean.

**Fix round (performance):**

- **Critical limit align:** `BABY_INSIGHTS_TIMELINE_PAGE_LIMIT` → **100** (Zod max stays 100). Auto pages raised to `BABY_TIMELINE_MAX_PAGES` **8** (~same row budget as 4×200). Schema unit asserts limit 100 ok / 200 rejected; Insights limit must pass Zod.
- **Sync auto-fetch gate:** After sync truncate, `allowTimelineAutoFetch=false` so `babyInsightsShouldAutoFetchNextPage(..., { allowAutoFetch: false })` skips refill. Auto-fetch only on initial load / bounds (filter) change; Load more + partial note cover the rest.
- **Open sleep:** GraphQL `babyOpenSleep` → `findOpenSleep` (one indexed read). Sleep form uses it + `openSleepScanFromQuery`; fail-closed on error. Timeline page walk no longer on the night path.
- **Soft max Load more:** `babyTimelineNextPageParam` / `babyGrowthNextPageParam` stop at soft max **20** pages → `hasNextPage` false → honest `partialCapped`.
- **Vaccines:** `useInfiniteQuery` + `babyVaccinesNextPageParam` + Load more + `vaccine.partialList` note.
- **Insights list DOM:** `babyInsightsVisibleListRows` cap **100** + Show more (`insights.showMoreList`); charts still use full loaded arrays.
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-query-options.test.ts lib/validators/baby.test.ts lib/baby-care-session-state.test.ts lib/baby-insights-list-visible.test.ts lib/baby-vaccine-list-state.test.ts lib/baby-i18n.test.ts lib/graphql/baby-yoga.test.ts` — 87 pass.
- **Self-approve:** no — verifier re-runs Performance lens.

**Performance (RE-RUN 1) — after Fix round 1:**

- **Prior Critical/Major/Enhancement — verified real (not mock theater):**
  1. **Timeline limit ≤ Zod max + MAX_PAGES 8:** `BABY_INSIGHTS_TIMELINE_PAGE_LIMIT = 100` (`baby-query-options.ts:209`); Insights timeline + sync first page use it (`:370`, `:383`). Zod `babyTimelineInputSchema.limit` max stays 100; unit asserts limit 100 ok / >100 rejected (`validators/baby.test.ts`). Constant self-check `<= 100` + schema parse (`baby-query-options.test.ts` BABY_INSIGHTS_TIMELINE_PAGE_LIMIT). `BABY_TIMELINE_MAX_PAGES = 8` (`:191`) for auto-fetch cap.
  2. **Sync truncate no auto-refill:** Sync still `applyBabyTimelineSyncTruncate` then `setAllowTimelineAutoFetch(false)` (`baby-insights-dashboard.tsx:261-267`). Auto-fetch effect passes `{ allowAutoFetch: allowTimelineAutoFetch }` (`:290-292`); `babyInsightsShouldAutoFetchNextPage` returns false when `allowAutoFetch === false` (`baby-query-options.ts:247`). Bounds change resets allow to true (`dashboard:228-230`). Unit covers allowAutoFetch false gate.
  3. **Open sleep one indexed read:** Sleep form queries `babyOpenSleep` only (`baby-sleep-form.tsx:39-48`, `:81-90`); no `detectOpenSleepAcrossTimelinePages` in `components/`. Resolver → `findOpenSleep` (`baby-resolvers.ts:159-169`, `care-events.ts:246-260` limit 1). Fail-closed via `babyOpenSleepCheckState` / `openSleepScanFromQuery`.
  4. **Soft max 20 → partialCapped:** `babyTimelineNextPageParam` / `babyGrowthNextPageParam` stop when `allPages.length >= SOFT_MAX` (20) (`baby-query-options.ts:215-234`). Units assert undefined next param at soft max (partialCapped path). Care/growth copy helpers still map `!canLoadMore` → `partialCapped`.
  5. **Vaccines infinite Load more:** `BabyVaccinesPage` uses `useInfiniteQuery(babyVaccinesInfiniteQueryOptions())` + `fetchNextPage` + `vaccine.partialList` (`baby-vaccines-page.tsx:47-54`, `:132-160`). `babyVaccinesNextPageParam` follows `nextCursor`.
  6. **Insights list DOM cap 100 + Show more:** `babyInsightsVisibleListRows` + `BABY_INSIGHTS_LIST_VISIBLE_CAP` 100 (`baby-insights-list-visible.ts`); dashboard uses `growthListWindow` / `timelineListWindow` + Show more (`baby-insights-dashboard.tsx:458-465`, `:737-749`, `:818`). Charts still aggregate full loaded arrays (Option A — not reopened as server buckets).

- **What still looks fine:** Timeline server `Promise.all` care+growth; vaccine keyset list; charts `next/dynamic` + `ssr: false`; sync `cancelQueries` before truncate; no new per-row GraphQL/DB N+1 on vaccine CRUD.

- **Residual Nit/FYI only (do not block):**
  - Vaccine infinite has no soft-max page cap (unlike timeline/growth) — vaccine volume is low; theoretical.
  - Show more can grow visible DOM up to all loaded rows by design (cap is the default window, not a hard ceiling after clicks).
  - Insights initial load still sequential auto-pages up to 8 (Option A honesty); recurring minute re-walk is what was fixed.

- **New Critical / Major / Enhancement:** none. Did not reopen Option A client care-count as needing server buckets.

- **Verdict:** Performance review: clean.

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `lib/baby-query-options.ts` `babyVaccinesNextPageParam` + `babyVaccinesInfiniteQueryOptions` + `components/baby-vaccines-page.tsx` | **Vaccine infinite cache/DOM is uncapped.** Timeline/growth stop at soft max 20 pages; vaccines always follow `nextCursor` with no page soft max and no list visible cap — `entries` maps every loaded page. Repeated Load more can grow the QueryClient cache and full list DOM without a retention bound. Volume is usually low, but this is the same class of unbounded retention the Performance soft caps fixed elsewhere. Prefer the same soft-max + `partialCapped` (or a list window) pattern. | fixed |

**Round notes:**

- **Lens:** Memory — listeners/timers, unbounded caches, retained closures, module state, whole-result retention, bad money/sum casts. Focus: Insights sync interval, feed timer, vaccine infinite query, timeline/growth caches after Performance caps.
- **Timers / listeners (clean):**
  - Insights sync: `setInterval` cleared on effect cleanup; `cancelled` skips truncate after unmount mid-fetch; `visibilitychange` removeEventListener on cleanup (`baby-insights-dashboard.tsx:209-278`).
  - Feed timer: 250ms `setInterval` cleared when `timerRunning` stops or unmount (`baby-feed-form.tsx:49-55`).
  - Sleep open-check: `checkGen` bump on unmount cancels stale UI apply (`baby-sleep-form.tsx:101-106`).
- **Timeline / growth caches (bounded — not refiled):** Soft max 20 pages (`BABY_TIMELINE_SOFT_MAX_PAGES` / `BABY_GROWTH_SOFT_MAX_PAGES`); Insights list DOM default 100 + Show more; sync truncate to first page shrinks timeline retention. Soft caps / list caps are intentional Option A bounds — do not refile as Memory blockers.
- **Charts / KPI arrays:** Still hold full loaded pages (up to soft max) by design; bounded, not streamed — acceptable under Option A.
- **Module-level / money casts:** No growing baby module caches; no `SUM`→`::int` in vaccine/care/growth services for this draft.
- **Nit/FYI (do not block):** Sync path could re-check `cancelled` after `applyBabyTimelineSyncTruncate` before `setAllowTimelineAutoFetch(false)` (rare setState-after-unmount); `windowBabyGrowthInfiniteData` unused while soft max already bounds growth pages.
- **Critical / Major:** none. **Enhancement:** 1 (vaccine uncapped infinite).
- **Verdict:** Request changes — not clean.

**Fix round (memory):**

- **Vaccine soft max:** `BABY_VACCINES_SOFT_MAX_PAGES = 20`; `babyVaccinesNextPageParam` stops when `allPages.length >= soft max` (same pattern as timeline/growth); infinite options pass `pages` into getNextPageParam.
- **Honest partialCapped note:** `babyVaccineListCopy` → `partial` / `partialCapped`; Vaccines page uses `hasNextPage` for Load more and shows `vaccine.partialList` vs `vaccine.partialListCapped` (EN/VI).
- **Verify:** `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-query-options.test.ts lib/baby-vaccine-list-state.test.ts lib/baby-i18n.test.ts` — 48 pass.
- **Self-approve:** no — verifier re-runs Memory lens.

**Memory (RE-RUN 1) — after Fix round 1:**

- **Prior Enhancement (vaccine soft max + partialCapped) — verified real (not mock theater):**
  1. `BABY_VACCINES_SOFT_MAX_PAGES = 20` (`lib/baby-query-options.ts:209`).
  2. `babyVaccinesNextPageParam` returns `undefined` when `allPages.length >= maxPages` (`:490-497`); `babyVaccinesInfiniteQueryOptions` passes `pages` into `getNextPageParam` (`:519-520`).
  3. Unit stops at soft max with cursor still present (`baby-query-options.test.ts:720-731`).
  4. UI: `canLoadMore = listQuery.hasNextPage`; `listIncomplete` from last-page cursor; `babyVaccineListCopy` → `partial` / `partialCapped`; page shows `vaccine.partialList` / `vaccine.partialListCapped` (`baby-vaccines-page.tsx:51-59`, `:139-145`; EN/VI keys present). Soft-max hit with remaining cursor → Load more hidden + capped copy (same class as timeline/growth).

- **Checklist re-scan:**
  - **Timers / listeners:** Insights sync `clearInterval` + `visibilitychange` remove; feed 250ms interval clear; sleep `checkGen` cancel — still clean.
  - **Caches / lists:** Timeline, growth, vaccines all soft-max 20; Insights list default window 100; timeline sync truncates to first page.
  - **Module state / money casts:** No growing baby module caches; no `SUM`→`::int` in baby services for this draft.
  - **Closures / long-lived refs:** No new unbounded retention beyond intentional Option A soft caps.

- **Nit/FYI only (do not block):** Sync could re-check `cancelled` after truncate before `setAllowTimelineAutoFetch(false)`; `windowBabyGrowthInfiniteData` unused while soft max already bounds growth; Insights Show more can grow visible DOM up to loaded soft-max rows by design.

- **New Critical / Major / Enhancement:** none.

- **Verdict:** Memory review: clean.

---

## Fix notes (TDD skipped)

List any docs-only items where TDD was skipped:
