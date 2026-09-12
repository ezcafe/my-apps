# Design review log: money-investments-loans-e2e

**Result:** clean
**Round:** 2
**Updated:** 2026-09-11

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | design | **Chosen design** section still empty (Gate 2 not filled). | Fine until Gate 2; then set Option B explicitly. |
| Nit | tasks | Task 1 / `auth.ts` codegen example still points at `/baby`; finance routes need `/money` (or similar) in comments. | Optional when building Task 1: extend codegen comment for finance. |
| Nit | tasks | Task 8a / Task 9 pin More titles but leave entry headings as “expected” (`Record activity`, `Import statement`, `Investments settings`, `Loans settings`). | Optional: pin those strings like Money Task 7’s **Import data**; or rely on `resolve*AppHeader` during build. |

## Fix ask for my-design-workflow

None — round 1 Fix ask is satisfied. No Critical / Major / Enhancement remaining. Nits above are optional and do not block Gate 2 / `my-code-workflow`.

## Round notes

- Gate 1 + Analyze Q&A are clear; Option B split specs fit Depth C. No new product APIs — contracts as test helpers + existing GraphQL via UI is fine. ADR skip is reasonable.
- Verified against live UI: `money-transaction-form.tsx` (Notes & extras), `investment-insights-dashboard.tsx` / `loans-insights-dashboard.tsx` (More gated on non-empty ATF), `loans-dashboard.tsx` + `loan-pay-actions.tsx` / `loan-pay-modal.tsx` (Pay labels + toast), `e2e/baby-care.spec.ts` (skip writes without storage; finance correctly plans full skip).
- Clean only after Majors + Enhancements above are fixed in 01–04 (Nits optional).
- Next: `my-design-workflow` Update-from-design-review → re-run this review.

### Round 1 — Architect update (2026-09-11)

- **`03-design.md`:** Notes & extras + toast **Transaction added**; Investments Insights non-empty ATF seed (kept More); Loans Insights follows Pay seed; list-first **Pay** discovery + toast **Payment recorded in Money**; diagram hard-fail on `/login` when storage set; Write-B Investments open-form exception; local-only workspace warning.
- **`04-tasks.md`:** Task 4 Notes & extras + toast; Task 8 split into 8 (home+More titles) + 8a (import/settings/open-form); Tasks 9–10 Loans More titles + Pay discovery/hard-fail/toast.
- **`01-idea.md` / `02-analysis.md`:** Mirrored Write-B Investments exception + Insights More seed wording.
- **Left out of scope (Nits):** Chosen design still empty until Gate 2; Task 1 codegen `/money` comment nit not applied.

### Round 2 — Verifier re-check (2026-09-11)

- Re-read updated 01–04 against round 1 Fix ask (9 items). All Majors + Enhancements are present in design/tasks (and 01–02 where scope changed).
- Spot-checked live copy: Notes & extras / Transaction added; Pay / Add payment to Money / Record payment / Payment recorded in Money; Investments More titles; Loans More titles; Money More titles — match docs.
- Auth diagram + contracts: skip only when storage unset; `/login` with storage set → hard fail. Write-B Investments open-form exception + local-only warning consistent across 01–03 + Task 8a.
- No new Critical / Major / Enhancement. Remaining items are Nits only → **clean**.
- Next: Gate 2 (if needed) → `my-code-workflow`.
