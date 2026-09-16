# Lens: security — baby-insights-activity-log-money-parity

**Result:** clean
**Round:** 2
**Updated:** 2026-09-16

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No Critical / Major / Enhancement after SPM Fix (concurrency pool + scoped invalidate). Authz still server-side; client selection / pool / scope are not trust boundaries. | — |

## OWASP coverage (security lens only)

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 | pass | Deletes/updates still hit GraphQL `deleteBabyEvent` / `deleteBabyGrowth` / `updateBaby*` with `requireBabyWriteWorkspace` + service `WHERE id AND workspaceId`. Concurrency pool only schedules the same per-id mutations; guessed foreign UUIDs → NOT_FOUND. Selection `Set` and `activityLogDeleteTargetsFromKeys` remain client UX, not authz. |
| A02 | N/A | No new secrets, tokens, or sensitive URL/storage. Scoped invalidate is TanStack cache keys only. |
| A03 | pass | Selection keys → `parseActivityLogSelectionKey` → GraphQL variables; ORM `eq` paths. No raw SQL from keys. Pool mapper does not concatenate commands. Cell `summary` / titles stay React text (no `dangerouslySetInnerHTML`). Care update still patch-only (`buildActivityCareUpdatePayload`). |
| A04 | pass | Confirm + busy + Edit-when-1 + visible-window select-all unchanged. **SPM Fix:** `mapAllSettledWithConcurrency` + `ACTIVITY_LOG_DELETE_CONCURRENCY = 6` bounds parallel delete fan-out vs Baby GraphQL default RPM (60) — closes the uncapped burst abuse/self-DoS shape without weakening authz. Total deletes still product-allowed after confirm (Money parity). |
| A05 | N/A | No CORS, security-header, or debug-config changes. |
| A06 | pass | No new npm deps; helpers stay in `lib/baby-insights-activity-log.ts`. |
| A07 | pass | Mutations keep session + membership + **write scope** via `requireBabyWriteWorkspace` (stricter than design table’s `requireBabyWorkspace`). Pool does not bypass auth. |
| A08 | pass | Typed GraphQL deletes only. Scoped `activityLogDeleteInvalidateScope` (care → `"care"`; growth/mixed → `"growth"`) matches edit-modal pattern; under-invalidate vs `"all"` is same-workspace UI freshness, not cross-tenant integrity. Worker index bump is sync before `await` (JS single-thread — no skipped/duplicate mapper races that could scramble ids). |
| A09 | pass | No new secret logging; partial/all-fail still via panel `Alert`. No new audit trail beyond existing mutation errors (accepted; same as Money client loop). |
| A10 | N/A | No server fetch of user-supplied URLs. |

Source: https://owasp.org/Top10/

## Round notes

- **Scope (Round 2):** Re-verify Activity log Money-parity **after Merged SPM Fix** — `mapAllSettledWithConcurrency` / `ACTIVITY_LOG_DELETE_CONCURRENCY`, `activityLogDeleteInvalidateScope` → `invalidateBabyQueries(..., scope)`, plus prior selection / multi-delete / edit authz.
- **security-review subagent:** Manual review (skill + OWASP A01–A10). Compared to `03-design.md` Security / OWASP.
- **Design ↔ code:** Still aligns. Client selection is not authz; server keeps workspace + write scope. Concurrency cap improves A04 vs design’s uncapped `Promise.allSettled` note without inventing a bulk-delete API. Scoped invalidate does not widen data access.
- **Checked paths:** `handleSelectionBarDelete` → pool → `babyGraphQLRequest(DELETE_*)` → resolvers `requireBabyWriteWorkspace` → `deleteBabyEvent` / `deleteBabyGrowth` with `workspaceId` in WHERE; parse rejects bad prefixes; edit resolves from loaded rows; busy + confirm gates; invalidate scope care-only vs growth/mixed.
- **Residual (not findings):** Pool caps parallelism, not total RPM over a full 100-delete run (Fix notes; availability / partial-fail Alert). P3 dashboard extract deferred — UX perf only.
