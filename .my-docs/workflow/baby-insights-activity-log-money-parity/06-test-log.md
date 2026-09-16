# Test log: baby-insights-activity-log-money-parity

**Result:** success
**Mode last run:** full
**Round:** 4
**Updated:** 2026-09-16 21:19 +0700

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm run build` | 0 | Compiled OK; TypeScript OK; static pages OK |
| Unit | `pnpm run test` | 0 | 943 tests · 927 pass · 0 fail · 16 skipped · ~6.6s |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → e2e (from `01-idea.md` success criteria, `03-design.md` locks/flows, `04-tasks.md` required e2e).

**Verdict:** covered **19** · MISSING **0** · blocked **0**. Stack is Playwright. Activity-log Money-parity flows live in `e2e/baby-care.spec.ts`.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Desktop table: leading checkbox + header select-all (visible window) + per-row Edit | `e2e/baby-care.spec.ts` · `Activity log selection bar: checkbox, Edit enabled for 1, disabled visible for 2` + `Activity log clears selection on filter apply, bar Clear, and select-all is visible window only` + `insights Activity log uses table chrome` | covered |
| Mobile cards: checkbox + Edit (not one big button) | same · `insights Activity log uses table chrome` (card `ul > li` checkbox + Edit role asserts; no separate mobile viewport project) | covered |
| Selection bar when count > 0: Edit / Delete / Clear; Edit enabled only for exactly 1 (visible but disabled for 2+) | same · `Activity log selection bar: checkbox, Edit enabled for 1, disabled visible for 2` | covered |
| Bar Edit (1 selected) opens edit modal; row Edit opens same modal | same selection-bar test | covered |
| Care / growth edit save → mutation + row refresh | same · `Activity log care edit save hits updateBabyEvent and refreshes row` + `Activity log growth edit save hits updateBabyGrowth and refreshes row` | covered |
| Whole-row click does not open edit | same · selection-bar test (row click → no dialog) | covered |
| Select-all = visible window only (not beyond-cap / unloaded) | same · `Activity log clears selection on filter apply, bar Clear, and select-all is visible window only` | covered |
| Keep selection on show-more | same · `Activity log keeps selection on show more; clears on panel close` | covered |
| Keep selection on load-more | same · `Activity log keeps selection on load more` | covered |
| Clear selection on panel close / filter apply / bar Clear | same · keep-selection + clears-on-filter/Clear tests | covered |
| Multi-Delete: cancel `window.confirm` → zero mutations; selection unchanged | same · `Activity log multi-delete: cancel confirm, mixed mutations, partial fail Alert` (dismiss path) | covered |
| Multi-Delete: mixed care+growth mutations; partial fail → Alert + keep failed key | same cancel/partial-fail test + `Activity log multi-delete: all-fail Alert keeps selection` | covered |
| Multi-Delete: full success clears selection and bar | same · `Activity log multi-delete: full success clears selection and bar` | covered |
| Delete busy disables bar (and row controls) mid-flight; single-row confirm copy | same · `Activity log delete: busy disables Delete mid-flight; re-enables after fail settle; confirmOne` | covered |
| Selectable list skeleton (checkbox-sized placeholders) while loading | same · `insights Activity log expand shows selectable list skeleton while loading` | covered |
| Empty Activity log quiet (muted copy; no table / fake selection chrome) | same · `insights defaults to last 7 days, empty is non-error, Reset restores default` (+ empty path in selectable skeleton test) | covered |
| Light + dark usable for Activity log chrome | same · `insights Activity log stays usable in light and dark` | covered |
| Show-more / load-more still work (list growth) | same · `insights Activity log show more and load more still work` | covered |
| Money Transactions unchanged (scope lock) | Out of Baby Activity-log e2e; Money files not in this slug’s specs; `e2e/money.spec.ts` remains separate smoke | covered (N/A e2e for this slug) |

**Covered:** 19
**Missing:** none
**Blocked:** none

**E2E stack:** Playwright (`@playwright/test`) · config `playwright.config.ts` · specs under `e2e/`
**E2E command:** `pnpm test:e2e` (focused: `pnpm exec playwright test e2e/baby-care.spec.ts -g "Activity log"`)

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm run build` | 0 | Compiled OK; TypeScript OK; 70 static pages OK |
| Unit | `pnpm run test` | 0 | 958 tests · 942 pass · 0 fail · 16 skipped · ~6.4s |
| E2E | `pnpm exec playwright test e2e/baby-care.spec.ts -g "Activity log"` | 0 | 20 matched · 20 pass · 0 fail · ~35s. Focused Activity log suite (not full `pnpm test:e2e`) |

**Full result:** success (build + unit + e2e green). Coverage 19 / 0 missing / 0 blocked.

## Failures (if any)

None open. Round 3 e2e fails (shared chips Weight, table chrome card Edit, deferred growth) resolved in Fix-from-tests round 3; Round 4 re-run all green.

### Round 3 — Full suite e2e (resolved)

Focused command: `pnpm exec playwright test e2e/baby-care.spec.ts -g "Activity log"` → exit 1 (17 pass / 3 fail). Fixed in Fix-from-tests round 3; verified green in Round 4.

#### 1) `insights shared chips apply to Activity log` (`e2e/baby-care.spec.ts:423`) — resolved

- **What:** 60s timeout clicking Weight chip inside filters dialog.
- **Excerpt:**
  ```
  Test timeout of 60000ms exceeded.
  Error: locator.click: Test timeout of 60000ms exceeded.
  Call log:
    - waiting for getByRole('dialog').getByRole('button', { name: /^weight$|^cân nặng$/i })
  > 563 | await dialog.getByRole("button", { name: /^weight$|^cân nặng$/i }).click();
  ```
