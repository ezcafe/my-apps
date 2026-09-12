# Test log: money-investments-loans-e2e

**Result:** success
**Round:** 6
**Updated:** 2026-09-12 13:38 +07

## Coverage

Map design success criteria / main flows → e2e.

**Verified:** 2026-09-11 · Depth C + Write B (Money + Loans Pay; Investments open-form) from `03-design.md` / `04-tasks.md` / Gate 1. Unchanged (no new MISSING). Kept for Round 6.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Money home (`/money` Spending heading) | `e2e/money.spec.ts` · `home shows Spending heading` | covered |
| Money add transaction (`/money/new` + unique note + toast) | `e2e/money.spec.ts` · `add transaction with unique note` | covered |
| Money Insights + More teasers | `e2e/money.spec.ts` · `insights More teasers expand` | covered |
| Money Settings hub + every child (Accounts…Tags) | `e2e/money.spec.ts` · `settings hub and every child from hub` | covered |
| Money Import entry | `e2e/money.spec.ts` · `import entry shows Import data` | covered |
| Investments home | `e2e/investments.spec.ts` · `home shows Investments heading` | covered |
| Investments Insights + More teasers | `e2e/investments.spec.ts` · `insights More teasers expand` | covered (seed prerequisite) |
| Investments import entry | `e2e/investments.spec.ts` · `import entry shows Import statement` | covered |
| Investments settings entry | `e2e/investments.spec.ts` · `settings entry shows Investments settings` | covered |
| Investments `/investments/new` open-form only (no submit) | `e2e/investments.spec.ts` · `new form opens without submit` | covered |
| Loans home | `e2e/loans.spec.ts` · `home shows Loans heading` | covered |
| Loans Insights + More teasers | `e2e/loans.spec.ts` · `insights More teasers expand` | covered (seed prerequisite) |
| Loans settings entry | `e2e/loans.spec.ts` · `settings entry shows Loans settings` | covered |
| Loans Pay submit (unique note + toast) | `e2e/loans.spec.ts` · `Pay records payment with unique note` | covered (seed prerequisite) |
| Auth skip when `E2E_STORAGE_STATE` unset | `money` / `investments` / `loans` describes · `test.skip(!hasAuthStorage, …)` | covered |
| Baby Care e2e still present (no accidental drop) | `e2e/baby-care.spec.ts` (existing suite) | covered |

**Covered count:** 16 / 16  
**Missing:** none

**Notes:**

- **Round 5 red cleared:** Baby home status-error Log feed nav — **green** in full suite (main-scoped CTA + `clickSoftNav`).
- **Full suite green:** Baby (22) + Investments (5) + Loans (4) + Money (5) = **36 passed**.
- Finance + Baby non-regression all hold under Resource Option A.

**E2E stack:** Playwright (`@playwright/test`)  
**E2E command:** `pnpm test:e2e` (= `nice -n 15 playwright test`; Chromium launch caps kept — Resource Option A). Needs `E2E_STORAGE_STATE` or finance specs skip.

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 Turbopack + TS + 70 pages OK (~12.6s) |
| Unit | `pnpm test` | 0 | 592 tests · 583 pass · 0 fail · 9 skip · ~5.6s |
| E2E | `E2E_STORAGE_STATE=e2e/.auth/user.json pnpm test:e2e` | 0 | Storage present · **36 passed** · 0 failed · ~7.7m · stack OK (GET / → 307, Postgres :5432, auth file); Resource Option A (`nice -n 15` + Chromium caps) |

## Failures (if any)

None.

## Fix ask for my-code-workflow

N/A — suite green.

## Round notes

### Round 6 suite (my-test-workflow)

- Build 0 · unit 0 · e2e 0 · **36 pass / 0 fail**.
- Coverage still **16/16**, no MISSING.
- Resource Option A kept (Chromium caps + `nice -n 15`).
- Round 5 Baby status-error harden held in full suite; Round 4 product/e2e fixes still green.

### Round 5 fix (prior)

- Harden `home status error keeps CTAs working` — `main`-scoped Log feed + `clickSoftNav`. Focused 1/1 then full suite this round.

### Prior rounds (summary)

- Round 5: 35 pass / 1 fail (Baby status-error CTA nav) → e2e harden; full suite green Round 6.
- Round 4: 28 pass / 8 fail (Baby CTA strict ×6 + Loans Pay + Money Notes) → fixed; held green.
- Round 3 Money home/Insights More — stay green.
- Investments Option A seed still required for Insights More.
