# Light repo skim: 20261015-kiosk-money-insights-heatmap

**Result:** done
**Updated:** 2026-10-15
**Size:** ≤ ~40 lines — constraints only (not full analysis)

## Project shape (1–3 sentences)

Next.js `/kiosk` is a registry status board (`lib/kiosk/widget-registry.ts`) with prefs + layout (ADR-003). Default money glance is `money.month_board`; sibling A/B `money.insights_stats_grid` / `money.insights_chart` exist (default off) with shared `.kiosk-eink-insights*` chrome. No heatmap / contribution widget yet; Has API/DB = no — reuse loaders + analytics.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/kiosk/kiosk-{dashboard,month-board-card,insights-*-card,insights-footer,widget-settings,dashboard-skeleton,insights-skeletons}.tsx` | Board, month + A/B cells, footer, toggles, CLS | yes — new cell + skeleton; leave A/B alone |
| `app/(shell)/kiosk/{page,loading}.tsx` | Route + default skeleton | yes |
| `app/globals.css` (`.kiosk-eink*`, `.kiosk-eink-insights*`); `refs/money-insights-heatmap.png` | Dither chrome; fidelity SoT | extend CSS; match PNG 100% |
| `docs/DESIGN_GUIDE.md` § Kiosk; `e2e/kiosk-layout.spec.ts` | Status board rules; prefs e2e | honor; extend for new id |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `lib/kiosk/load-kiosk-page.ts`, `month-board.ts`, `insights-stats-grid.ts`, `insights-chart.ts`, `kiosk-analytics-filters.ts` | Widget-gated loads; month-scoped A/B pattern |
| `lib/money-services/analytics.ts`, `lib/analytics-line-series.ts`, `lib/analytics-build-query.ts` | Summary + **calendar-month** day fills — year heatmap may need new pure mapper (no public API) |
| `GET/PATCH /api/user/preferences` + `validators/user-preferences.ts` + ADR-003 | `kioskWidgets` enum = registry; add new id |

## Hard constraints (do not fight)

1. **Status board, not builder** — DESIGN_GUIDE § Kiosk; no in-cell drill-down.
2. **Registry + Zod** — new id in `widget-registry.ts` (+ prefs max); **defaultEnabled: true** beside `month_board`; do not flip A/B defaults.
3. **Skeleton parity** for the new three-band cell; monochrome dither only (no theme gray/accent fills inside cell).
4. **Prefer no new API/DB** — server loaders + analytics reuse; flip Has API only if a public contract appears.
5. **Do not amend** paused slug `20261015-kiosk-money-insights-eink`.

## Risks if we ignore the repo

Theme-tinted heatmap; skip registry/Zod → PATCH break; invent public API when a loader would do; leave GitHub labels; miss skeleton → CLS; change A/B defaults or merge into month_board.

## Enough for Analyze / Design?

yes — Gate A ok. Analyze still: year daily grain vs month-only helpers; count vs spend signal; empty-year treatment.
