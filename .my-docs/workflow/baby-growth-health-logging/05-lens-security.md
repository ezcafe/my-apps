# Lens: security — baby-growth-health-logging

**Result:** clean
**Round:** 1
**Updated:** 2026-09-19

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| S1 | Enhancement | `lib/validators/baby.ts` (`createBabyGrowthSchema` / `updateBabyGrowthSchema`); Insights edit notes field | Zod still accepts free-text `notes` (max 2000) on non-`temperature` growth kinds. Growth UI does not collect those notes; Insights still shows a notes field for non-temp rows. Expands optional health free-text beyond D5’s structured symptoms-only intent for this pass. | Optional follow-up: reject or strip `notes` unless `kind === "temperature"` (or allowlist empty/null only); keep Insights temp path that preserves symptoms JSON. |
| — | — | Vaccines UI vs GraphQL | Vaccines page is read-only; `createBabyVaccine` / `updateBabyVaccine` / `deleteBabyVaccine` stay exposed. **Not a defect** — D3 Growth facade requires these mutations; both UI and API still sit behind `requireBabyWriteWorkspace` + `workspaceId` scoping. | Keep as designed. Do not remove vaccine mutations without another Growth write path. |

## OWASP coverage (security lens only)

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 | pass | Growth/vaccine list + CRUD use `requireBabyWorkspace` / `requireBabyWriteWorkspace`; services filter `id` + `workspaceId` (`growth.ts` / `vaccines.ts`). Cross-workspace id → `NOT_FOUND`. Vaccines read-only is UX write-home only; authz unchanged. |
| A02 | N/A | No new secrets/crypto. Health fields stay workspace-private at rest (same Baby pattern). Notify summary uses kind only, not names/notes/symptoms. |
| A03 | pass | Drizzle parameterized queries. Temperature `notes` → `JSON.parse` then allowlisted symptom ids (`baby-growth-symptoms.ts`); invalid JSON rejected by Zod. React text children for names/summaries; no `dangerouslySetInnerHTML` in Growth/Vaccines draft UI. |
| A04 | pass | Server enforces med/vitamin name, pump amount+unit, temp-or-symptoms, vaccine name+dose first\|second. Symptom ids allowlisted `v:1`. Residual: free-text `notes` on non-temp kinds (S1 Enhancement). Baby GraphQL RPM still applies. |
| A05 | N/A | No new CORS, CSP, or debug flags; existing shell security headers unchanged. |
| A06 | N/A | No new npm dependencies in this draft (schema enum + app code only). |
| A07 | pass | Same Baby session + membership gate as other Baby GraphQL paths; writes use `requireBabyWriteWorkspace`. |
| A08 | pass | Structured symptoms version + allowlist; unknown ids rejected. Vaccine `source` still client-optional on GraphQL (pre-existing; Growth create input omits `source`). |
| A09 | pass | New Growth/Vaccines UI paths do not log notes/symptoms/PII. `mapServiceError` avoids leaking internals; notify uses kind label only. |
| A10 | N/A | Fixed `POST /api/graphql/baby` only; no server fetch of user URLs. |

Source: https://owasp.org/Top10/

## Round notes

- **Scope:** Draft Growth rename + health kinds (Zod/GraphQL/growth.ts), vaccine facade on Growth, Vaccines read-only UI, symptoms-in-notes, Insights date-only (authz-neutral). Compared to `03-design.md` Security / OWASP abuse cases.
- **Vaccines read-only vs API writable:** Intentional (D3 / Gate A). Removing GraphQL vaccine mutations would break Growth. UI-only restriction is correct product boundary, not broken access control.
- **PII:** Temperature symptoms minimized to allowlisted JSON; med/vitamin names in `valueText` (required, capped). Free-text vaccine `notes` still allowed by schema but Growth form does not send them this pass.
- **No Critical/Major.** S1 optional privacy tightening only. No production fixes in this Task.
