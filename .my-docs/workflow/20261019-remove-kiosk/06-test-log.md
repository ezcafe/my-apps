# Test log: 20261019-remove-kiosk

**Result:** failure
**Test path last run:** full
**Round:** 2
**Updated:** 2026-10-19

## Smoke (build + unit — usually written by Build on verify-pass)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | E1 Smoke + this run |
| Unit | `npm test` | 0 | E1 Smoke + this run |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Main flows from `03-design.md` / `04-tasks.md`. Kiosk e2e deleted by design; redirect covered by unit. Baby e2e intentionally out of Verify (Decision N Option 1).

| Criterion / flow | E2E / unit | Status |
|------------------|------------|--------|
| Prefs route retired | Unit `lib/user-preferences-retired.test.ts` | covered (unit) |
| City-search route retired | Unit same file | covered (unit) |
| DROP TABLE + schema gone | Migration + build | covered (process) |
| Settings no kiosk | Unit `settings.test.ts` | covered (unit) |
| Shell nav no kiosk | Unit `registry.kiosk.test.ts` | covered (unit) |
| Permanent `/kiosk` → `/money` | Unit `lib/kiosk-redirects.test.ts` | covered (unit) |
| Chrome path ignores `/kiosk` | Unit `money-tabs-chrome-path.test.ts` | covered (unit) |
| Delete kiosk e2e / modules | Disk delete | covered (delete) |
| Optional Playwright redirect | 04a Enhancement | skipped |

**Required MISSING:** none  
**E2E stack:** playwright  
**E2E command (narrowed):** `npm run test:e2e -- e2e/apple-wallet-settings.spec.ts e2e/loans.spec.ts e2e/workspace-member-app-grants.spec.ts e2e/money.spec.ts e2e/investments.spec.ts`

## Runs (full / lite mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Round 2 |
| Unit | `npm test` | 0 | Round 2 |
| E2E | narrowed non-baby list above | 1 | Auth re-run: **7 failed / 8 passed** — Loans goto/Pay timeouts; Money suite webServer death. Bare Verify without `E2E_STORAGE_STATE` skipped all 19. |

## Failures (if any)

- **What:** Narrowed collateral e2e red (Loans / Money), not kiosk teardown
- **Where:** `e2e/loans.spec.ts`, `e2e/money.spec.ts` (and suite instability)
- **Tied to requirement:** none — Money/Baby bootstrap untouched by Option 1 teardown product paths; teardown locks are unit-covered

## Fix ask for my-dev-flow-code

**Scope:** collateral e2e — **not** remove-kiosk product behavior.

1. Stabilize Loans/Money e2e (+ auth storage state), **or**
2. Parent Decision N: set **e2e: N/A** for this run (teardown has no required e2e; unit coverage complete) and re-enter test-full, **or**
3. Parent Decision N: `gate-c-test-override` + provenance to waive green e2e bar

## Round notes

- Round 1: full suite blocked on baby (13–19 fails)
- Round 2: Decision N Option 1 narrowed e2e — still failure on Loans/Money
- Coverage: no required MISSING for teardown
