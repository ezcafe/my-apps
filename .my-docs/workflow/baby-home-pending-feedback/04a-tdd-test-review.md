# TDD test-case review: baby-home-pending-feedback

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-19

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | edge | Owner map for each action kind/side/ml/kind | yes |
| 1 | edge | Recovery-visible `false` while `saving` for `sending` and `unknown` (Retry mid-flight) | yes |
| 1 | edge | Recovery-visible `true` for remount / orphaned `sending` (`!saving`) | yes |
| 1 | edge | Recovery-visible `true` for `unknown` / `tooOld` with `!saving` | yes |
| 2 | real | Mid-flight `saving` + pending `sending` — no false failure / Try again | yes |
| 2 | edge | Retry mid-flight at home: `saving` + pending still `unknown` — no recovery chrome | no |
| 2 | edge | Seeded orphaned `sending` (`!saving`) — recovery under owner, not page strip | yes |
| 2 | real | Seeded `unknown` FORMULA — recovery under bottle; Try again + Discard | yes |
| 2 | real | Seeded tooOld — Activities + Discard under owner; no Retry; no page strip | yes |
| 2 | edge | Ambiguous fail — no `chainFailed` when inline recovery shows | yes |
| 2 | real | Chip optional recovery slot — non-`<p>`; feed default unchanged | yes |
| 2 | real | Explicit “no page `pendingTitle` / tooOld strip” after rewrite of old pending-bar test | partial |
| 3 | edge | Hang + reload / orphaned `sending` — under-owner recovery (not silent) | yes |
| 3 | real | In-flight start — no page pendingTitle flash | yes |
| 3 | real | Rewrite `pendingTitle()` locators to under-owner | yes |
| 3 | real | tooOld e2e — under-owner Activities / Discard (`pendingTooOldTitle` rewrite) | partial |
| 4 | real | i18n `home.pending*` still resolve; skeleton unchanged / green | yes |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 2 | Acceptance says Retry mid-flight quiet via `!saving`, but reds only cover `saving` + `sending`. Home can still show recovery from `unknown` while saving if it bypasses the helper. | Unit in `baby-home.test.ts`: render with `saving`-equivalent mid-retry (or force `saving` + `pendingSeed` `unknown`) → assert no Try again / no recovery chrome under chips |
| Major | 3 | Acceptance requires tooOld under owner; TDD reds name hang/reload + `pendingTitle()` only. Existing e2e uses page `p` via `pendingTooOldTitle()` — not covered by the `pendingTitle()` rewrite bullet. | E2E: after seed aged pending + reload, assert too-old copy + Open Activities / Discard **under owning group**; assert old page-strip locator count 0 (or re-scope helper and document it) |
| Enhancement | 2 | Old `pending bar: none / retryable / tooOld` test must flip to under-owner asserts; “not page strip” is vague. | Strengthen rewrite: assert recovery nested under bottle/owner testid (or dedicated recovery region); assert no standalone page bordered pending strip |
| Enhancement | 2 | Confirm-then-start (no optimistic timer) is acceptance-only. | Keep/extend existing timer-after-confirm unit; assert idle chip while hung save if not already covered |

## Real scenarios checked

- Happy path: quiet in-flight start; success → timer/Done after confirm (acceptance + e2e in-flight; timer assert Enhancement).
- User-visible failures: unknown under owner (bottle unit); tooOld under owner (unit); hang+reload under owner (e2e planned).
- Empty / loading / permission: N/A for this UX (no new auth); muted Saving… optional via existing announcement path.

## Edge scenarios checked

- Boundaries / invalid input: tooOld age boundary stays on existing `babyQuickPendingView` tests (unchanged math).
- Concurrency / double-submit / idempotency: Retry uses stored payload (existing + e2e keep); Discard clears; no auto-retry on mount (existing test keep).
- Offline / partial data / race: orphaned `sending` after remount (Task 1 + 2 + 3); Retry mid-flight `!saving` (Task 1 yes; Task 2 home **gap**).

## Fix ask for Build

Concrete tests to add or strengthen:

1. **Task 2 unit:** `saving === true` + pending still `unknown` (Retry mid-flight) → no under-chip recovery / no Try again (pairs with Task 1 helper red).
2. **Task 3 e2e:** tooOld path — rewrite/assert `pendingTooOldTitle` (or successor) under owning trigger; Activities + Discard; no page strip.
3. **Task 2:** When rewriting `pending bar: none / retryable / tooOld`, assert under-owner placement (not only “Try again present somewhere on home”).
4. **Task 3:** Keep hang+reload under-owner (bottle/diaper/sleep/breast); do not treat orphaned `sending` as “silent because sending.”

## Round notes

- Design-review Result **clean**; Feedback contract locks (`!saving` quiet vs orphaned remount-`sending`) are reflected in Task 1 reds.
- Prefer few strong tests: helper coverage is good; main holes are home Retry mid-flight red + explicit tooOld e2e under-owner.
- No production code in this stage. Parent: fold Fix ask into `04-tasks.md` when practical → Gate B.
- **Parent fold (2026-09-19):** Fix ask 1–2 added to Task 2/3 TDD lists; under-owner placement strengthened on FORMULA unit.
