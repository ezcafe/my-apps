# Test log: extract-reusable-code

**Result:** success
**Mode last run:** full
**Round:** 1
**Updated:** 2026-09-22

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm run build` | 0 | ok |
| Unit | `pnpm test` | 0 | includes new merge tests + header suites |

**Smoke result:** smoke-pass

## Coverage (full mode only)

| Criterion / flow | E2E file / test | Status |
|------------------|-----------------|--------|
| Investments home H1 | `e2e/investments.spec.ts` — home shows Investments heading | covered (skipped locally: no E2E_STORAGE_STATE) |
| Loans home H1 | `e2e/loans.spec.ts` — home shows Loans heading | covered (skipped locally: no E2E_STORAGE_STATE) |
| Merge override / CTA / actions | `lib/money-family-heading-merge.test.ts` | covered (unit) |

**E2E stack:** playwright
**E2E command:** `pnpm exec playwright test e2e/investments.spec.ts e2e/loans.spec.ts -g "heading"`

No MISSING e2e for wave 1 — existing heading tests suffice; auth storage required to execute.

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm run build` | 0 | reused smoke |
| Unit | `pnpm test` | 0 | reused smoke |
| E2E | playwright heading filter | 0 | 2 skipped (no E2E_STORAGE_STATE) |

## Failures (if any)

-
