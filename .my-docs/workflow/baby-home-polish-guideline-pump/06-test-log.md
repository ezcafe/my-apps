# Test log: baby-home-polish-guideline-pump

**Result:** success
**Mode last run:** lite
**Round:** 1 (lite)
**Updated:** 2026-09-20

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 build green |
| Unit | `pnpm test` | 0 | 1103 pass, 0 fail, 16 skipped |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Skipped — lite mode (no coverage Task).

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Custom Done Bottle + Pump (Task 3) | `e2e/baby-home-option-b.spec.ts` → Custom confirm → tap Custom → Done on Custom tile (Bottle + Pump) | covered (lite run) |
| Quiet guideline rewrite (Task 5) | `e2e/baby-home-option-b.spec.ts` → Row 4 quiet guidelines: one block, no exclusive accordion | covered (lite run) |

**E2E stack:** Playwright (`pnpm test:e2e` / `playwright test`)
**E2E command:** `pnpm exec playwright test e2e/baby-home-option-b.spec.ts -g "Custom confirm → tap Custom → Done on Custom tile \\(Bottle \\+ Pump\\)|Row 4 quiet guidelines"`

## Runs (lite mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit | (skipped) | — | Already smoke-pass (1103 pass) |
| E2E targeted | see command above | 0 | 2 passed / 0 failed (13.7s) |

### E2E cases run

1. Row 4 quiet guidelines: one block, no exclusive accordion — pass (1.2s)
2. Custom confirm → tap Custom → Done on Custom tile (Bottle + Pump) — pass (3.8s)

## Failures (if any)

(none this round)

### Round 1 (historical — smoke)

- **What:** Source-chrome unit assert expects `logPumpAmount(ml)` on custom confirm; product now calls `logPumpAmount(ml, true)`.
- **Where:** `components/baby-pump-form.test.ts` → `custom ml confirm calls pump amount save path`
- **Excerpt:** `AssertionError: The input did not match /onConfirm=\{\(ml\) => \{[\s\S]*logPumpAmount\(ml\)/` — actual has `logPumpAmount(ml, true)`.
- **Tied to requirement:** Pump custom ml confirm-then-tap / Done target (design custom flow; Task pump amount save path).
- **Fixed in Round 2 fix-from-tests:** test regex updated; product unchanged.

## Fix ask for my-code-workflow

(none — lite success)

## Round notes

- Lite: no coverage Task; no new e2e files (04-tasks only requires rewrite/extend of existing `baby-home-option-b.spec.ts`).
- Unit not re-run (smoke-pass already recorded).
- Targeted e2e green for Task 3 Custom Done (Bottle + Pump) and Task 5 quiet guidelines.
