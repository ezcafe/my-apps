# TDD test-case review: insights-ux-deltas-filters-urgency

**Result:** ok  
**Round:** 1  
**Updated:** 2026-09-27

## Coverage vs tasks

| Task | Scenario | Covered in 04-tasks? |
|------|----------|----------------------|
| 1 Money MoM | null hide; non-null wire; e2e/unit | yes |
| 2 Due helpers | overdue / due-soon / paid_off | yes |
| 3 Urgency strip | counts; quiet zero; link `/loans` | yes |
| 4 Baby filters | dirty/Apply; e2e Care→Sleep | yes |
| 5 Skeleton/a11y | strip placeholder; triggerCount | yes |

## Gaps → fold into `04-tasks.md`

1. Task 1: add explicit unit that `expenseMomTrend` with single month returns null (regression guard) — optional if already in analytics-stats tests.
2. Task 3: assert due-soon excludes overdue in the same sample set (already implied by Task 2 — add one strip-level count test).

## Fix ask (folded into 04-tasks)

1. Task 2 TDD: add checkbox that due-soon sample with both overdue and due-soon loans counts only non-overdue in due-soon bucket.
2. Task 3 TDD: unit count helper returns `{ overdue: 1, dueSoon: 1 }` for mixed fixture (not 2 due-soon).

## Auto-approve for Gate B?

**Yes** after parent folds Fix ask into `04-tasks.md` (small). Result **ok**.

## Round notes

- Main-thread TDD review. No production code.
