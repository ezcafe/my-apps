# Lens: performance — baby-care-pump-lr-timer

**Result:** clean
**Round:** 1
**Updated:** 2026-09-19

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement. | — |

## Round notes

- **Scope:** Pump L/R + TimedCareChip extract + widened care-timer store + guidelines Row 4 + feed/sleep chrome parity + `PUMP_AMOUNT` quick-care. Surfaces: `baby-home`, `BabyTimedCareChip`, `BabyCareGuidelines`, care-timer store, feed/sleep forms, quick-care server. Fresh context; did not write this draft. Did not edit `05-review-log.md` or other lens files.
- **Skills applied:** `performance-optimization` (N+1 / unbounded fetch / hot-path / measure-first); `vercel-react-best-practices` (`async-parallel`, `rerender-*`, `bundle-*`, no new client waterfalls).

### Clean / OK

| Check | Evidence |
|-------|----------|
| **No new N+1** | `PUMP_AMOUNT` reuses the same `writeFeedLegs` path as `FORMULA` (`features/baby/server/quick-care.ts`) — at most one find-by-id + one insert/update per amount step; optional prior `saveBreast` in the same lock. Feed form stop = one `createBabyFeed`. Sleep = one indexed `babyOpenSleep` + start/end mutation. |
| **Bounded / no list walks** | Home still one `babyHomeQuickStatus` query. Sleep open check is a single-row op (comment: not a timeline walk). Care-timer is localStorage only (one key + one-time migrate). No new infinite queries or unbounded fetches. |
| **Waterfalls** | Home: single status query. Feed/sleep: mutate then scoped `invalidateBabyQueries(…, "care")` (timeline + insightsSeries in parallel) — existing pattern, not a sequential fan-out of new lists. |
| **Home hot path (timers)** | Parent clock stays **≥30s** (`setInterval(…, 30_000)`). Breast/Pump elapsed isolated in `BabyBreastElapsedText` (1 Hz + visibility/focus wake); one elapsed child while any timed side runs. Pump L/R share that child — no second 1 Hz interval. |
| **Guidelines** | Collapsed by default; body DOM only when a section is open; exclusive accordion (one panel). Static EN/VI strings — no fetch. |
| **TimedCareChip** | Presentational only (~87 LOC); adapters own start/stop. No store subscription, no interval inside the chip. |
| **Care-timer store** | Pure helpers; O(1) parse/read/write; one running side; migrate once from `breastTimer.v1` → `careTimer.v1`. No polling. |
| **Bundle** | Small extract modules (`baby-timed-care-chip`, `baby-care-guidelines`) + existing stroke icons in `icon-baby-nav`. No new chart/libs/dynamic deps. Growth Pump capture removal (sister surface) reduces capture surface, not home chunk weight. |
| **Invalidate scope** | Care writes still timeline + insightsSeries only — not profile/sync/telegram. |

### FYI — residuals (not open findings)

| Note | Why not Critical/Major/Enhancement |
|------|-------------------------------------|
| Feed form `setInterval(1s)` → `setNowMs` on the whole `BabyFeedForm` while a timed side runs | Tree is small (4 chips + amount row + one field). Better than prior local **250 ms** tick. Home already isolates 1 Hz for the large status/next-due tree. Isolate like `BabyBreastElapsedText` only if measure shows jank. |
| Feed elapsed tick lacks `visibilitychange` / `focus` wake (home child has both) | Wake correctness / UX, not load. Next tick (≤1s) corrects face after return. |
| Home Nap elapsed rides the ≥30s parent `clock` | Coarser updates — **better** for re-render cost; pre-existing next-due clock budget. Not a regression from Pump/TimedCareChip. |
| `guidelineSections` array rebuilt each `BabyHomeContent` render | Four tiny static sections; cost is noise. Repo avoids default `useMemo`. |
| Home LOC ~1.2k with Row 3–4 | Locked Option 2 packaging + guidelines; no heavy deps. Measure before further splits. |

**Result:** **clean** — no Critical / Major / Enhancement for this draft’s performance surface.
