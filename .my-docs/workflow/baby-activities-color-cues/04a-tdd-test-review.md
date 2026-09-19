# TDD test-case review: baby-activities-color-cues

**Result:** clean
**Round:** 1
**Updated:** 2026-09-19

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Family map for feed/sleep/diaper/pump/med/growth | yes |
| 1 | edge | Unknown age → border `none`; open sleep → `none` | yes |
| 1 | edge | ml below/near/above vs band | yes |
| 1 | edge | sleep duration below/near/above | yes |
| 2 | real | Row chrome / aria for sample feed+sleep | yes |
| 2 | real | Skeleton accent placeholders | yes |
| 3 | real | Dual breast+pump slots non-null | yes |
| 3 | edge | Legacy single-side migrate | yes |
| 4 | real | Pump start keeps breast | yes |
| 4 | real | PUMP_AMOUNT omits breastRunning | yes |
| 4 | edge | Breast L→R still switches | yes |
| 5 | real | Pump + open nap → nap stays | yes |
| 5 | edge | Non-pump still ends nap | yes |
| 6 | real | Success path no Saved message | yes |
| 6 | edge | saveBlocked / chainFailed still message | yes |
| 7 | real | Nap height idle vs running | yes |
| 7 | real | Elapsed tick isolation | yes |
| 8 | real | E2E Pump independence + quiet save + Activities cue | yes |
| 9 | real | lastPump status empty + item; independent of lastFeed | yes |
| 9 | edge | pump_l / pump amount / legs-only pump detected | yes |
| 9 | real | Skeleton 4 status lines | yes |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Enhancement | 5 | Replay/idempotent pump with open nap | Keep in server suite if fixture exists; assert openSleep still returned |
| Enhancement | 4 | Pump L→Pump R preemption only | Unit: pump_l running → pump_r start clears pump slot only |

## Real scenarios checked

- Happy path: Activities cues; Pump while nap+breast; quiet save; **recent pump status line**
- User-visible failures: saveBlocked / chainFailed still banner
- Empty / loading / permission: skeleton parity Task 2 + Task 9; auth N/A

## Edge scenarios checked

- Unknown age / open sleep → no comparison border
- Legacy timer migrate
- Breast L/R still preempt within family
- Non-pump still ends nap (regression guard)
- lastPump null when only breast/formula feeds exist

## Fix ask (fold into 04-tasks.md before/during Build)

1. Task 4 tests: add pump_l → pump_r preemption (pump slot only).
2. Task 5: if replay fixture exists, assert pump replay does not end nap.

## Round notes

- Result clean after Decision 2 Option 1 folded (Task 9).
- Prefer few strong tests listed in tasks over expanding matrix further.
