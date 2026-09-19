# Test log: baby-home-pending-feedback

**Result:** success
**Mode last run:** lite
**Round:** 2
**Updated:** 2026-09-19 15:52 +0700

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Compiled OK; TypeScript OK; 70 pages |
| Unit | `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-quick-care-pending.test.ts components/baby-home.test.ts components/baby-timed-care-chip.test.ts components/baby-page-skeleton.test.ts lib/baby-i18n.test.ts` | 0 | 61 pass, 0 fail (~0.5s) |

**Smoke result:** smoke-pass

## Lite / full-lite (targeted unit + e2e)

### Round 2 (after Fix-from-tests)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit | `pnpm exec tsx --import ./scripts/test-env.mjs --test lib/baby-quick-care-pending.test.ts components/baby-home.test.ts components/baby-timed-care-chip.test.ts components/baby-page-skeleton.test.ts lib/baby-i18n.test.ts` | 0 | 61 pass (~0.6s); same 5 smoke files |
| E2E (pending + chain) | `pnpm test:e2e e2e/baby-home-option-b.spec.ts -g "reload mid-save\|retry mid-flight\|retry same press\|pending clear\|too-old\|chain failure is all-or-nothing"` | 0 | 6 passed (~39s): chain fail under-owner, reload mid-save (hang quiet), retry mid-flight quiet, retry body, clear/ambiguous/discard, too-old Activities |

**Coverage / add-e2e:** skipped (lite; Task 3 updated existing e2e only).

**Lite result:** success

### Round 1 (superseded)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Unit | same 5 files | 0 | 61 pass |
| E2E (pending paths) | grep without chain fail | 0 | 5 passed |
| E2E (chain fail) | `-g "chain failure is all-or-nothing"` | 1 | Still expected page `home.chainFailed` |

**Lite result (round 1):** failure — fixed in Fix-from-tests (e2e asserts under-owner recovery).

## Coverage (full mode only)

_(not run — lite mode)_

## Runs (full mode)

_(not run — lite mode)_

## Failures (if any)

_(none — round 2 all green)_

## Fix ask for my-code-workflow

_(none)_

## Round notes

- Lite round 2: focused unit green (61). Six Task-3 greps green including chain-failure under-owner + hang/reload/retry mid-flight quiet. Lite **success**.

## Fix notes (my-code-workflow / Fix-from-tests)

**Updated:** 2026-09-19 15:50 +0700

- **Change:** `e2e/baby-home-option-b.spec.ts` — `chain failure is all-or-nothing…` first block after `INTERNAL_SERVER_ERROR` diaper click now asserts under-owner recovery (`pendingTitle` + `pendingRecoveryUnder(page, "diaper")` + Try again / Discard) and `chainFailed` copy count 0. Later double-tap / replay / abort→Try again blocks unchanged.
- **Retest:** `pnpm test:e2e e2e/baby-home-option-b.spec.ts -g "chain failure is all-or-nothing"` → **1 passed** (~14s). No product code changes.
- **Handoff:** closed; lite round 2 re-verified full targeted suite green.
