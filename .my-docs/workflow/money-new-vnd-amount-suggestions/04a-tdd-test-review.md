# TDD test-case review: money-new-vnd-amount-suggestions

**Result:** clean  
**Prereq:** `03a-design-review-log.md` Result **clean**

## Planned / existing test cases reviewed

| Task | Scenario type | Test case | Covered? |
|------|---------------|-----------|----------|
| 1 | real | `"25"` + `"000"` → `"25000"` | yes |
| 1 | real | `"25"` + `"000000"` → `"25000000"` | yes |
| 1 | edge | Formatted input strip (`25.000` / `25,000`) then append | yes |
| 1 | edge | Empty / whitespace → `""` | yes |
| 1 | edge | `"0"` + `"000"` → `"0000"` | yes |
| 1 | edge | Successive append `"25"`→`"25000"`→`"25000000"` via two `"000"` taps | yes — folded into Task 1 |
| 2 | real | Form uses helper; VND mode labels `000` / `000.000` | yes (source/render as practical) |
| 3 | real | `parseMajorToMinor("25000","VND") === 25000` | yes |
| 3 | edge | `parseMajorToMinor("25.000","VND") === 25` (trap) | yes |

## Gaps / Fix ask

None blocking. Successive-append unit noted above — add to Task 1 in `04-tasks.md`.

## Auto-approve for Gate B?

**Yes** for test-case plan quality. Gate B HITL is **auto** on this run.

## Round notes

- main-thread fallback — TDD test-case review (usage limit; Tasks unavailable)
- Lite profile: no new e2e required
