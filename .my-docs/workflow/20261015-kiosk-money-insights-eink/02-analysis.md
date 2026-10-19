# Analysis: Kiosk money-insights e-ink widgets (A + B)

**Size:** Prefer bullets. ≤5 solution pieces. Stay within artifact size caps.
**Updated:** 2026-10-15
**Has API:** yes
**Has DB:** no

## Deep dive (required)

### Overall

#### What is this?
Ship two new `/kiosk` registry widgets that match the TRMNL-style refs at 100% fidelity: **A** = 2+3+3 KPI grid + dither bars + footer; **B** = 3 KPIs + line chart + footer. YouTube/GA demo labels become money-insights metrics for this calendar month. Sibling layout/month_board stay; A/B default **off**.

#### Why do we need this?
Users want a glanceable money-insights board cell in the exact e-ink compositions from the screenshots. Without them, morning glance stays on month_board only; “close enough” theme-tinted cards fail the Outcome.

#### How to do this?
Add two registry ids → Settings toggles → gated loaders in `load-kiosk-page` (reuse `computeMoneyAnalyticsSummary`, bills/loans/budget helpers, overview/line series) → pure mappers → new card components + CSS (extend `.kiosk-eink-*`) → visx line for B (monochrome inside cell) → skeleton parity.
- **Other ways:** (1) One combined A+B widget; (2) Soft token e-ink only (fails 100% Outcome); (3) Replace month_board with A (crowds defaults / fights Gate A).
- **Best practices:** Registry + Zod prefs enum (sibling pattern); widget-gated loaders; DESIGN_GUIDE kiosk glance; visx for charts; skeleton CLS parity; no new chart lib.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Reuse month_board numbers in new chrome only; skip MoM/series polish; soft footer | low / fidelity risk | later / Non-goals if deferred |
| **2. Systemic fixes** ★ | Two ids + prefs Zod + gated loaders/mappers + A/B cards + CSS chrome + visx B + skeletons | med / contract + UI risk | yes → Design Option 1 |
| **3. Creative / lateral** | Single combined cell; or Insights deep-link card instead of chart | med-high / Gate A two-toggle lean | yes → Design Option 2 (reject unless user wants) |

- **★ Priority branch for this pass:** Branch 2 Systemic
- **Map to Design:** Option 1 = two widgets systemic; Option 2 = combined cell (creative). Quick wins → early CSS tasks only if they don’t cut Outcome.

### Solution pieces

#### 1. Registry + preferences contract

##### What is this?
New `KioskWidgetId`s (e.g. `money.insights_stats_grid`, `money.insights_chart`) in `widget-registry.ts`; Zod/`PATCH` `kioskWidgets` max follows array length.

##### Why do we need this?
Without enum + Settings, widgets cannot enable/persist; unknown ids strip on normalize.

##### How to do this?
- Approach: Mirror month_board entry; `defaultEnabled: false`; bump `.max(KIOSK_WIDGET_IDS.length)`.
- Other ways: Hardcode client-only toggles (breaks ADR-003 / multi-device).
- Best practices: Single registry SoT; prefs PATCH already owns `kioskWidgets`.

#### 2. Data mappers + gated load (no new REST money API)

##### What is this?
Page-load payloads for A (8 slots) and B (3 KPIs + series) from existing analytics/budget/loans/bills loaders.

##### Why do we need this?
Cards need money numbers; inventing a new public analytics route is out of scope if loaders suffice.

##### How to do this?
- Approach: Clone `loadMonthBoardIfEnabled` pattern; summary for Expenses/Income/Net/Savings%; bills ledger + loans obligation + workspace budget for Bills/Loans/Budget spent; MoM = second summary for previous calendar month; B series from overview cumulative line → prefer **daily spend** (delta of cumulative expense) or weekly downsample if phone cell is noisy.
- Other ways: New `/api/kiosk/...` (extra surface; skip unless loaders block).
- Best practices: Pure mappers + injectable loaders (month-board tests); gate so disabled widgets skip work.

#### 3. UI A — stats grid card

##### What is this?
Cell matching `refs/money-insights-stats-grid.png`: large top 2, mid 3, bottom 3, dither bars, dotted row rules, footer bar.

##### Why do we need this?
Core Outcome for Screenshot A; month_board layout ≠ this composition.

##### How to do this?
- Approach: New component + CSS (footer band, dotted dividers, bar sizes); format money like month_board; empty/unavailable clear copy.
- Other ways: Stretch month_board CSS (won’t hit 2+3+3 + footer).
- Best practices: Concentric radii tokens; monochrome **inside** cell; skeleton parity.

#### 4. UI B — chart card

##### What is this?
Cell matching `refs/money-insights-chart.png`: 3 KPIs + dotted grid line chart + footer.

##### Why do we need this?
Trend glance; A alone has no series.

##### How to do this?
- Approach: visx `LineChart` or thin e-ink wrapper (black stroke, dotted grid, sparse ticks); monochrome overrides inside cell.
- Other ways: Lightweight Charts (wrong — price charts only per rules); SVG hand-roll (more code).
- Best practices: DESIGN_GUIDE visx; phone readability (tick count, stroke weight).

#### 5. Board / Settings / skeleton wiring

