# TDD test-case review: baby-care-pages-control-parity

**Result:** clean
**Round:** 1
**Updated:** 2026-09-19

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 Feed | real | No pump / no amount Field; bottle ml chips render | yes |
| 1 Feed | real | Breast stop → createBabyFeed input | yes |
| 1 Feed | edge | Pending disables chips | partial — add if missing in Build |
| 2 Pump | real | Nav `/baby/pump` + header title | yes |
| 2 Pump | real | Pump form L/R + ml; no breast | yes |
| 3 Diaper | real | Dirty opens sheet (no immediate mutate) | yes |
| 3 Diaper | real | Wet/dry save without sheet per plan | yes |
| 4 Growth | real | Unit/Symptoms not Input/checkbox; InputGroup no `$` | yes |
| 4 Growth | real | Two symptoms stay selected | yes |
| 5 Skeletons | real | New Feed/Pump/Diaper/Growth skeleton markers | yes |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Enhancement | 2 | Custom ml modal save path | Unit: custom confirm calls pump amount save |
| Enhancement | 1 | Timer slot independence vs Home | Unit: writing breast slot does not clear pump slot |
| Nit | 3 | Sheet dismiss while saving | Reuse existing `babyDiaperSheetAllowDismiss` tests |

## Real scenarios checked

- Happy path: Feed formula chip; Pump L start/stop; Diaper dirty→sheet→save; Growth weight save
- User-visible failures: notify on GQL error (existing helpers)
- Empty / loading / permission: skeleton tests; auth via existing GQL (no new surface)

## Edge scenarios checked

- Boundaries / invalid input: Growth validators already covered; keep
- Concurrency / double-submit / idempotency: pending disables (Feed/Diaper) — strengthen if missing
- Offline / partial data / race: n/a beyond existing timer store

## Fix ask for Build

Concrete tests to add or strengthen:

1. Task 1: assert breast slot write leaves pump slot intact (shared store).
2. Task 2: custom ml confirm → pump amount mutation (or handler called with ml).
3. Otherwise follow `04-tasks.md` red tests as written.

## Round notes

- Planned tests in `04-tasks.md` are enough for Gate B. Enhancements are Build-time strengthens, not blockers. **Result: clean.**
