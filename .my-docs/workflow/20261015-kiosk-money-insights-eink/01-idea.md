# Idea: Kiosk money-insights e-ink widgets (stats grid + chart)

## Project shape (quick scan)

Next.js shell app with a Money finance module and a `/kiosk` status board of registry widgets (Settings toggles + layout). Sibling run `20261012-kiosk-widgets` already adds layout modes and a month money board (gauge + 2×3 metrics with dither accents). This run adds **new** money-insights cells that match two TRMNL-style screenshot refs at full visual fidelity.

## Problem map (diagnose before framing)

**Mode full.** Step 1 WHAT → Step 2 Core → ★ before Outcome.

#### What is happening?
- `/kiosk` registry board; money glance = `money.month_board` (gauge + 2×3, no footer) — not the two refs.
- Refs A (2+3+3 + footer) / B (3 KPIs + line + footer) are monochrome TRMNL; labels are YouTube/GA (must remap).
- `/money/insights` has KPIs/charts but not as these kiosk cells.

#### What is missing / wrong?
- No A/B cells at **100%** fidelity; money slots (8 KPIs; 3 + series) and Money footer copy unset.
- Month board ≠ refs; strict B/W vs shell theme unsettled.

#### What are the consequences?
- No promised glances; “close enough” fails Outcome; month-board overlap; wrong remap → useless.

### Step 2 — Real core problem
- **Surface:** Refs exist; no matching kiosk widgets. **Root:** TRMNL layouts + money remap never shipped.
- **Core problem:** Users cannot glance money insights on `/kiosk` in the exact e-ink layouts from the two refs, because those compositions and remapped metrics are not product widgets yet.

### Mind map
```text
Problem: missing TRMNL money-insights kiosk cells
├── Happening: month board ≠ refs │ Missing: A/B + remap + theme
├── Consequences: no glance / fidelity fail / overlap
├── Core: screenshot widgets not shipped
└── ★ Ship two widgets matching refs 100% (money remapped)
```

## Problem

Users cannot glance money insights on `/kiosk` in the exact e-ink layouts from the two screenshot refs, because those compositions and remapped metrics are not product widgets yet.

## User / audience

Signed-in household user who watches `/kiosk` as a glance board (phone, tablet, or dedicated display) and wants money-insights status without opening Money Insights — configures optional widgets in Settings → Kiosk.

## Outcome

Two new kiosk widgets (or equivalent registry cells) render **Screenshot A** and **Screenshot B** at **100% design fidelity** to `refs/money-insights-stats-grid.png` and `refs/money-insights-chart.png` (layout, dither bars, dotted dividers/grid, typography hierarchy, footer bar). Example YouTube/GA labels and series are replaced with money-insights values and labels. Integration uses existing kiosk layout/toggles without rewriting the sibling month-board/layout feature unless needed to plug the new cells in.

## Metric

Side-by-side visual check (light board / intended display): A and B match refs for structure and e-ink treatment; each shows remapped money metrics (and B a time series) readable in one short glance; widgets appear when enabled in Settings and sit correctly in fullscreen/grid from the sibling layout work.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Kiosk glance pattern; Insights job | `docs/DESIGN_GUIDE.md` (§ Kiosk glance; Insights one-job) | Board ≠ Money home; Insights = KPIs + charts |
| Widget registry / defaults | `lib/kiosk/widget-registry.ts` | No stats-grid / chart insight ids today |
| Month board data + UI | `lib/kiosk/month-board.ts`, `components/kiosk/kiosk-month-board-card.tsx` | Sibling cell; different layout |
| E-ink CSS accents | `app/globals.css` (`.kiosk-eink-*`) | Dither bars exist; not full ref chrome |
| Board render + load | `components/kiosk/kiosk-dashboard.tsx`, `lib/kiosk/load-kiosk-page.ts` | Integration surface |
| Settings toggles | `components/kiosk/kiosk-widget-settings.tsx` | Enable/disable pattern |
| Money Insights surface | `app/(shell)/money/(tabs)/insights/page.tsx` → `AnalyticsDashboard` | Primary money-insights KPIs/charts |
| Chart library rule | `docs/DESIGN_GUIDE.md` / `AGENTS.md` (visx) | Normal charts → visx |
| Visual SoT | `refs/money-insights-stats-grid.png`, `refs/money-insights-chart.png` | 100% fidelity target |
| Product ask | `00-run.md` Notes + user request | New widgets; do not rewrite sibling |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** New `/kiosk` cells matching refs A and B (monochrome dither, KPI grids, line chart, footers); Settings toggles for new ids; skeleton parity for new cells; reuse sibling layout modes. Exact money labels/series and footer copy = Analyze/Design decisions. Do not invent solution branches here.

## 80/20 UI (day-to-day)

### Main user goals

- Glance money-insights KPIs in the stats-grid layout (A) without opening Insights.
- Glance trend + top KPIs in the chart layout (B) on the same board.
- Turn each widget on/off in Settings; keep the rest of the kiosk board usable.

### Vital few (high-impact ~20%)

