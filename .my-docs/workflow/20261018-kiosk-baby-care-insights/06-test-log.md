# Test log: 20261018-kiosk-baby-care-insights

**Result:** success
**Test path last run:** full
**Round:** 1
**Updated:** 2026-10-19
**Smoke source:** Smoke-Task

## Smoke

**Smoke result:** smoke-pass

| Step | Command | Result |
|------|---------|--------|
| cwd | `/Users/ptquang86/ws/my-apps` | ok |
| build | `npm run build` | pass (exit 0 · Next.js 16.3.7 · `/kiosk` + `/settings`) |
| unit | `npm test` | pass (exit 0 · 1600 pass · 0 fail · 0 cancelled · 31 skipped + mock pool 25/25) |
| e2e | deferred — full test stage (`npm run test:e2e`) | N/A for Smoke |

**Round notes**

- Independent Smoke re-run after fix-tests verify-pass (telegram AbortSignal flake closed).
- Build green. Unit suite exit 0; prior `cancelledByParent` on `lib/telegram/send.test.ts` gone.

## Coverage

| Criterion / flow | E2E file / test | Status |
|------------------|-----------------|--------|
| Baby defaults inject on `/kiosk` load (ADR-004) | `e2e/kiosk-baby.spec.ts` · `baby defaults inject on kiosk load` | **covered** · executed green |
| Empty `kioskWidgets: []` stays empty (no inject) | same · `empty kiosk widgets stays empty` | **covered** · executed green |
| Per-widget test ids (nursery / next-care / funny-time) | inject test asserts three cells | **covered** |
| Settings Baby toggles round-trip | — | **blocked** — inject path covers board visibility; toggle UI not required for Task 9 named reds |
| Visual 100% pixel vs refs | — | **blocked** — manual only |
| Registry / Zod / inject / mappers / cards / skeletons | unit suites | **covered** (unit) |

**E2E stack:** Playwright  
**E2E command:** `npm run test:e2e` (focused `e2e/kiosk-baby.spec.ts` + `E2E_STORAGE_STATE=e2e/.auth/user.json`)  
**Missing e2e adds:** none (Task 9 named reds already present; Origin header fix on `patchPrefs` only)

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Next.js 16.3.7 · `/kiosk` + `/settings` |
| Unit | `npm test` | 0 | 1600 pass · 0 fail · 31 skipped + mock pool 25/25 |
| E2E | `E2E_STORAGE_STATE=e2e/.auth/user.json npm run test:e2e -- e2e/kiosk-baby.spec.ts` | 0 | **2 passed** (inject · empty stays empty) · Postgres up · Chromium installed |

## Failures (if any)

none (after e2e Origin fix)

## Fix ask for my-dev-flow-code

none — full path green

## Round notes

- Coverage: Task 9 inject + empty-board e2e already shipped; no new flows added.
- First e2e attempt failed: Playwright Chromium missing in sandbox cache → `npx playwright install chromium`.
- Second attempt failed: `page.request.patch` lacked `Origin` → API `assertSameOriginStrict` 400. Fixed e2e helper only (not product).
- Third attempt: **2/2** green. Hydration mismatch noise on Settings hash nav — did not fail tests.
- **Result success** — Gate C bar met for Review profile full.
