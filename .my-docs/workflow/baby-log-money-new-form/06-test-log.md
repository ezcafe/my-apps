# Test log: baby-log-money-new-form

**Result:** success
**Mode last run:** full
**Round:** 2
**Updated:** 2026-09-19 10:31 +0700

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.2 compile + TypeScript + 70 static pages OK |
| Unit | `npm test` | 0 | 1034 tests · 1018 pass · 0 fail · 16 skipped · ~6.7s |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → e2e.

**Verdict:** covered **10** · MISSING **0** · blocked **1**. Stack is Playwright (`pnpm test:e2e`).

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Growth vaccine chip + save stays on Growth + resets to Weight | `e2e/baby-care.spec.ts` · `vaccine create via Growth shows on Activities and stays on Growth` | covered |
| Growth kind save stays on Growth + resets to Weight | `e2e/baby-care.spec.ts` · `growth chips visible; save stays on Growth and resets to Weight` | covered |
| `/baby/vaccines` permanently redirects to Growth with Vaccine chip | `e2e/baby-care.spec.ts` · `/baby/vaccines redirects to Growth with Vaccine chip` | covered |
| Hamburger has no “Log vaccines”; keeps Log growth | `e2e/baby-care.spec.ts` · `hamburger excludes Log vaccines; keeps Log growth` | covered |
| Feed form one-tap (method save) not regressed | `e2e/baby-care.spec.ts` · `feed Start stays; method save lands on home` | covered |
| Diaper form one-tap not regressed | `e2e/baby-care.spec.ts` · `diaper save lands on home` | covered |
| Sleep start/end one-tap path not regressed | `e2e/baby-care.spec.ts` · `sleep Start stays; End lands on home` | covered |
| Home feed/diaper one-tap not regressed | `e2e/baby-home-option-b.spec.ts` · `bottle chip tap saves; chips from recentBottleMl`; `diaper 2×2 Kind: Wet/Dry instant; Poop opens sheet then one save` | covered |
| Growth capture chrome (chips + primary Save) | `e2e/baby-care.spec.ts` · `growth page shows title and save form`; `growth chips visible; save stays on Growth and resets to Weight` | covered |
| Feed page hierarchy still chips/actions above optional fields | `e2e/baby-care.spec.ts` · `feed page: timer + methods above optional amount/duration` | covered |
| money/new visual tokens / radii / skeleton CLS / light+dark | — | blocked (unit + manual glance; not required as e2e) |

**Covered count:** 10
**Missing:** none
**Blocked:** money/new visual tokens + skeleton CLS + light/dark (unit/manual)

**E2E stack:** Playwright (`@playwright/test`, `playwright.config.ts`, `e2e/`)
**E2E command:** `pnpm test:e2e` (or `pnpm exec playwright test`; UI: `pnpm test:e2e:ui`)
**Note:** Capture write tests in `Baby Care capture navigate` skip without `E2E_STORAGE_STATE` (see `playwright.config.ts`, `e2e/helpers/auth.ts`).

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.2 · TS OK · 70 static pages · ~7.8s |
| Unit | `npm test` | 0 | 1043 tests · 1027 pass · 0 fail · 16 skipped · ~6.9s |
| E2E | `pnpm test:e2e -- e2e/baby-care.spec.ts e2e/baby-home-option-b.spec.ts` | 0 | 92 passed · 0 failed · 25 skipped · ~3.4m |

## Failures (if any)

None.

## Fix ask for my-code-workflow

None — full suite green.

## Round notes

- Smoke round 1: build then unit both green.
- Full run round 1: coverage OK (10 covered, 0 missing, 1 blocked visual). Build + unit green. Baby e2e 6 failed → Result failure.
- **Fix-from-tests round 2 (Senior Dev):**
  - **Cause (1–4):** Activities ledger also loads vaccines; e2e mocks only timeline+growth → vaccines hit real API (fail/401) so empty never shows, Retry leaves load-error, and multi-delete showed a second “Could not load activities” alert.
  - **Fix (1–4):** Mock empty `babyVaccines` in `fulfillBabyInsightsGraphql` + empty/skeleton/load-error route handlers (fail+retry path includes vaccines).
  - **Cause (5–6):** money/new `quickPickChipHeightCls` (~50px) + `min-h-11` left Start/methods under 56px.
  - **Fix (5–6):** Feed timer/methods + Sleep Start/End → `min-h-14`; feed/sleep skeletons get `min-h-14` too; unit assert in `baby-care-one-tap.test.ts`.
  - **Verify:** `npm test` 1043 · 1027 pass · 0 fail; targeted e2e 6/6 pass (the prior failures). Full baby e2e filter left for parent re-test.
  - Gate A one-tap unchanged (no new Save).
- Full run round 2 (re-run after Fix): coverage unchanged (10 covered, 0 missing, 1 blocked). Build + unit + baby e2e all green (92 passed; prior 6 failures gone) → Result **success**.
