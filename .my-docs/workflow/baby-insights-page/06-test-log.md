# Test log: baby-insights-page

**Result:** success
**Round:** 1
**Updated:** 2026-09-06 (run suite)

## Coverage

Map design success criteria / main flows → e2e.
Focus: Option A — `/baby/insights` filters+growth+timeline, view-only, `/baby/measure` write, redirects, Insights nav.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Nav: one Insights item opens `/baby/insights` | `e2e/baby-care.spec.ts` · `insights page shows filters and growth then timeline` | covered |
| Insights shows filters + growth then timeline stack | `e2e/baby-care.spec.ts` · `insights page shows filters and growth then timeline` | covered |
| Insights view-only (no add / edit / delete) | `e2e/baby-care.spec.ts` · `insights page shows filters and growth then timeline` | covered |
| Shared date chrome + period chip (“Showing…”) | `e2e/baby-care.spec.ts` · `insights page shows filters and growth then timeline` | covered |
| Apply shared date/kind chips drives both growth + timeline (Option A) | `e2e/baby-care.spec.ts` · `insights shared chips apply to growth and timeline` | covered |
| Redirects `/baby/growth` and `/baby/timeline` → `/baby/insights` | `e2e/baby-care.spec.ts` · `old growth and timeline URLs redirect to insights` | covered |
| Measure write surface: Home CTA + form | `e2e/baby-care.spec.ts` · `measure page shows title and add form` | covered |
| Measure create save lands on home | `e2e/baby-care.spec.ts` · `measure save lands on home` | covered |
| Capture (feed / sleep / diaper) still lands on home | `e2e/baby-care.spec.ts` · `feed save…` / `diaper save…` / `sleep start…` / `sleep end…` | covered |
| Light + dark + zero CLS on Insights / Measure | — | blocked (manual Checkpoint E; no e2e) |

**Covered count:** 9  
**Missing:** none.  
**Blocked:** Light + dark + CLS (manual only).

**E2E stack:** Playwright (`@playwright/test`, `playwright.config.ts`, `e2e/`)
**E2E command:** `pnpm test:e2e` (or `pnpm exec playwright test`)

## Runs

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 compile + TypeScript + 69 static pages OK |
| Unit | `pnpm test` | 0 | 505 tests · 496 pass · 0 fail · 9 skipped |
| E2E | `pnpm test:e2e` | 0 | 16 total · 11 passed · 5 skipped (capture→home need auth storage) · includes baby-care Insights/Measure/redirects |

## Failures (if any)

None.

## Fix ask for my-code-workflow

None — suite green.

## Round notes

- Added e2e for Option A shared chips Apply → growth + timeline both follow (`insights shared chips apply to growth and timeline`). Passed locally. Light/dark + CLS stay blocked/manual.
- Run suite 2026-09-06: build + unit + e2e all exit 0. No open MISSING gaps. Manual light/dark OK as blocked.
