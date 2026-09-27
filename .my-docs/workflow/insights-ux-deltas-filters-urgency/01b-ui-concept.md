# UI concept (UI/UX designer): insights-ux-deltas-filters-urgency

**Has UI:** yes  
**Note:** lean concept — main-thread fallback (Task usage limit)

## Sources followed

| Source | Used |
|--------|------|
| `01-idea.md` / `01a` | yes — vital few: Money delta, Baby Care/Growth filters, Loans urgency |
| `02-skim.md` | yes — reuse AnalyticsStats, InsightsDateRangeFiltersBar, loans due helpers |
| DESIGN_GUIDE + clean-minimal tokens | yes |

## Concept depth

**lean** — one HTML, three panels on existing Insights chrome. No full-page redesign.

## Align with Gate A (80/20)

| Item | From 01a / idea | How concept honors it |
|------|-----------------|------------------------|
| Money #1 | Expense delta | Under Expenses KPI: arrow + % + semantic color |
| Baby #1 | Care filter | Care (+ Growth) on date toolbar |
| Loans #1 | Urgency | Strip above KPI grid; link to loans |
| #2 each | Existing ATF | Charts / Remaining / Hydration+Night Rest unchanged |

## Screen / surface map

| Surface | Change |
|---------|--------|
| `/money/insights` | Expenses KPI gains MoM delta line when prior data exists |
| `/baby/insights` | Care + Growth multi-select on Insights date bar |
| `/loans/insights` | Urgency strip (overdue + due this week) above KPIs |

## UI references (required for Gate A2; confirm at Gate B without re-show)

| File | Preview URL |
|------|-------------|
| `ui-refs/_proposed-insights-chrome.html` | http://127.0.0.1:8765/_proposed-insights-chrome.html |

Serve from `ui-refs/` on port **8765**. HTML only — no screenshots / GenerateImage.

**Build must match:** teal outline marks new chrome only; stack order filters → period → (urgency) → KPIs → charts; delta copy “↑ N% vs prior month”; quiet surface when overdue=0 (optional quiet variant in Design).

## Layout concept (plain words)

Same Insights stack. Money: add one line under Expenses. Baby: add Care/Growth filter buttons beside date. Loans: add a compact urgency band before the four KPI cards; keep Remaining as the money signal.

## States

- Money delta: show when prior month data exists; hide when not (no fake 0%).
- Baby chips: empty = all; period chip lists active Care labels.
- Loans urgency: counts; quiet surface when both zero; warning tint when overdue &gt; 0.

## Skeleton parity

Filters → period → (urgency skeleton optional) → KPI skeleton → charts. Mirror live route skeletons.

## Mobile / a11y notes

Toolbar wraps; urgency flex-wrap; delta uses text + arrow not color alone; filter buttons keyboard reachable like existing FilterMenus.

## Style rules checklist

- Semantic tokens / Inter / concentric radii / no rainbow status
- Border-only cards / no new chart library
- One primary Apply on filter bar

## Out of scope for this concept

CSV export, Investments deltas, Baby awake/diaper chart polish, More insights redesign.

## Handoff to Analyze / Design

- Prefer wire `AnalyticsStats` `column` from overview/ATF.
- Wire `multiSelectFilters` on Baby dashboard.
- Reuse Loans home overdue / due_soon math for Insights strip.
- Settle Open Q: Expenses-only delta; Care+Growth both; overdue + due-this-week.