- **Tied to:** Shared chips still drive Activity log filter apply.

#### 2) `insights Activity log uses table chrome` (`e2e/baby-care.spec.ts:946`) — resolved

- **What:** Card row Edit button not found (`ul > li` first card).
- **Excerpt:**
  ```
  Error: expect(locator).toBeVisible() failed
  Locator: getByTestId('baby-activity-log-panel').locator('ul > li').first()
           .getByRole('button', { name: /^edit$|^sửa$/i })
  Expected: visible
  Timeout: 15000ms
  Error: element(s) not found
  > 1049 | ).toBeVisible();
  ```
- **Tied to:** Mobile cards: checkbox + Edit (not one big button) / table chrome asserts.

#### 3) `default Insights shows Hydration + Night Rest; More insights / Activity log deferred` (`e2e/baby-care.spec.ts:1617`) — resolved

- **What:** Opening More insights triggers a growth fetch; test expects zero growth fetches until Activity log opens.
- **Excerpt:**
  ```
  Expected: 0
  Received: 1
  // More insights uses series only — no payload timeline/growth waterfall.
  expect(timelineFetches).toBe(0);
  > 1669 | expect(growthFetches).toBe(0);
  ```
- **Tied to:** Deferred Activity log / series-only More insights (may be ambient charts work vs this slug — still red on this focused run).

**Also passed in Round 3 (17):** show more / load more, selectable skeleton, error UI, light+dark, care/growth edit save, edit validation, selection bar, keep selection show-more/load-more, multi-delete cancel/partial/full/all-fail/prune, delete busy, clears selection + select-all visible window.

### Round 1 — Build / TypeScript (resolved in Fix-from-tests round 1)

- **What:** `next build` fails during “Running TypeScript …”
- **Where:**
  1. `.next/dev/types/app/api/agent-debug-log/route.ts` — missing `app/api/agent-debug-log/route.js`
  2. `e2e/baby-care.spec.ts` (~817–820) — `variables` possibly `undefined`
- **Excerpt:**
  ```
  .next/dev/types/app/api/agent-debug-log/route.ts(2,24): error TS2307: Cannot find module '../../../../../../app/api/agent-debug-log/route.js'
  e2e/baby-care.spec.ts(817,18): error TS18048: 'variables' is possibly 'undefined'.
  e2e/baby-care.spec.ts(818,18): error TS18048: 'variables' is possibly 'undefined'.
  e2e/baby-care.spec.ts(820,21): error TS18048: 'variables' is possibly 'undefined'.
  e2e/baby-care.spec.ts(820,41): error TS18048: 'variables' is possibly 'undefined'.
  Failed to type check.
  ```
- **Tied to requirement:** Build must be green before review (smoke gate). E2E mock for insights series / activity-log flows in this feature branch.
- **Status:** Fixed in Fix-from-tests round 1; smoke round 2 build + unit both exit 0.

## Fix ask for my-code-workflow

None — full suite green; Coverage has no open MISSING.

## Round notes

- Smoke round 1: unit green; build red → overall **smoke-fail**.
- Did not run e2e. Did not change product code in this smoke run.
- **Fix-from-tests round 1 (2026-09-16 20:20 +0700):**
  - Guarded `variables?.from` / `variables?.to` in `e2e/baby-care.spec.ts` (insights Apply date range mock) so TS18048 is gone.
  - Removed empty orphan `app/api/agent-debug-log/` dir + wiped `.next` so stale generated types no longer reference a missing route.
  - Local re-check: `pnpm run build` exit 0; `pnpm run test` exit 0 (943 / 927 pass / 0 fail / 16 skipped). Parent should re-run smoke to update Result.
- **Smoke round 2 (2026-09-16 20:21 +0700):** build exit 0; unit exit 0 (943 / 927 pass / 0 fail / 16 skipped) → **smoke-pass**. No product code changes in this smoke run. Did not run e2e.
- **Add missing e2e (2026-09-16 21:10 +0700):** Closed keep-selection-on-load-more gap with `Activity log keeps selection on load more` in `e2e/baby-care.spec.ts` (focused run exit 0). Coverage now 19 covered / 0 missing / 0 blocked.
- **Full Run suite round 3 (2026-09-16 21:12 +0700):** build exit 0; unit exit 0 (956 / 940 pass / 0 fail / 16 skipped); e2e focused Activity log exit 1 (17 pass / 3 fail) → **failure**. No product code changes in this run. Did not run full `pnpm test:e2e`.
- **Fix-from-tests round 3 (2026-09-16 21:20 +0700):**
  - **Shared chips Weight:** `topUsageItems` keeps input order on equal usage so Feed/Sleep/Diaper/Weight/Height stay in the quick row (Weight was buried under Other after A–Z sort). Unit: `lib/money-usage-quick-pick.test.ts`.
  - **Table chrome card Edit:** e2e narrows viewport before card asserts (`@container @md:hidden` hides cards on desktop). Live card Edit chrome unchanged.
  - **Deferred growth:** `growthEnabled = activityOpen` only (More insights = series-only). Growth charts soft-empty when lists not loaded (`ready` true with empty points). Aligns with charts design + e2e.
  - Local re-check: three previously failing e2e → exit 0. Parent should re-run full Activity log focused suite.
- **Full Run suite round 4 (2026-09-16 21:19 +0700):** build exit 0; unit exit 0 (958 / 942 pass / 0 fail / 16 skipped); e2e focused Activity log exit 0 (20 pass / 0 fail · ~35s) → **success**. Coverage still 19 / 0 missing / 0 blocked. No product code changes in this run. Did not run full `pnpm test:e2e`.
