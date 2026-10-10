# TDD test-case review: app-improvement-discover-ship

**Result:** ok  
**Round:** 1 (expanded #3)  
**Updated:** 2026-10-10  
**Prereq:** `03a-design-review-log.md` Result **clean**

## Planned / existing test cases reviewed

| Task | Scenario type | Test case | Covered? |
|------|---------------|-----------|----------|
| 1 | real | PERFORMANCE kiosk measured; housekeeping prune present | yes — verify / existing tests |
| 2 | real | Spending cold copy non-empty + action-first | yes |
| 2 | real | Form account empty mentions Settings/Accounts | yes |
| 2 | real | Insights fallback mentions add/transaction | yes |
| 3 | real | Presets / table / spend card / form wire constants | yes |
| 3 | edge | No layout/href regression (source/acceptance) | yes — soft |

## Gaps / Fix ask

None blocking.

## Auto-approve for Gate B?

**Yes** for test-case plan quality — human still owns Gate B (HITL blocking) for design + tasks + tests approve on the expanded remaining slice.

## Round notes

- Planned tests match Design #3 contracts.
- main-thread fallback.
