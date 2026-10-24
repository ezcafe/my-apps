# Tasks: insights-ui-money-style

**TDD:** Red first per task. Grill closed → Design Option A (adapted duo).

## Task 1 — Duo hero skeleton helper (S)

**Acceptance:**
- Shared skeleton paints **adapted duo** (primary tall slot + one side half slot) using `ANALYTICS_HERO_*` tokens
- Money Insights default skeleton remains **full triad** (no regression)
- Duo mode has **no** third ATF chart placeholder

**TDD (red first):**
- [x] Unit/source: duo skeleton source includes `ANALYTICS_HERO_ROW_GRID` + `ANALYTICS_HERO_SPEND_CLASS` + exactly one `ANALYTICS_HERO_SIDE_CLASS` card (not two side skeletons)
- [x] Unit/source: money collapsed / default charts skeleton still has two side slots (triad)

## Task 2 — Investments Insights adapted duo (M)

**Acceptance:**
- ATF: Results over time in primary (tall/fill + spend class); Allocation in one side slot
- Replace equal `md:grid-cols-2` ATF row with hero grid
- Loading / Suspense / in-dashboard chart skeleton uses **duo** (Task 1)
- More teasers / more panels unchanged in role
- Filters → period → KPIs → charts order preserved

**TDD:**
- [x] Unit/source: `investment-insights-dashboard` ATF section uses `ANALYTICS_HERO_ROW_GRID` and primary before allocation in DOM order
- [x] Unit/source: primary wrapper includes spend class / tall+fill; allocation uses side class
- [x] Unit/source or component: investments path does not use equal 2-up ATF grid for the two cards
- [x] Unit/source: investments duo skeleton call sites — `investments/insights/loading.tsx`, page Suspense fallback, and in-dashboard charts skeleton — use Task 1 **duo** variant (not triad / default money charts skeleton)
- [x] E2E (if fixture exists): `/investments/insights` shows results-over-time region with visually larger primary than allocation — else document skip; unit must cover class wiring — **skip:** no dedicated visual fixture; unit covers class wiring

## Task 3 — Loans Insights adapted duo + loading urgency (M)

**Acceptance:**
- ATF: Remaining by loan primary; Paid principal vs interest side
- Same hero tokens / heights as investments
- `FeatureInsightsPageSkeleton showUrgencyStrip` on dashboard **and** `app/(shell)/loans/insights/loading.tsx` (+ page Suspense if present)
- Duo chart skeleton (not triad) for loans Insights loading body

**TDD:**
- [x] Unit/source: loans ATF uses hero grid; Remaining before Paid P/I; spend + side classes
- [x] Unit/source: `loans/insights/loading.tsx` matches `/FeatureInsightsPageSkeleton\s+showUrgencyStrip/` (extend `loans-insights-urgency-skeleton.test.ts`)
- [x] Unit/source: `loans/insights/page.tsx` Suspense fallback matches `/FeatureInsightsPageSkeleton\s+showUrgencyStrip/` (same urgency file / extend)
- [x] Unit/source: loans Suspense / initial skeleton path uses duo charts when Task 1 exposes the prop

## Task 4 — Baby Insights hero + KPIs above charts (L)

**Acceptance:**
- Order: activities cue → filters → period → **KPI cards** (count KPIs + insight metric cards) → adapted-duo charts → More
- Hero: **Night rest** primary; **Hydration** side
- Pattern / awake / care-count / growth charts stay behind More
- `BabyInsightsPageSkeleton` mirrors new order and duo (KPI strip placeholder + duo charts; not equal 2-up ATF)
- Chip visibility / empty / hydration alert behavior preserved (alert still tied to hydration data)

**TDD:**
- [x] Unit/component: with settled series, `baby-count-kpis` (or Summary metrics) appears **before** `baby-insights-default-charts` in document order
- [x] Unit/source: default charts section uses hero grid; Night rest before Hydration; spend + side classes
- [x] Unit/source: `BabyInsightsPageSkeleton` includes stats/KPI skeleton before duo chart skeletons; no equal auto-fit 2-up as sole ATF stand-in
- [x] E2E or component: More still toggles pattern/growth charts; ATF shows night rest + hydration only
- [x] Existing baby filter skeleton tests (`triggerCount={3}`) stay green or update only if skeleton structure requires it

## Task 5 — Spot-check parity / a11y (S)

**Acceptance:**
- Light + dark: hero cards use design tokens (no hard-coded hex)
- No CLS jump between route loading and live ATF for investments / loans / baby
- Icon-only / hit areas unchanged; transitions stay property-specific if touched

**TDD:**
- [x] Manual or e2e smoke checklist in verify later — for Build: source asserts no third duo skeleton slot; loans urgency present on loading
- [x] Keep / extend skeleton contract tests from Tasks 1–4 as the automated bar

## Task order

1 → 2 → 3 → 4 → 5  

(Shared duo skeleton first; investments and loans can proceed in parallel after 1; baby last — largest structural move.)

## Planned tests summary (for 04a / TDD review)

| Layer | Planned |
|-------|---------|
| Unit / source contract | Duo vs triad skeleton; hero class wiring per dashboard; investments duo call sites (loading + Suspense + in-dashboard); loans loading + page Suspense `showUrgencyStrip`; baby DOM order KPIs before charts; baby skeleton order |
| Component | Baby KPI-before-charts; optional investments/loans class presence |
| E2E | Prefer one path per feature if fixtures exist; otherwise unit covers wiring and e2e skip noted in task |
