# TDD test plan review: insights-ui-money-style

**Result:** clean

**Round:** 3 (re-run after Task 2 TDD call-site checkbox)  
**Updated:** 2026-10-24  
**Mode / profile:** simple · lite  
**Has UI / API / DB / auth:** yes | no | no | no

**planned tests present:** yes — `04-tasks.md` Tasks 1–5 + Planned tests summary (≥1 named cases).

## Planned / existing test cases reviewed

| Task | Scenario type | Test case | Covered? |
|------|---------------|-----------|----------|
| 1 | Real (skeleton contract) | Duo source: `ANALYTICS_HERO_ROW_GRID` + `SPEND` + exactly one `SIDE` card | yes |
| 1 | Regression | Money default / collapsed charts skeleton still triad (two side slots) | yes |
| 2 | Real (hero wiring) | Investments ATF: hero grid; Results before Allocation; spend + side classes | yes |
| 2 | Real (anti-pattern) | Investments ATF not equal `md:grid-cols-2` 2-up | yes |
| 2 | Real (CLS / loading) | Investments route loading + Suspense + in-dashboard charts skeleton use **duo** | yes — closed Round 3 |
| 2 | Edge / e2e | Visual primary taller than side — skip OK if no fixture; unit covers classes | yes |
| 3 | Real (hero wiring) | Loans ATF: hero grid; Remaining before Paid P/I; spend + side | yes |
| 3 | Real (urgency) | `loans/insights/loading.tsx` → `FeatureInsightsPageSkeleton showUrgencyStrip` | yes |
| 3 | Real (urgency) | `loans/insights/page.tsx` Suspense fallback → `showUrgencyStrip` | yes — closed Round 2 |
| 3 | Real (CLS) | Loans Suspense / initial skeleton uses duo when Task 1 exposes prop | yes |
| 4 | Real (order) | Settled series: `baby-count-kpis` before `baby-insights-default-charts` | yes |
| 4 | Real (hero) | Baby default charts: hero grid; Night rest before Hydration; spend + side | yes |
| 4 | Real (skeleton) | `BabyInsightsPageSkeleton`: KPI strip before duo; no equal 2-up ATF stand-in | yes |
| 4 | Real (More) | More still toggles pattern/growth; ATF = night rest + hydration only | yes |
| 4 | Regression | Existing `triggerCount={3}` filter skeleton tests stay green / update if needed | yes |
| 5 | Spot-check | No third duo slot; loans urgency on loading; skeleton contracts = automated bar | yes (manual remainder OK for lite) |

## Gaps closed since Round 2

| Prior | Status |
|-------|--------|
| Task 3 page Suspense `showUrgencyStrip` | **Closed** (Round 2) — Task 3 TDD has explicit unit/source for `loans/insights/page.tsx` |
| Task 2 investments duo call sites | **Closed** (Round 3) — Task 2 TDD checkbox covers `investments/insights/loading.tsx`, page Suspense fallback, and in-dashboard charts skeleton → Task 1 duo |

## Gaps (must add before Gate B / Build)

None (blocking). Optional Enhancement remains non-blocking:

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Enhancement | 4 | ATF section `aria-label` still hydration-titled after Night rest becomes primary (03a minor) | Optional — not blocking 04a |

## Real scenarios checked

- **Happy path:** Hero class wiring per app; baby KPI-before-charts DOM order; loans loading + Suspense urgency planned.
- **Empty / loading:** Duo vs triad; loans urgency on loading **and** page Suspense; investments duo at loading + Suspense + in-dashboard call sites.

## Edge scenarios checked

- **Boundaries:** No third ATF / no blank third skeleton slot (Task 1) — covers 03a empty bottom-right cell.
- **Concurrency / offline / race:** N/A (layout-only).

## Fix ask

None — **04a ok**.

## Round notes

- Round 2 closed Task 3 Suspense urgency Major.
- Round 3 closed Task 2 investments duo call-site Major (TDD checkbox + Planned tests summary aligned).
- Result **clean** — both prior Major gaps closed; Enhancement (baby `aria-label`) optional only.
