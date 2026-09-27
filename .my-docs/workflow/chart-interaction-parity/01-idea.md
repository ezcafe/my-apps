# Idea: Chart interaction parity (hover, toggle, drill-down)

**Project shape:** Next.js multi-app shell (Money, Investments, Loans, Baby). Shared visx charts live under `components/charts/` with Money Insights as the full interaction reference (`ChartShell` hover, `ChartLegendList` toggle, click → `AnalyticsChartDrilldownModal`). Loans/Investments reuse some chrome; Baby charts are mostly display-only.

## Problem

Chart behavior is inconsistent across the app:

1. **Money Insights** already supports hover tooltips, series legend toggle, and click → in-page filtered transaction list modal.
2. **Loans / Investments Insights** often have hover (and sometimes toggle) but rarely open a filtered list modal on click (Loans pie navigates to detail instead).
3. **Baby Insights** charts draw with visx but lack shared hover, toggle, and click drill-down.
4. **Other surfaces** (e.g. loan detail payoff chart) support series toggle in places but not click → list modal.

Users learn one interaction language on Money, then hit dead charts elsewhere.

## User / audience

- **Primary:** Household users scanning Insights (Money, Loans, Investments, Baby) who expect hover detail, hide noisy series, and open the underlying rows without leaving the page.
- **Secondary:** Users on loan detail checking payoff progress who want the same click-to-rows habit.
- **Not this pass:** New chart types, dashboard builders, CSV export, redesign of chart visual style.

## Outcome

What “done” looks like:

1. **Every visx chart surface** uses Money-like **hover** (tooltip via shared chrome) where geometry supports it.
2. **Multi-series charts** expose **legend toggle** (show/hide series) via shared `ChartLegendList` (or equivalent) where series exist.
3. **Click drill-down** opens an **in-page filtered list modal** (Option A) with domain rows for that slice — Money keeps transactions; Loans → installments/payments; Investments → activities/lots; Baby → care/growth events — not URL-only navigation as the primary drill.
4. **Scope = all charts** in my-apps that use the shared chart stack (Insights pages + loan detail payoff + any other visx chart cards), not Insights-only.
5. Skeletons stay in parity; light + dark OK; a11y: meaning not by color alone.

## Metric

**Primary signal:** On Loans, Investments, and Baby Insights (and loan detail payoff), a user can hover for values, toggle a series when multi-series, and click a slice/point to open a filtered list modal — same mental model as Money Insights.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes — one HTML showing shared chrome deltas (tooltip + legend + drill modal shell) on existing card layouts; not a full Insights redesign.
- **Copy/token-only?** no

## 80/20 UI (day-to-day)

### Main user goals

- Read exact values on hover without guessing from bars/pies.
- Hide noisy series so one trend is readable.
- Open the underlying rows for a clicked slice without leaving Insights / detail.

### Vital few (high-impact ~20%)

1. Wire **hover + toggle** on Baby charts and any remaining multi-series gaps (Loans payoff on Insights, Investments line where compare exists).
2. Ship **Option A drill modals** for Loans, Investments, Baby (Money already done).
3. Add **click → modal** on loan detail payoff and remaining Insights charts that today navigate or do nothing.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Chart geometry itself remains the primary scan surface (ATF charts unchanged in layout).
- **Important info / action #2 (always visible):** Interactive legend for multi-series charts (toggle) under/ beside the chart — same as Money pies/columns.
- **Core action placement:** Hover on chart; click on slice/bar/point; legend buttons for toggle; drill content in modal (secondary layer).
- **Secondary actions:** “View all / open detail page” links inside modal footer; More insights expansion; filter toolbar (unchanged role).

### Top user journey to optimize

Open Insights (or loan detail) → hover chart → optional toggle series → click slice → skim filtered list in modal → close and continue scanning.

### Sensible defaults

- All series visible until user toggles.
- Modal empty state quiet when filter yields zero rows (not an error).
- Drill filters inherit current Insights date range + clicked keys (loan id, instrument, care/growth kind, month/day bounds).
- Money behavior unchanged as the reference.

### Biggest usability risks to fix first

- Click that navigates away when users expect a modal (Loans pie today).
- Modal without enough filter keys (wrong or full unfiltered list).
- Baby charts that look clickable but do nothing.
- Overlapping hit targets (legend vs chart) and missing keyboard/focus for legend toggles.
- Color-only meaning in tooltips/legend without text labels.

## Non-goals

- Redesigning chart visual style, colors, or card order.
- New chart types or “more insights” content packs.
- Replacing Money’s transaction modal with a different pattern.
- Full activity ledger pages if a modal list is enough.
- Watch / mobile-native apps outside my-apps web.
- Schema redesign unrelated to list filters needed for drill.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Loans can expose a date-filtered installment/payment list for modal (new query or client filter of detail) | Likely need API or client compose | No safe client path for multi-loan Insights | Design Option for client-from-detail vs new GQL list |
| Investments `investmentActivitiesQueryOptions` covers chart click keys (instrumentId, kind, dates) | Likely | Missing symbol→id map | Resolve via instruments query in card |
| Baby timeline can be filtered by care kind for modal (server or client after fetch) | Client today | Too heavy for large ranges | Add server `type`/`kind` filter |
| Pattern-finder / matrix charts can support meaningful click keys | Maybe | Geometry too coarse | Hover+toggle only; defer drill for that chart |
| “All charts” excludes non-visx CSS progress bars | Yes for 80/20 | Product wants those clickable too | Treat as links already; out of visx parity |

## What we should not build

- Per-domain one-off tooltip UIs that bypass `ChartShell`.
- URL-only drill as the primary Option A path.
- Fake empty modals that always say “coming soon.”

## Success criteria

- [ ] Every in-scope visx chart: hover tooltip via shared chrome (or documented exception with reason).
- [ ] Every multi-series in-scope chart: legend toggle works.
- [ ] Click on Money / Loans / Investments / Baby Insights charts and loan detail payoff opens Option A filtered list modal (Money already; others new).
- [ ] Loans Remaining pie stops relying on navigate-only as the primary drill (modal first; optional “Open loan” in modal).
- [ ] Unit tests for drill filter builders + legend/hover wiring; e2e smoke for at least one drill per domain (or shared modal pattern + one Baby + one Loans).
- [ ] Skeleton parity where chrome height changes (legend/modal triggers); light + dark OK.

## Open questions

1. **Loans drill content** — unpaid upcoming installments, paid payments in range, or both tabs? Prefer paid-in-range for Insights paid charts; remaining/overdue for Remaining pie.
2. **Baby pattern-finder** — full Option A drill this pass, or hover (+ optional toggle) only if click keys are weak?
3. **Investments symbol P&L bar** — resolve symbol → instrumentId in card before modal query?
4. **Has API** — confirm during Analyze whether Loans needs a new filtered list field vs client filter of `loan(id).installments`.

## Blocking questions

None — settled locks (Option A + all charts) are enough for Gate A. Resolve Open questions in Analyze/Design.
