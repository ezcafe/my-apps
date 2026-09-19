# Lens: memory — baby-activities-page

**Result:** clean
**Round:** 1
**Updated:** 2026-09-18

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | None | — |

## Round notes

Focus: Activities sync interval, Insights growth auto-page when `moreOpen`, selection state, query caches. Draft code + `03-design.md` / `04-tasks.md` ownership locks.

### Listener / subscription / timer leaks

- **Pass.** Activities `visibilitychange` listener removes on effect cleanup (`baby-activities-page.tsx` ~243–248).
- **Pass.** Timeline sync `window.setInterval` clears on cleanup and sets `cancelled` so late `syncTimelineFirstPage` work skips cache writes after unmount (~296–324). Interval is skipped when tab hidden (`babyRefetchInterval` → `false`) or `listsEnabled` is false.
- **Pass.** Insights has **no** timeline sync interval, visibility poll, or timeline auto-page after the move (`baby-insights-dashboard.tsx`; guarded by `lib/baby-activities-enable.test.ts`).
- **Pass.** `BabyActivitySelectionBar` uses `useSyncExternalStore(subscribeNoop, …)` — subscribe returns a no-op unsubscribe; portal unmounts when `selectedCount <= 0` or page unmounts.

### Unbounded caches / in-memory lists / selection Set

- **Pass.** Timeline auto-page capped at `BABY_TIMELINE_MAX_PAGES` (8); after sync truncate, `allowTimelineAutoFetch: false` stops re-walking every tick. Sync always replaces with first page only (`replaceBabyTimelineFirstPage` / `applyBabyTimelineSyncTruncate`).
- **Pass.** Load more stops at soft max (`BABY_TIMELINE_SOFT_MAX_PAGES` / `BABY_GROWTH_SOFT_MAX_PAGES` = 20) via `babyTimelineNextPageParam` / `babyGrowthNextPageParam` — bounds QueryClient pages and merged list size.
- **Pass.** Insights growth enable follows `moreOpen` only; auto-page uses `BABY_GROWTH_MAX_PAGES` (4) then manual load-more to soft max. Disabled when collapsed; no always-on growth fetch.
- **Pass.** Activities enables timeline + growth on mount (no expand gate) but does **not** auto-page growth — only timeline auto-page + user load-more.
- **Pass.** `selectedKeys` is component `useState<Set<string>>`, not module-level. Cleared on filter apply/reset and bar Clear. Sync/load shrink prunes orphans via `pruneActivityLogSelectionToLoadedKeys` on `activityRows`. Select-all only adds the DOM visible window (`BABY_INSIGHTS_LIST_VISIBLE_CAP`).
- **Pass.** No new module-level `Map` / growing cache in Activities enable helpers or page owner.

### Holding whole result sets / query caches

- **Pass.** Infinite queries stay cursor-paged; soft max prevents unbounded retention per key. Shared Insights/Activities keys when date bounds match (design intent) — one QueryClient entry, not duplicate stores while both routes are not mounted together.
- **Pass.** List DOM is windowed (`babyInsightsVisibleListRows`); Show more grows the window only up to already-loaded rows (still soft-capped by page max).
- **FYI (not a finding):** Changing date range leaves prior bound keys inactive until default TanStack GC — normal; pages per key remain soft-capped. `windowBabyGrowthInfiniteData` stays a defensive helper unused on the happy path (next-page stop is enough).

### Money / sum casts

- **N/A.** This draft does not touch money `*_minor` / `SUM(…)::int` paths. No bigint→int4 casts in Activities / Insights growth wiring.

### Long-lived retained references

- **Pass.** Selection stores composite string keys only (`care|growth:id`), not full row/`payload` objects. `editRow` holds one row while the modal is open; cleared on close / after save clear.
- **Pass.** Delete handler locals (`keys`, flatMaps, settle arrays) are function-scoped and drop after settle; concurrency pool size is fixed (`ACTIVITY_LOG_DELETE_CONCURRENCY`).
- **Nit/FYI (do not block):** Sync path could re-check `cancelled` after `applyBabyTimelineSyncTruncate` before `setAllowTimelineAutoFetch(false)` (rare setState-after-unmount). Not a timer/listener leak.
