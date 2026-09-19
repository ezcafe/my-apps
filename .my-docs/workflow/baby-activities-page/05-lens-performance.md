# Lens: performance — baby-activities-page

**Result:** clean
**Round:** 1
**Updated:** 2026-09-18

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement. | — |

## Round notes

- **Scope:** Baby Activities move — dedicated Activities page (timeline + growth lists on mount, sync/auto-page ownership) + Insights growth enable/`moreOpen` auto-page. Fresh context; did not write this draft. Did not edit `05-review-log.md` or other lens files.
- **Skills applied:** `performance-optimization` (N+1 / unbounded fetch / pagination / hot-path / measure-first); `vercel-react-best-practices` (`async-parallel`, `bundle-dynamic-imports`, `client-swr-dedup` / shared RQ keys, no new waterfalls beyond intentional cursor auto-page).

### Clean / OK

| Check | Evidence |
|-------|----------|
| **No new N+1** | Reuses cursor `babyTimeline` / `babyGrowthEntries` list ops; delete still `mapAllSettledWithConcurrency` + `ACTIVITY_LOG_DELETE_CONCURRENCY` (6) + scoped `invalidateBabyQueries` via `activityLogDeleteInvalidateScope`. No new resolvers. |
| **Bounded fetches** | Timeline auto-page ≤ `BABY_TIMELINE_MAX_PAGES` (8) × page limit 100; soft max 20. Growth Insights auto-page ≤ `BABY_GROWTH_MAX_PAGES` (4); soft max 20; page size 50. DOM show-more window `BABY_INSIGHTS_LIST_VISIBLE_CAP` (100). Sync poll uses `inFlight` + first-page truncate (no unbounded re-walk when `allowAutoFetch` false). |
| **Pagination present** | Infinite queries + `getNextPageParam` soft caps; Activities Load more for timeline/growth past auto; Insights More insights growth load-more (`baby-insights-growth-load-more`) past auto cap. |
| **Waterfalls** | Activities starts timeline + growth `useInfiniteQuery` in parallel (good). Cursor auto-page is necessarily sequential — same moved glue as prior Insights log, not a new fan-out. Insights `seriesQuery` independent of growth; growth gated by `moreOpen`. |
| **Decision 2 cost** | Insights growth **off** until More insights expands → lighter Insights first paint vs always-on Option 1. When `moreOpen`, auto-page ≤ 4 pages then manual load-more — bounded. Growth charts live under the expand panel + `next/dynamic`. |
| **Bundle** | Activities: `dynamic` filters + edit modal; no chart imports. Insights: charts remain `next/dynamic` (`ssr: false`). Thin `app/(shell)/baby/activities/page.tsx`. Shared RQ keys preserve cache when ranges overlap. |
| **Hot-path win** | Activity log extract ends prior selection/`actionBusy` re-render of Insights KPI + chart tree (old P3 class). Selection lives on Activities page owner only. |

### FYI — residuals (not open findings)

| Note | Why not Critical/Major/Enhancement |
|------|-------------------------------------|
| Activities cold visit auto-pages up to 8 timeline pages (sequential) | Chosen design: dedicated ledger, no expand gate. Bounded; same caps as pre-move log. Measure before changing. |
| Dual table + `@md:hidden` cards (~2× row nodes) | Same Option 1 layout as prior Activity log; CSS hides one. Accept unless list lag shows up (prior P4). |
| Delete pool caps parallelism, not RPM | Same residual as prior Money-parity lens; busy window + settle Alert remain product net. |

**Result:** **clean** — no Critical / Major / Enhancement for this move’s performance surface.
