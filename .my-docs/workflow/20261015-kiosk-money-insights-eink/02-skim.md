# Light repo skim: 20261015-kiosk-money-insights-eink

**Result:** done
**Updated:** 2026-10-15
**Size:** ≤ ~40 lines — constraints only (not full analysis)

## Project shape (1–3 sentences)

Next.js `/kiosk` is a registry status board (`widget-registry.ts`) with layout prefs (ADR-003) and default `money.month_board` (gauge + 2×3 via `.kiosk-eink-*`). Settings/board: `kiosk-widget-settings` / `kiosk-dashboard` / `load-kiosk-page`. No stats-grid or chart insight ids yet; Money Insights KPIs/charts = `/money/insights` → `AnalyticsDashboard`.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/kiosk/kiosk-{dashboard,month-board-card,widget-settings,dashboard-skeleton}.tsx` | Board, month e-ink, toggles, CLS | yes — plug A/B; keep layout |
| `app/(shell)/kiosk/{page,loading}.tsx` | Route + skeleton | yes |
| `money/(tabs)/insights` → `analytics-dashboard.tsx` / `analytics-stats.tsx` | Money KPI + chart SoT | remap; not redesign Insights |
| `app/globals.css` (`.kiosk-eink-*`); refs A/B PNGs | Dither chrome; fidelity SoT | extend CSS; match refs 100% |
| `e2e/kiosk-layout.spec.ts` | Layout/prefs e2e | extend for A/B toggles |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `lib/kiosk/load-kiosk-page.ts`, `month-board.ts`, `kiosk-analytics-filters.ts` | Workspace loaders; month KPIs mapped |
| `lib/money-services/analytics.ts`, `lib/analytics-line-series.ts` | Summary + daily/column series / MoM |
| `GET/PATCH /api/user/preferences` + `validators/user-preferences.ts` | `kioskWidgets` enum = registry; `kioskLayout` |
| `components/charts/line-chart.tsx` (visx) | Normal charts → visx — no new chart lib |

## Hard constraints (do not fight)

1. **Status board, not builder** — DESIGN_GUIDE § Kiosk; reuse sibling layout only.
2. **Registry + Zod** — new ids in `widget-registry.ts` (+ prefs max); A/B **default off**; month_board stays default money glance.
3. **Skeleton parity** when new cells appear.
4. **Charts = visx**; monochrome e-ink **inside** A/B cells.
5. **Prefer no new API/DB** — reuse loaders + analytics; reclassify only if slots need new contracts.

## Risks if we ignore the repo

Theme-tinted “close enough”; invent chart lib; skip registry/Zod → PATCH break; default A/B on → crowded board; miss skeleton → CLS; rewrite sibling layout.

## Enough for Analyze / Design?

yes — Gate A ok. Analyze still: A/B metric/series grain vs loaders; new payload fields may flip Has API.
