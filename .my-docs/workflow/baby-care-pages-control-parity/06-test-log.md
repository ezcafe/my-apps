# Test log: baby-care-pages-control-parity

**Result:** success
**Mode last run:** full
**Round:** 2
**Updated:** 2026-09-19

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | After TS fix (`[...BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS]`); `/baby/pump` route present |
| Unit | `npm test` | 0 | 1091 pass / 16 skip / 0 fail |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → e2e.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Feed: breast L/R timed start/stop → home | `e2e/baby-care.spec.ts` — feed timed chip start stays; stop lands on home | covered |
| Feed: no Pump; formula ml grid; no amount field | `e2e/baby-care.spec.ts` — feed page: breast chips above formula ml grid | covered |
| Feed: formula ml chip posts createBabyFeed | `e2e/baby-care.spec.ts` — feed formula chip posts createBabyFeed formula + ml | covered (added) |
| Pump page: Pump L/R stop posts duration | `e2e/baby-care.spec.ts` — pump Pump L/R stop posts createBabyFeed duration | covered |
| Pump page: amount chip posts pump + ml | `e2e/baby-care.spec.ts` — pump amount chip posts createBabyFeed pump + ml | covered |
| Diaper: wet one-tap → home | `e2e/baby-care.spec.ts` — diaper save lands on home | covered |
| Diaper page: dirty opens detail sheet then save → home | `e2e/baby-care.spec.ts` — diaper dirty opens sheet then save lands on home | covered (added) |
| Growth: save form / kinds / vaccine | `e2e/baby-care.spec.ts` — growth chips / vaccine / medicine / vitamin | covered |
| Growth: money Amount/Category chrome + Symptoms chips | `e2e/baby-care.spec.ts` — Growth logs medicine and temperature (money-* testids + button chips) | covered (updated) |
| Home quiet success (Done flash, no Saved banner) | `e2e/baby-home-option-b.spec.ts` + smoke status-error | covered (aligned with pending-feedback) |
| Skeletons / shared extracts | unit (`baby-page-skeleton`, feed/pump/diaper/growth/home tests) | covered (unit) |

**E2E stack:** playwright
**E2E command:** `npm run test:e2e`

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `npm run build` | 0 | Green |
| Unit | `npm test` | 0 | 1091 pass / 16 skip |
| E2E (round 1) | `npm run test:e2e` | 1* | 17 failed — stale Saved-banner asserts after quiet success; tee exit masked |
| E2E (targeted fix) | playwright `-g` prior failures | 0 | 16 pass / 1 skip |
| E2E (round 2) | `npm run test:e2e` | 0 | **97 passed / 30 skipped / 0 failed** (~4.9m) |

## Failures (if any)

Round 1: Home Option B + one smoke test still expected `role=status` “Feed/Diaper saved” banners removed by quiet-success. Fixed e2e to assert Done flash / bottle `data-bottle-flash` / timer `m:ss` instead. Also fixed Growth symptoms checkbox → multi chip buttons; Amount `data-testid` on input.

## Fix ask (for my-code-workflow)

None — e2e + small Amount testid placement only.
