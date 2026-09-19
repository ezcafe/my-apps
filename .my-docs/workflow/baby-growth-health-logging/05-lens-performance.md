# Lens: performance — baby-growth-health-logging

**Result:** clean
**Round:** 1
**Updated:** 2026-09-19

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement. | — |

## Round notes

- **Scope:** Growth Recent merge (N=50 dual fetch), Insights date-only chrome, Growth page forms, bundle impact of new helpers/page. Fresh context; did not write this draft. Did not edit `05-review-log.md` or other lens files.
- **Skills applied:** `performance-optimization` (bounded fetch / N+1 / indexes / hot-path); `vercel-react-best-practices` (`async-parallel`, `bundle-dynamic-imports`, client RQ parallel queries, no new waterfalls).

### Clean / OK

| Check | Evidence |
|-------|----------|
| **Bounded Recent merge** | Design lock: fetch N=50 each side (`BABY_GROWTH_RECENT_LIMIT`), merge, `slice(0, 50)` in `lib/baby-growth-recent.ts`. Server list paths already `limit` + keyset (`listBabyGrowthEntries` / `listBabyVaccines`). No unbounded walk. |
| **No new N+1** | Two list ops + one mutation per Save/Delete. No per-row fetches. Invalidate stays scoped: growth → growth+timeline+insightsSeries; vaccines → vaccines prefix only (`invalidateBabyQueries`). |
| **Waterfalls** | Growth mounts two `useQuery` hooks in parallel (growth + vaccines). Not sequential `await` chaining. Matches `async-parallel`. |
| **Indexes** | Existing `baby_growth_entry_workspace_recorded_idx` and `baby_vaccine_entry_workspace_administered_idx` match orderBy+limit shapes. New kinds (`vitamin`/`pump`) do not change filter/sort shape. |
| **Insights date-only** | Care/growth `FilterMenu`s removed; chips forced empty (= all). Skeleton `triggerCount={1}`. Series + gated growth infinite queries unchanged (growth still behind More insights). Net lighter first chrome vs prior dual FilterMenus. |
| **Bundle** | New helpers are small pure modules (`baby-growth-recent` ~5KB, `symptoms` ~3KB, chips/list-state tiny). Growth route stays thin RSC + Suspense. No new chart/libs on Growth. Insights charts remain `next/dynamic` (`ssr: false`); date bar stays dynamic. |
| **Forms hot path** | Kind-gated fields (one kind at a time); ≤5 symptom checkboxes. No chart tree on capture page. |

### FYI — residuals (not open findings)

| Note | Why not Critical/Major/Enhancement |
|------|-------------------------------------|
| Dual GraphQL HTTP (growth + vaccines) vs one batched op | Parallel RQ; each capped at 50. Design Option 1 + D6. Measure before adding batching. |
| `mergeBabyGrowthRecentEntries` (+ temp `JSON.parse` in summaries) runs on form re-renders | ≤100 mapped rows then top 50; cost is noise at this size. Repo avoids default `useMemo`. |
| Recent waits until **both** queries finish loading (`isLoading` OR) | Simple list-state; avoids flicker. Progressive reveal is optional polish only. |
| Growth Recent has no Load more (Measure had infinite growth) | Explicit design: top-50 merge window. Deeper history stays on Vaccines / Insights / Activities. |
| `InsightsDateRangeFiltersBar` still imported from large `analytics-filters.tsx` | Pre-existing module coupling; this pass only stops mounting extra FilterMenus. Split file only if chunk size shows up in measure. |
| Growth client page ~2× prior Measure LOC (~691 vs ~310) | Locked Option 1 packaging (vaccine facade + kinds). Still no heavy deps. |

**Result:** **clean** — no Critical / Major / Enhancement for this draft’s performance surface.
