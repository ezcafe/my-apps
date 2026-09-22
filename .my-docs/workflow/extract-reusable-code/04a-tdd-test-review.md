# TDD test-case review: extract-reusable-code

**Result:** clean
**Round:** 1
**Updated:** 2026-09-22

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | override wins title/crumbs/cta | yes |
| 1 | real | default CTA link when no override / no actions | yes |
| 1 | real / edge | `actions` provided → default CTA absent | yes |
| 2 | real | wrappers bind correct resolver | yes |
| 3 | real | existing money-app-header active tests | yes (reuse) |
| 4 | n/a | docs check | n/a |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Enhancement | 1 | override sets `cta: null` while resolved has CTA → no default link | Unit: override cta null clears default CTA |
| Nit | 2 | pathname change updates title | Optional; resolvers already unit-tested |

## Real scenarios checked

- Happy path: resolved header → PageHeading props; Investment default CTA
- User-visible failures: n/a (presentational; wrong merge caught by unit)
- Empty / loading / permission: n/a for chrome extract

## Edge scenarios checked

- Boundaries / invalid input: override null CTA vs missing actions
- Concurrency / double-submit / idempotency: n/a
- Offline / partial data / race: n/a

## Fix ask for Build

Concrete tests to add or strengthen:

1. Task 1 — add unit: when override `{ cta: null }` and resolved has CTA, rendered actions omit default Link (matches current Loan/Investment merge: `"cta" in override`).

## Round notes

- Result **clean** with one Enhancement for Build to include; fold into Task 1 tests during Build (not blocking Gate B).
