# Lens: performance — baby-log-money-new-form

**Result:** clean
**Round:** 2
**Updated:** 2026-09-19

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No open Critical / Major / Enhancement. | — |

## Round notes

- **Scope:** Quick re-check Growth / vaccine / care chrome draft after Merged SPM Fix (Zod unit only). Fresh context; did not write this draft. Did not edit `05-review-log.md` or other lens files.
- **Fix delta:** `lib/validators/baby.test.ts` only — `createBabyGrowthSchema` rejects forged `kind: "vaccine"`. No production schema, query, invalidate, or UI change. No new perf surface.
- **Skills applied:** `performance-optimization` (N+1 / unbounded fetch / hot-path / cache); `vercel-react-best-practices` (waterfalls, bundle, client data, re-render).

### Clean / OK (re-verified)

| Check | Evidence |
|-------|----------|
| **No list fetch on Growth capture** | `BabyGrowthPage` still create-only. `useQueryClient` for invalidate only; no `useQuery` / `useInfiniteQuery` / list fetch on mount. |
| **No N+1** | One mutation per Save via `runBabyGrowthPageSaveThenStay` → `createBabyGrowth` or `createBabyVaccine`. No per-row follow-ups. |
| **Scoped invalidate** | Vaccine → `vaccines` only; growth kinds → `growth` + `timeline` + `insightsSeries`. Unchanged in `babyGrowthSaveInvalidateScope` + `invalidateBabyQueries`. |
| **Stay path** | `afterSave: BABY_CARE_AFTER_SAVE.growth` ("stay") — no home nav / Home refetch after Growth/vaccine save. |
| **Redirect** | Permanent `/baby/vaccines` → `/baby/growth?kind=vaccine` in `next.config.ts`. Fixed dest; no client data waterfall. |
| **Route delete** | `app/(shell)/baby/vaccines/**` still gone — one fewer capture chunk. |
| **Care chrome** | Feed/sleep/diaper still one-tap mutate + `invalidateBabyQueries(…, "care")` + `quickPickChipCls`. No extra Save or queries. |
| **Skeletons** | Growth `loading.tsx` → static `BabyGrowthPageSkeleton` (no `?kind=` work). |
| **Server list bounds** | Unchanged; this Fix did not touch list APIs. |
| **Bundle** | No new client modules from Zod test Fix. Capture helpers remain small pure modules. |

### FYI — residuals (not open findings; same as Round 1)

| Note | Why not Critical/Major/Enhancement |
|------|-------------------------------------|
| Activities still runs three parallel infinite queries (timeline + growth + vaccines) | Pre-existing list surface; not from this draft. Measure before batching. |
| Growth save invalidates `insightsSeries` while user stays on capture | Correct stale marking; no active observer on Growth → no refetch storm. |
| `saveBlockedReason()` on render | Tiny pure checks; speculative micro-opt. |
| Feed timer `setInterval` 250ms while running | Pre-existing; chrome restyle did not change it. |

**Result:** **clean** — no Critical / Major / Enhancement. Round 1 perf verdict stands; test-only Zod Fix introduced no production perf change.
