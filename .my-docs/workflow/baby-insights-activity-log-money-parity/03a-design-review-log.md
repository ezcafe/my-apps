# Design review log: baby-insights-activity-log-money-parity

**Result:** clean  
**Round:** 2  
**Updated:** 2026-09-16

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | design | **Chosen design** still provisional (awaiting Gate B). | Fill Option 1 after human Gate B; fine for this review. |
| Nit | ui-concept | Lean set is light desktop only; Delete chrome differs slightly between `ui-refs/01` and `02` (text vs filled danger). | Keep lean; Build verifies dark + mobile; prefer Money bar variants (`secondary` / `danger` / `ghost`) at Gate B. |
| Nit | tasks | Task 4 e2e still says multi Edit “not available”; Tasks 3/9 lock **disabled** (visible). Soft wording could tempt a hide assert. | Prefer e2e `toBeDisabled` / accessible name still present; no doc rewrite required for clean. |
| Nit | pattern | Header select-all **indeterminate** (Money `analytics-transactions-table`) is implied by Checkbox reuse, not spelled in locks. | Build: follow Money indeterminate when some-but-not-all visible rows selected. |
| Nit | design | Partial-fail “existing Alert in Activity log panel” means reuse `components/ui/alert` **mounted in** the Activity log panel — panel does not already host a delete Alert today. | Build: add panel `Alert` near the list (Money shape above list); do not hunt for a pre-existing delete Alert. |
| Nit | security-owasp | OWASP A01–A10 table complete; trust boundaries + abuse cases present; selection Set correctly not authz. | Keep Build checklist on workspace-scoped deletes. |

## Fix ask for my-design-workflow

None — Round 1 Fix ask items 1–6 are closed in `03-design.md` / `04-tasks.md`. No Critical, Major, or Enhancement remain.

## Round notes

### Round 2 (this pass)

- Fresh read of `01-idea`, `01a` (Gate A ok), `01b`, `02-skim`, `02-analysis`, updated `03-design`, updated `04-tasks`; checked `docs/ARCHITECTURE.md` (no new feature/API surface — Activity log UI only).
- Visually checked Gate A2 refs: Event + Recorded + checkbox + Edit + bottom bar; `02` shows Edit disabled for 2 selected — matches locked multi-Edit rule; **no IA drift** from `01b` in `03-design`.
- Did **not** re-argue Gate A 80/20.

### Round 1 Fix ask — closure check

| # | Ask | Closed? | Evidence |
|---|------|---------|----------|
| 1 | Sequence: Clear; Delete for `selectedCount >= 1`; failure returns | yes | `03-design.md` mermaid: Clear / Edit / Delete ≥1; cancel confirm no-op; auth/NOT_FOUND rejected settle; partial → keep failed + Alert + busy off |
| 2 | Confirm = `window.confirm` + Baby i18n (no new ConfirmDialog) | yes | Locked pick #2, Patterns, UI, Challenges; Task 7 acceptance |
| 3 | Partial-delete: drop succeeded, keep failed, panel `Alert`; note vs Money | yes | Pick #2, Failure notes, Contracts, UI; Task 7 |
| 4 | Bar Edit **disabled** (visible) when count ≠ 1 | yes | Pick #1, Option 1, UI, a11y; Task 3 |
| 5 | Keep selection on show-more / load-more; clear on filter / panel / Clear / delete prune | yes | Pick #12, Patterns, UI; Task 5 + Task 9 |
| 6 | Skeleton Task 8 same slice as Task 5; Checkpoint B requires parity | yes | Task 5 acceptance + Task 8 deps “same slice”; Checkpoint B checkbox |

### Verdict

- Product locks, Option 1, Money-untouched, composite keys, OWASP table, patterns-to-reuse, and TDD-shaped tasks are enough for Gate B / Build.
- Remaining rows are **Nit** only (do not block clean).
- **Result: clean** — next: TDD test-case review → Gate B → Build → Smoke → review → full test.
