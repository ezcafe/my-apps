# Idea / framing

## Intent

Bring baby, investments, and loans **Insights** pages in line with the **money/insights** visual hierarchy: filters → period → KPIs → a **hero row with one large primary chart** for the most important insight, then secondary charts / “more insights” teasers — and keep loading skeletons in lockstep (zero CLS).

## Goals

- Match money Insights **layout grammar** on baby / investments / loans Insights (shared tokens from `analytics-chart-layout`, `ANALYTICS_GRID_CLASS`, hero row pattern).
- Put **one big chart** first for each feature’s single most important insight (clear visual weight vs equal 2-up grids today).
- Keep **skeleton parity** with the live ATF layout (`FeatureInsightsPageSkeleton` / feature skeletons / route `loading.tsx`).
- Preserve existing data, filters, drilldowns, empty/error paths, and feature-specific chrome (e.g. loans urgency strip, baby care/growth chips) unless they block hierarchy.

## Non-goals

- New analytics metrics, APIs, GraphQL fields, or DB schema.
- Redesigning money/insights itself (it is the reference).
- Unifying all features onto one shared dashboard component or one chart type.
- Changing shell nav, workspace bootstrap, or auth.

## Anti-goals

- Equal-weight chart grids that bury the primary insight.
- Hero layout without matching skeleton (CLS / layout jump).
- Hard-coded hex / one-off radii that break light/dark or DESIGN_GUIDE tokens.
- “Make every chart tall” without a clear primary.

## Constraints

- **Reference:** `app/(shell)/money/(tabs)/insights/` → `AnalyticsDashboard` + `ANALYTICS_HERO_*` in `components/analytics-chart-layout.ts` + `MoneyAnalyticsPageSkeleton`.
- **Targets:** `baby/insights`, `investments/insights`, `loans/insights` (dashboards + skeletons + route loading).
- Mode **simple**, review profile **lite**; UI-only change set.
- Follow `docs/DESIGN_GUIDE.md` and workspace skeleton-parity rules.
- Size guess: **small change** with a short written design (not a greenfield product).

## Has UI (tentative)

| Flag | Tentative |
|------|-----------|
| UI | **yes** |
| API | **no** |
| DB | **no** |
| auth/PII/schema | **no** |

## Shared understanding

- [x] User confirmed (brainstorm hard-gate)
- Primary chart: **follow domain best practices per app** (baby vs investments vs loans) — not one shared metric across features. Design picks the hero insight per feature from existing charts + domain norms.

### Skim notes (guesses marked)

- Money ATF: hero grid — large Spend (≈2/3 width, tall) + two stacked side charts; then teaser row for “more insights.”
- Investments / loans today: period + KPIs + **two equal charts** in one row (no hero weight).
- Baby: filters + many peer charts; not money-style hero hierarchy.
- Hero candidates (design will lock with best-practice rationale): investments results/performance over time; loans remaining balance or payoff trajectory; baby care frequency or growth trend — finalize in design-phase.
