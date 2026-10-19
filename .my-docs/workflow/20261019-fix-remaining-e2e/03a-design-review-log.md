# Design review log: 20261019-fix-remaining-e2e

**Result:** clean
**Round:** 1
**Updated:** 2026-10-19

**Isolated reviews:** API **skipped** (Has API = no — Notes-skip only). DB **skipped** (Has DB = no — Notes-skip only). No `03a-api` / `03a-db` files.

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | design | Chosen design still empty (“Fill after Gate B”) — expected Mode simple before Gate B. | Parent fills after Gate B auto; not a design gap. |
| Enhancement | diagram | Sequence shows GQL ok/error but does not name under-owner recovery or Custom dismiss as UI failure returns. | Optional: one alt return for ambiguous fail → pending chrome. |
| Enhancement | tasks | Task 1/4/5 cite test numbers (7–9, 14, 16; failures 3–6, 11–13) without a short map to titles in the idea. | Optional: one-line map in tasks or Build notes for easier Verify. |

## UI alignment (Has UI = yes)

- **03 UI section:** present (not N/A) — Option B row order, chips, hit targets, locale H1, recovery under owner.
- **Build ↔ UI lock:** home structure change updates `baby-page-skeleton` / related skeletons same PR; radii tokens unchanged.
- **#1 / #2:** #1 care taps (breast/bottle/nap/diaper); #2 recovery Try again / discard under owner — matches Design 80/20; not re-litigated.
- **Layout / chrome:** subgrid / auto-fit; Nap left of Diaper; `data-section` / Option B anchors + under-owner pending — matches Analysis reusable patterns; no drift from Grill Q1–Q4.

## Gaps / clarity

- Core problem, outcome, constraints, non-goals present (Mode simple OK).
- Analyze What/Why/How for overall + pieces A–F; ★ systemic + quick wins → Design Option 1 — coherent.
- Grill **Result: frontier-empty**; Settled Q1–Q4 match Design Option 1 and Tasks 0–6; Design does not re-open Settled decisions.
- System design **N/A** with reason (client/UI + e2e; no new boundary) — correct for Has API/DB no.
- Patterns taught (What / How / Why / anti-patterns / Reference); tasks follow restore row, under-owner recovery, scoped wet.
- Sequence has actors + main path; API/DB contracts N/A with reason.
- Tasks sized S/M with acceptance + existing red e2e as TDD bar; Verify matches `00-run.md`.
- Spike (investments alone) kept as Task 0 — consistent with Analyze.

## Security / OWASP (light)

- Trust boundary unchanged (existing e2e session); A01–A10 N/A with reason — enough for this fix-only scope.
- Has auth/PII/schema = no across 00 / 02 / 03 / 04 — consistent.

## Fix ask for my-dev-flow-v2-design

none

## Deferred Enhancements (do not block clean)

- Optional: enrich sequence with recovery/Custom dismiss failure returns.
- Optional: map e2e test numbers to short titles in Task acceptance.

## Round notes

- Mode simple design-verify-phase; API/DB Notes-skip; Grill frontier-empty; zero Critical/Major.