##### What is this?
Render A/B in `kiosk-dashboard`; toggles in settings; skeleton shapes; e2e toggle smoke.

##### Why do we need this?
Without wiring, registry ids never appear; CLS if skeleton lags.

##### How to do this?
- Approach: Same switch pattern as month_board; extend `e2e/kiosk-layout.spec.ts`.
- Other ways: N/A — constrained by existing board.
- Best practices: ui-skeleton-parity rule.

## What exists today

`/kiosk` registry board with layout prefs (ADR-003) and default `money.month_board` (gauge + 2×3, `.kiosk-eink-*`). Loaders already pull month analytics, bills, loans, budgets. Money Insights overview exposes daily net cumulative line + prior-month compare. No A/B ids or footer chrome yet. Prefs PATCH validates widget ids via shared Zod enum.

## Dependencies

- Sibling layout modes / month_board unchanged except integration hooks.
- `KIOSK_WIDGET_IDS` length drives prefs array max.
- Workspace money data + currency formatting already on kiosk page load.
- Chart: visx only.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/kiosk/widget-registry.ts` | New ids + defaults |
| `lib/validators/user-preferences.ts` | Public PATCH contract |
| `lib/kiosk/month-board.ts`, `load-kiosk-page.ts` | Gated loader pattern |
| `lib/money-services/analytics.ts`, `lib/analytics-line-series.ts` | Summary + series |
| `components/kiosk/kiosk-{dashboard,month-board-card,widget-settings,dashboard-skeleton}.tsx` | Wire + UI parity |
| `app/globals.css` (`.kiosk-eink-*`) | Extend e-ink chrome |
| `components/charts/line-chart.tsx` | visx base for B |
| `refs/money-insights-*.png` | 100% fidelity SoT |
| `e2e/kiosk-layout.spec.ts` | Toggle / layout e2e |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Widget-gated loader + pure mapper | `month-board.ts` | Testable; skip work when off |
| Registry SoT + Zod enum | `widget-registry.ts` → prefs | PATCH stays valid |
| E-ink metric row (bar + value + label) | `kiosk-month-board-card.tsx` / CSS | Visual DNA for A/B |
| visx LineChart shell | `components/charts/line-chart.tsx` | No new chart stack |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Status-board cells via registry | DESIGN_GUIDE § Kiosk + registry | Board ≠ builder; Settings off-board |
| Prefs JSONB widget list | ADR-003 / `user_preferences` | Multi-device toggles; no new table |
| Page-composed widget payloads | `load-kiosk-page.ts` | Server compose; thin client cards |

## Constraints and risks

- **Has API yes:** expanding `kioskWidgetIdSchema` changes public preferences PATCH/GET contract (even with no new money route).
- **Has DB no:** `kiosk_widgets` jsonb already holds id arrays; no migration for new ids.
- Fidelity vs shell theme: keep always-B/W **inside** A/B cells.
- MoM / daily spend: derive from existing summary + cumulative series — confirm grain in Grill/Design.
- Phone chart readability; three money cells if user enables all (mitigated: A/B default off).
- Do not rewrite sibling layout/month_board.

## Settled decisions (do not relitigate)

- Gate A ok: A/B **off** by default; `money.month_board` stays default money glance.
- Two separate widgets; 100% ref fidelity; monochrome inside cell.
- Prefer reuse loaders over new money REST/DB.
- Charts = visx; status board not builder.
- **Grill:** A metric map = draft lock (Exp/Inc · Net/Sav%/Bills · Loans/Budget/Spend MoM).
- **Grill:** B series = **daily spend** deltas (Decision 1 Opt 1); weekly only if phone noise later.
- **Grill:** ids `money.insights_stats_grid` + `money.insights_chart` (`defaultEnabled: false`).
- **Grill:** footer “Money” / “Insights · this month”.
- **Grill:** Has API **yes** / Has DB **no** confirmed.

## Design tree (frontier)

### Settled
- Core / Outcome / ★; defaults; two toggles; Gate A 80/20; no sibling rewrite; Has UI yes.
- Metric map A; B daily spend; registry ids; footer copy; Has API/DB flags (see Grill `02b-grill.md`).

### Open frontier
- (empty)

### Blocked
- none

**Grill recommended?** done — Result `frontier-empty` in `02b-grill.md`.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| — | Not run | Grill settled series grain; loaders sufficient | discard |

## Blocking questions

(none — Grill settled)

## Clear to grill / design?

**yes** — frontier empty; Design may lock Option 1 (two widgets systemic) vs Option 2 (combined reject).

## Verify commands (confirm for 00-run)

- **cwd:** `/Users/ptquang86/ws/my-apps`
- **build:** `npm run build`
- **unit:** `npm test`
- **e2e:** `npm run test:e2e`

## Has API / Has DB rationale

| Flag | Value | Rationale |
|------|-------|-----------|
| **Has API** | **yes** | New widget ids extend `kioskWidgetIdSchema` used by `GET/PATCH /api/user/preferences` (`kioskWidgets`). Public preferences contract changes. No new money analytics HTTP route required if page loaders reuse services. |
| **Has DB** | **no** | `user_preferences.kiosk_widgets` jsonb already stores widget id arrays; no new table/column/migration for additional enum values. |
