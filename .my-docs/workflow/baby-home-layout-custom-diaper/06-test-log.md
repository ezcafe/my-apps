# Test log: baby-home-layout-custom-diaper

**Result:** success
**Mode last run:** lite
**Round:** 1
**Updated:** 2026-09-20

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 Turbopack; compiled + TypeScript + 71 static routes OK |
| Unit | `pnpm test` | 0 | 1177 tests · 1161 pass · 0 fail · 16 skipped (~8.4s) |

**Smoke result:** smoke-pass

## Lite Round 1 (targeted e2e after lite review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit (focused, review-fix) | `pnpm exec tsx --import ./scripts/test-env.mjs --test` + custom-time / control-height / bottle-selection / i18n / forms / skeleton / timed-chip / ml chips / home / quick-care / validators | 0 | **201 pass** · 0 fail (~1.0s) |
| E2E (home Task 7) | `pnpm test:e2e e2e/baby-home-option-b.spec.ts e2e/baby-care.spec.ts -g "home row order: Nap → Diaper\|Nap Custom time →\|Diaper Custom time →\|Custom ml Edit reopens\|diaper Custom time → createBabyDiaper"` | 0 | **4 passed** · 1 skipped (log capture needs auth) · ~18.6s |
| E2E (log Task 7) | `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm test:e2e e2e/baby-care.spec.ts -g "diaper Custom time → createBabyDiaper"` | 0 | **1 passed** (~13.7s) |

**Coverage / add-e2e:** skipped (Review profile lite; Task 7 e2e already present)

**Lite Round 1 result:** success

### Task 7 coverage (this run)

| Flow | Spec | Status |
|------|------|--------|
| Home row order Nap → Diaper above Pump + Custom time chips | `baby-home-option-b` › home row order… | pass |
| Nap Custom time → `occurredAt` start / `endedAt` end + merged stop title | `baby-home-option-b` › Nap Custom time… | pass |
| Diaper Custom time → `occurredAt` on quick-care | `baby-home-option-b` › Diaper Custom time… | pass |
| Custom ml Edit reopen + second Custom tap save | `baby-home-option-b` › Custom ml Edit… | pass |
| Log diaper Custom time → `createBabyDiaper` `occurredAt` | `baby-care` › diaper Custom time… | pass (with `E2E_STORAGE_STATE`) |

### Notes

- Hydration mismatch warnings on `/baby` (footer tip / bottle ml) appeared in webServer logs; tests still passed.
- Log capture write suite skips without `E2E_STORAGE_STATE`; re-ran that one test with `e2e/.auth/user.json`.

## Coverage (full mode only)

_(not run — lite mode)_

## Runs (full mode)

_(not run — lite mode)_

## Failures (if any)

_(none)_

## Fix ask for my-code-workflow

_(none — success)_

## Round notes

- Lite round 1: focused unit after review fixes green; Task 7 home + log Custom time / row order / Edit / merged stop e2e green.