- Pixel-faithful A and B layouts (non-negotiable).
- Correct money remapping (right numbers/labels for a money glance).
- Settings enable + board placement with existing layout modes.
- Clear role vs `money.month_board` (no duplicate confusing defaults).

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** When A is on — the 2+3+3 money KPI grid (values + labels) with dither bars and row dividers.
- **Important info / action #2 (always visible):** When B is on — three money KPIs + the line chart (axes/grid readable); when only one of A/B is on, that widget’s primary content fills the glance.
- **Core action placement:** Glance on `/kiosk`; configure in Settings → Kiosk (toggles). No builder chrome on the board.
- **Secondary actions:** Footer brand/subtitle; deep links into Money Insights; other kiosk widgets; city/weather setup.

### Top user journey to optimize

Open `/kiosk` → see month_board (and other defaults) → if wanted, enable A and/or B in Settings → return to board → read money KPIs (and chart on B) in one glance.

### Sensible defaults

**Both A and B off by default.** Keep `money.month_board` as the existing default money glance (sibling role unchanged). Users who want the ref layouts turn A and/or B on in Settings. Rationale: clear daily board without crowding three money cells; month_board already covers the morning money glance.

### Draft metric map (preferred — draft for Analyze/Design)

Period for A and B KPIs: **this calendar month** (same idea as month_board / Insights default range). Labels below use real Money Insights concepts; slot order and exact series can move in Analyze/Design.

**Screenshot A — stats grid (2 + 3 + 3 = 8):**

| Slot | Draft metric | Plain label idea |
|------|--------------|------------------|
| Top 1–2 (large) | Expenses · Income | Expenses, Income |
| Mid 3 | Net · Savings rate · Bills | Net, Savings %, Bills |
| Bottom 3 | Loans · Budget spent · Expense MoM | Loans, Budget spent, Spend vs last month |

**Screenshot B — chart cell (3 KPIs + series):**

| Part | Draft | Plain label idea |
|------|-------|------------------|
| KPI 1–3 | Expenses · Income · Net | Expenses, Income, Net |
| Series | Daily (or weekly) **expense / spend trend** over the selected month | Spend over time |
| Range | This calendar month | Matches KPI period |

### Biggest usability risks to fix first

- Visual fidelity slips (gray washes, wrong grid, missing footer) → fails Outcome.
- Wrong or jargon-heavy metric remap → glance useless.
- Both new widgets + month board all default on → crowded / redundant board (mitigated: A/B default off).
- Chart unreadable at phone/fullscreen cell size.
- Light/dark or Card chrome fighting true monochrome refs.

## Non-goals

- Rewriting sibling layout modes / month-board feature (integrate only).
- Drag-and-drop dashboard builder or free widget placement.
- Shipping YouTube/GA content or TRMNL SaaS branding as product truth.
- Full Money Insights page redesign or “More insights” charts on kiosk.
- New mobile/native app shell outside `/kiosk`.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| “100% design” means literal monochrome dither match to PNGs, not theme-tinted month-board style | Yes for Outcome | Gate A visual compare vs refs | Soften to token e-ink → Outcome rewrite |
| Two separate widgets (A and B), not one combined cell | Likely | User confirm at Gate A | One widget / tabs changes registry |
| Money remap can use existing analytics summary + series (no new API/DB this run) | Preferred (`00-run` Has API/DB no) | Analyze loaders vs Insights | Reclassify Has API/DB |
| Footers stay structural (brand + subtitle) with Money copy | Likely | Pick copy in Design | Drop footer → breaks fidelity |
| New widgets optional; month_board stays | Yes unless user says replace | Settings defaults review | Replace/merge roles |

## What we should not build

- Tesla / third-party brand chrome from other refs; YouTube/GA demo labels as shipped copy.
- Rebuilding kiosk layout prefs or weather detail in this slug.
- Rainbow multi-series chart chrome that breaks monochrome fidelity.

## Success criteria

- [ ] Widget A matches `refs/money-insights-stats-grid.png` structure and e-ink treatment at 100% fidelity with money labels/values.
- [ ] Widget B matches `refs/money-insights-chart.png` structure and e-ink treatment at 100% fidelity with money KPIs + time series.
- [ ] Both enable/disable via Settings and render on `/kiosk` under existing layout modes.
- [ ] Month-board / layout sibling behavior unchanged except integration hooks.
- [ ] Skeleton parity for new cells; empty/unavailable states are clear, not errors.

## Open questions

1. **Metric map A:** Draft above (this month; Expenses/Income · Net/Savings%/Bills · Loans/Budget spent/Spend MoM). Confirm or swap slots in Analyze/Design if loaders differ.
2. **Metric map B:** Draft above (Expenses/Income/Net + spend-over-time series, this month). Confirm grain (daily vs weekly) and series source in Analyze/Design.
3. **Footer copy (lean):** Money brand name + short money-insights subtitle (not YouTube/GA/trmnl). Exact strings in Design.
4. **Defaults (settled for ideation):** A and B **off**; `money.month_board` stays the default money glance. Revisit only if product later wants one primary e-ink cell on by default.
5. **Theme (lean):** Prefer **always monochrome e-ink inside the cell** to hit 100% ref fidelity; shell light/dark stays outside the cell. Design may note phone dark glare as a trade-off.
6. **Registry ids (lean):** Prefer **two toggles** (stats grid + chart) so each glance can turn on alone.
