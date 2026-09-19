# Lens: security — baby-activities-page

**Result:** clean
**Round:** 1
**Updated:** 2026-09-18

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | No Critical/Major security findings in this draft. | — |

## OWASP coverage (security lens only)

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 | pass | Reads/mutations go through existing `POST /api/graphql/baby` with session cookies (`credentials: "include"`). Resolvers use `requireBabyWorkspace` / `requireBabyWriteWorkspace`; deletes filter by `workspaceId` + id (`deleteBabyEvent` / `deleteBabyGrowth`). Client never sends a foreign workspace id. Nav/home/cue links are hard-coded `/baby/activities`. |
| A02 | N/A | No new secrets, tokens in URLs, or crypto surfaces. |
| A03 | pass | Reuses parameterized GraphQL → DB path. Ledger renders `title` / `summary` as React text children; no `dangerouslySetInnerHTML` / `eval` in new Activities UI. |
| A04 | pass | Matches design threat model: server re-checks ownership; no new bulk-delete API (same per-id loop + concurrency 6 as prior Insights log); enable helpers are query UX only, not authz. |
| A05 | pass | No new CORS, debug flags, or error-shape changes; route is thin page under existing Baby layout. |
| A06 | N/A | No new dependencies / lockfile changes in this draft. |
| A07 | pass | Same Baby session cookie + workspace gate as other Baby pages; Activities under `app/(shell)/baby/`. |
| A08 | N/A | No webhooks, unsigned updates, or new integrity surfaces. |
| A09 | pass | New client paths do not log payloads/PII; mutations stay on existing server norms. |
| A10 | N/A | Fixed GraphQL endpoint only; no server fetch of user URLs. |

Source: https://owasp.org/Top10/

## Round notes

- Compared draft to `03-design.md` Security design review (trust boundaries + abuse cases): open-redirect cue/home links hard-coded; XSS via text escaping; IDOR relies on existing workspace-scoped deletes — all held in code.
- Scope reviewed: `baby-activities-page`, Insights cue + growth enable, nav/header, Home pending link, GraphQL reuse via `buildBabyInsightsQueryFns` / `babyGraphQLRequest`. No production security fixes in this Task.
