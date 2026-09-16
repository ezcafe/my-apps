# Test log: baby-insights-charts

**Result:** success
**Mode last run:** full
**Round:** 1
**Updated:** 2026-09-15

## Smoke (build + unit only — before code review)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 compile + TypeScript + static generation OK |
| Unit | `pnpm test` | 0 | 909 tests, 893 pass, 0 fail, 16 skipped |

**Smoke result:** smoke-pass

## Coverage (full mode only)

Map design success criteria / main flows → e2e.

| Criterion / flow | E2E file / test | Status (covered / MISSING / blocked) |
|------------------|-----------------|----------------------------------------|
| Default primary UI = Hydration Monitor + Night Rest only; no always-on count/insight KPI strips or legacy charts | `e2e/baby-care.spec.ts` · `default Insights shows Hydration + Night Rest; More insights / Activity log deferred` (+ `insights page shows filters and growth then timeline`) | covered |
| Night Rest not labeled as efficiency % | same · asserts `baby-night-rest-chart` + no `^efficiency %$` title text | covered |
| More insights + Activity log are deferred (collapsed) controls | same default-two-charts test (`baby-more-insights-panel` / `baby-activity-log-panel` count 0 until click) | covered |
| Expand More insights → deferred charts (Pattern / Awake / Diaper) + count KPIs + legacy care-count/growth | same expand path + `Insights shows chart region, care-count, and growth chart cards` | covered |
| Three insight KPIs (wake window / milk→diaper / sleep efficiency) visible under More insights; Sleep Efficiency soft-empty copy | `e2e/baby-care.spec.ts` · `More insights shows insight KPI strip with Sleep Efficiency soft-empty` | covered |
| Chart purpose / guidance text on default (+ deferred) charts | same · `default charts show purpose / guidance copy` (Hydration + Night Rest + Pattern / Awake / Diaper under More insights) | covered |
| Hydration `low_wet` light alert when series alert fires (~6 wet/day rule) | same · `hydration low_wet alert shows when series alert fires` | covered |
| Diaper watery share >20% light alert under More insights when data supports | same · `More insights diaper watery alert shows when series high_watery` | covered |
| Soft empty chart copy for thin hydration / Night Rest series (“need more logs” — not fake trends) | same · `default charts show soft-empty copy when series is thin` | covered |
| Unified Activity log behind expand (care + measurements) | `insights Activity log uses table chrome` + default-two-charts Activity log expand; chips/empty/show-more siblings | covered |
| Activity log care edit → Money-style modal → `updateBabyEvent` → row refresh | `Activity log care edit save hits updateBabyEvent and refreshes row` | covered |
| Activity log growth edit → modal → `updateBabyGrowth` → row refresh | `Activity log growth edit save hits updateBabyGrowth and refreshes row` | covered |
| Edit validation fail → inline modal error; no mutation; row unchanged | `Activity log edit validation fail shows inline error and skips mutation` | covered |
| Soft empty Activity log (empty ≠ section error); today default / Reset / filters still drive lists | `insights defaults to today, empty is non-error, Reset restores today` + `insights shared chips apply to Activity log` | covered |
| Loading skeleton matches collapsed disclosures (no premature list chrome) | `insights loading skeleton matches collapsed Activity log` | covered |
| Light + dark usable for Activity log chrome | `insights Activity log stays usable in light and dark` | covered |
| No Money / Baby capture change required | Out of Insights scope; existing capture / Money suites unchanged by this slug’s e2e | covered |

**Covered:** 17  
**Missing:** 0  
**Blocked:** none

**E2E stack:** playwright (`@playwright/test`)  
**E2E command:** `pnpm test:e2e` (focused: `pnpm exec playwright test e2e/baby-care.spec.ts -g "insights|Baby Care insights charts"`)

## Runs (full mode)

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| Build | `pnpm build` | 0 | Next.js 16.3.2 Turbopack; TypeScript + 70 static pages OK |
| Unit | `pnpm test` | 0 | 917 tests, 901 pass, 0 fail, 16 skipped |
| E2E | `pnpm exec playwright test e2e/baby-care.spec.ts -g "insights\|Baby Care insights charts"` | 0 | 22 passed (~1.1m). Insights coverage + related baby-care.spec tests matched by filter. Full `pnpm test:e2e` not run (ambient non-Insights suites skipped by design). |

## Failures (if any)

None.

## Fix ask for my-code-workflow

N/A — success.

## Round notes

- Smoke only: build + full unit suite. E2E not required in this mode.
- Coverage check (full): mapped 01-idea / 03-design / 04-tasks success criteria + main flows to `e2e/baby-care.spec.ts`. 12 covered, 5 MISSING (insight KPI strip soft-empty UI, purpose copy, hydration/diaper alerts, chart soft-empty copy). No e2e added in this stage.
- Add missing e2e: 5 new tests in `e2e/baby-care.spec.ts` (insight KPIs + Sleep Efficiency soft-empty, default purpose copy, `low_wet` alert, diaper `high_watery` alert under More insights, chart soft-empty copy). Focused run: 5 passed. Coverage now 17 covered / 0 missing / 0 blocked.
- Full run suite: build + unit + Insights-focused e2e all green; Coverage has 0 MISSING → Result success.
