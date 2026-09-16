# Lens: memory — baby-insights-activity-log-money-parity

**Result:** clean
**Round:** 2
**Updated:** 2026-09-16

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | None | — |

## Round notes

Round 2 after Merged SPM Fix (P1 concurrency pool, P2 scoped invalidate; P3 deferred). Recheck: selection `Set`, portal bar, concurrency pool, invalidate.

### Listener / subscription / timer leaks

- **Pass.** Insights `visibilitychange` listener removes on effect cleanup (`baby-insights-dashboard.tsx`).
- **Pass.** Timeline sync `setInterval` clears on cleanup and sets `cancelled` so late async work does not write after unmount.
- **Pass.** `BabyActivitySelectionBar` uses `useSyncExternalStore(subscribeNoop, …)` (Money `TransactionSelectionBar` pattern); subscribe returns a no-op unsubscribe — no retained listeners.
- **Pass.** `createPortal(…, document.body)` unmounts when `selectedCount <= 0` or the dashboard unmounts; no manual DOM retain.

### Unbounded caches / in-memory lists / selection Set

- **Pass.** `selectedKeys` is component state (`useState<Set<string>>`), not module-level. Cleared on filter apply/reset, panel close, and bar Clear.
- **Pass.** Select-all only adds the DOM visible window (`visibleSelectionKeys` / `BABY_INSIGHTS_LIST_VISIBLE_CAP`). Show-more / load-more retention is intentional (design lock #12) and still capped by loaded React Query pages (`BABY_TIMELINE_SOFT_MAX_PAGES` / `BABY_GROWTH_SOFT_MAX_PAGES` = 20).
- **Pass.** Sync / load shrink prunes orphans via `pruneActivityLogSelectionToLoadedKeys` on `activityRows`; keys cannot outlive loaded rows.
- **Pass.** No new module-level `Map` / cache in `baby-activity-selection-bar.tsx` or selection helpers. `ACTIVITY_LOG_DELETE_CONCURRENCY` is a number constant only.

### Concurrency pool (SPM Fix P1)

- **Pass.** `mapAllSettledWithConcurrency` allocates a fixed `results` array of length N and at most `limit` (6) worker closures for the delete call. Locals drop when the handler returns — not a growing retain.
- **Pass (improved vs Round 1).** Peak in-flight GraphQL work is now **≤ 6**, not N. Soft-capped selection can still be large, but concurrent promise/response retention is bounded. Same settle → prune / Alert path; no long-lived pool state.
- **FYI (not a finding):** Total delete count can still be large across waves; each wave is transient. Perf may discuss RPM pacing; memory does not see an unbounded retain from the pool.

### Delete loops / retained closures

- **Pass.** Multi-delete snapshots `keys` / `targets` then pooled settle. Locals (`results`, `settled`, post-invalidate flatMaps) are function-scoped and dropped after settle; prune uses functional `setSelectedKeys` so mid-flight Clear / panel close (empty `prev`) cannot re-grow the Set from settled keys.
- **Pass.** `actionBusy` gates bar + row chrome so selection does not grow while deletes are in flight.

### React Query invalidation (SPM Fix P2)

- **Pass.** Post-delete uses `invalidateBabyQueries(queryClient, activityLogDeleteInvalidateScope(targets))` — `"care"` or `"growth"`, not default `"all"`. Marks existing scoped caches stale; does not add a new unbounded store.
- **Pass (improved vs Round 1).** Care-only deletes skip growth/vaccines/telegram/sync/profile churn; mixed/growth still refresh growth + timeline + series only. Temporary refetch peak is smaller than Round 1 `"all"`.
- **Pass.** `stillVisible` rebuild reads current timeline/growth cache only and does not keep extra copies beyond the handler frame.

### Money / sum casts

- **N/A.** This draft does not touch money `*_minor` / `SUM(…)::int` paths. No bigint→int4 casts in selection / delete / invalidate / pool wiring.

### Long-lived retained references

- **Pass.** Selection stores composite string keys only (`care|growth:id`), not full row/`payload` objects.
- **Pass.** `editRow` holds one `ActivityLogRow` while the modal is open; cleared via `onClose` → `setEditRow(null)`.
- **Pass.** Portal bar receives count/labels/callbacks only — no copy of the selection Set.
- **FYI:** Deferred P3 (extract selection so charts do not re-render) is a render-cost item, not a leak. Left for Perf / follow-up.
