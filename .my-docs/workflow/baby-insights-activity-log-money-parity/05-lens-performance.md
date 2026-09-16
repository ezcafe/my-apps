# Lens: performance — baby-insights-activity-log-money-parity

**Result:** clean
**Round:** 2
**Updated:** 2026-09-16

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement. | — |

## Round notes

- **Scope:** Re-verify after Merged SPM Fix claimed P1 concurrency cap + P2 scoped invalidate. Activity log Money-parity delete / invalidate path only. Did not re-litigate pre-existing Insights auto-page / series fetch design.
- **Skills applied:** `performance-optimization` (measure → bound fan-out / invalidation storm); `vercel-react-best-practices` (`client-swr-dedup` / scoped invalidate, no new waterfalls or chart bundle bloat from this Fix).

### Prior Critical / Major — verified closed

| Id | Was | Verification |
|----|-----|--------------|
| **P1** | Critical — uncapped `Promise.allSettled` over every selected key (select-all ≤100; retention can grow; GraphQL default RPM 60) | **Closed.** `mapAllSettledWithConcurrency` + `ACTIVITY_LOG_DELETE_CONCURRENCY = 6` (4–8 band) in `lib/baby-insights-activity-log.ts`. Dashboard `handleSelectionBarDelete` uses the pool — no uncapped `Promise.allSettled` on this path. Units prove peak in-flight ≤ limit (n=12, limit=3), reject settle, empty input, constant band. Comment documents select-all / retention vs RPM. |
| **P2** | Major — post-delete `invalidateBabyQueries(queryClient)` default `"all"` cache storm | **Closed.** `activityLogDeleteInvalidateScope(targets)` → care-only `"care"`; growth-only or mixed `"growth"` (growth scope already refreshes growth + timeline + insightsSeries). Dashboard passes scope into `invalidateBabyQueries`. Units cover care / growth / mixed. Matches edit-modal care/growth scoping; avoids vaccines / telegram / sync / profile / homeQuick storm. |

### Deferred residuals (not reopened)

| Was | Status | Note |
|-----|--------|------|
| **P3** Enhancement — selection/`actionBusy` in dashboard parent re-renders KPI + dynamic chart tree | **Deferred** (Merged SPM Fix). Option 1 ownership; full Activity log extract is a follow-up, same as Quality Fix residual. Not a new regression from the pool/scope Fix. |
| **P4** Nit — table + cards dual map (~2× checkbox/Edit nodes) | **Deferred** Round 1 loser. Accept Option 1 dual layout unless list lag shows up. |

### FYI — remaining risk (not Critical/Major)

- Pool caps **parallelism**, not total requests/minute. A very fast 100-delete run can still approach default RPM 60 if each mutation returns in tens of ms. Caregiver busy window + partial/all-fail Alert remain the product safety net. Measure 100-row select-all Delete under default RPM in full test / manual if needed — same residual already noted in Merged SPM Fix notes.

### Clean / OK (unchanged)

- No new server-side N+1; Activity log still soft-capped infinite pages + visible window (`BABY_INSIGHTS_LIST_VISIBLE_CAP` = 100).
- Charts stay `next/dynamic`; selection bar remains a light portal — no chart/bundle cost from Fix.
- Per-row delete GraphQL remains the locked product shape; fan-out is now bounded.

**Result:** **clean** — Round 1 P1 Critical + P2 Major verified fixed in code + units; P3/P4 stay deferred residuals only.
