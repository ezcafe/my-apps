# Analysis: Kiosk money-insights heatmap widget

**Size:** Prefer bullets. ≤5 solution pieces. Stay within artifact size caps.
**Updated:** 2026-10-15
**Has API:** yes
**Has DB:** no

## Deep dive (required)

### Overall

#### What is this?
A **new** `/kiosk` money widget (this slug only) that matches `refs/money-insights-heatmap.png` at 100% fidelity: hero + 2×2 KPIs + year contribution heatmap + dither footer, with GitHub demo labels remapped to money. Default **on** beside `money.month_board`. Paused A/B e-ink slug untouched.

#### Why do we need this?
Year-scale money activity is missing from the status board. Soft/theme cards fail the Outcome. Amending the paused A/B run mixes scopes. Opt-in-only would hide the glance most days.

#### How to do this?
Add registry id (`money.insights_heatmap` candidate) → prefs Zod enum → widget-gated year loader + pure mapper (reuse analytics daily grain; fill ~365 calendar days) → three-band card + CSS (extend `.kiosk-eink-insights*`) → skeleton + Settings + defaults tests. No new money REST/DB tables.
- **Other ways:** (1) Soft token chrome only (fails 100% fidelity); (2) Fold into `month_board` (fights one-job cell + settled defaults A); (3) Amend paused A/B slug (rejected).
- **Best practices:** Registry + Zod SoT; gated loaders + pure mappers (month_board / insights-*); DESIGN_GUIDE status board; monochrome inside cell; skeleton CLS parity.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Skin existing month KPIs in heatmap chrome; skip year fill / streaks | low / wrong glance | later / Non-goals if cuts Outcome |
| **2. Systemic fixes** ★ | New id + prefs + year daily mapper + heatmap card + CSS + skeleton + default on | med / fidelity + signal pick | yes → Design Option 1 |
| **3. Creative / lateral** | Merge into month_board; or amend paused A/B slug; or live GitHub sync | med-high / Non-goals | yes → Design Option 2 (reject unless user pivots) |

- **★ Priority branch for this pass:** Branch 2 Systemic
- **Map to Design:** Option 1 = systemic new heatmap widget; Option 2 = creative merge/amend (reject). Quick wins → early CSS only if they do not cut Outcome.

### Solution pieces

#### 1. Registry + preferences contract

##### What is this?
New `KioskWidgetId` (candidate `money.insights_heatmap`) with `defaultEnabled: true`; Zod/`PATCH` `kioskWidgets` max follows array length.

##### Why do we need this?
Without registry + prefs, the cell cannot enable/persist; unknown ids strip on normalize. Defaults must keep `month_board` on too.

##### How to do this?
- Approach: Mirror A/B registry entry; **defaultEnabled: true**; bump `.max(KIOSK_WIDGET_IDS.length)`; leave A/B defaults **false**.
- Other ways: Client-only toggle (breaks ADR-003).
- Best practices: Single registry SoT; prefs PATCH owns `kioskWidgets`.

#### 2. Year daily mapper + gated load (no new money REST)

##### What is this?
Page-load payload: hero + 2×2 KPIs + ~365 day cells (4 dither levels) from existing money analytics services over a year window.

##### Why do we need this?
Month-only helpers (`currentMonthDateRange`, month fill) do not feed a year heatmap; cards need money-meaningful numbers.

##### How to do this?
- Approach: Clone `loadInsightsChartIfEnabled` pattern; call `computeMoneyExpenseCumulativeSeries` / summary with year `from`/`to` (or thin internal daily query reuse of `fetchCumulativeLine` grain); pure mapper: calendar-day fill → day deltas or counts → streaks / peak / average → 4-level buckets; gate so disabled skips work.
- Other ways: New `/api/kiosk/heatmap` (extra public surface — skip unless loaders block).
- Best practices: Injectable loaders + pure unit tests; Prefer Has API = prefs only, not new money HTTP.

#### 3. UI — heatmap card (hero | 2×2 | grid | footer)

##### What is this?
Cell matching the PNG: large hero, four KPIs, vertical-pill week×day grid with stipple levels, dotted rules, dither footer (“Money” + right glance label — not Octocat/@handle).

##### Why do we need this?
Core Outcome; A/B layouts ≠ this composition.

##### How to do this?
- Approach: New card + CSS (pill cells, 4 dither densities); reuse/adapt `KioskInsightsFooter` with year copy; empty-year readable; no in-cell controls.
- Other ways: Stretch stats-grid/chart CSS (won’t hit contribution grid).
- Best practices: Monochrome **inside** cell; concentric radii; skeleton three-band parity.

#### 4. Board / Settings / skeleton wiring

##### What is this?
Render in `kiosk-dashboard`; Settings toggle; dashboard/insights skeleton shapes; unit defaults + e2e toggle smoke.

##### Why do we need this?
Without wiring, registry id never appears; CLS if skeleton lags; Metric needs defaults test.

##### How to do this?
- Approach: Same switch pattern as month_board / insights; extend `e2e/kiosk-layout.spec.ts`; assert both heatmap + month_board in `DEFAULT_KIOSK_WIDGETS`.
- Other ways: N/A — constrained by board.
- Best practices: ui-skeleton-parity rule.

## What exists today

`/kiosk` registry board (ADR-003). Default money glance = `money.month_board`. Sibling A/B `money.insights_stats_grid` / `money.insights_chart` (default off) with shared `.kiosk-eink-insights*` chrome + footer. Analytics expose day-grouped cumulative lines for arbitrary filter ranges, but kiosk helpers are month-scoped. No contribution heatmap widget.

## Dependencies

- Prefs `kioskWidgets` enum length; ADR-003 JSONB list.
- Do not flip A/B defaults; do not amend paused e-ink slug.
- Workspace currency formatting already on kiosk load.
- Year fill must not invent theme gray/accent fills inside the cell.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `refs/money-insights-heatmap.png` | 100% fidelity SoT |
| `lib/kiosk/widget-registry.ts` (+ tests) | New id + default on |
| `lib/validators/user-preferences.ts` | Public PATCH contract |
| `lib/kiosk/{load-kiosk-page,insights-chart,month-board,insights-stats-grid}.ts` | Gated loader patterns |
| `lib/money-services/analytics.ts`, `lib/analytics-line-series.ts` | Daily grain + year fill inputs |
| `components/kiosk/kiosk-{dashboard,insights-*-card,insights-footer,widget-settings,*-skeleton*}.tsx` | Wire + chrome reuse |
| `app/globals.css` (`.kiosk-eink-insights*`) | Extend dither / rules |
| `e2e/kiosk-layout.spec.ts` | Toggle / layout e2e |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Widget-gated loader + pure mapper | `month-board.ts`, `insights-chart.ts` | Testable; skip work when off |
| Registry SoT + Zod enum | `widget-registry.ts` → prefs | PATCH stays valid |
| E-ink insights chrome + footer | `.kiosk-eink-insights*`, `kiosk-insights-footer.tsx` | Shared dither DNA; money footer not GitHub |
| Calendar-day fill from cumulative | `analytics-line-series.ts` | Year grid without new DB |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| Status-board cells via registry | DESIGN_GUIDE § Kiosk | Board ≠ builder; Settings off-board |
| Prefs JSONB widget list | ADR-003 | Multi-device toggles; no new table |
| Page-composed widget payloads | `load-kiosk-page.ts` | Server compose; thin client cards |

## Constraints and risks

- **Has API yes:** new id extends prefs `kioskWidgets` contract (same class as A/B).
- **Has DB no:** jsonb already stores id arrays; no migration.
- Month-only fill helpers ≠ year grid — need year calendar list + empty days.
- Wrong primary signal (count vs spend) → pretty but misleading.
- Fidelity drift (gray fills, color, Octocat) vs e-ink SoT.
- Two default-on money cells → denser board (settled; Settings can disable).
- Do not touch paused A/B slug / defaults.

## Settled decisions (do not relitigate)

- Gate A ok; ★ = 100% PNG fidelity; defaults A (heatmap **on** + `month_board` **on**).
- New slug / new widget id; do not amend `20261015-kiosk-money-insights-eink`.
- A/B insights stay default **off**.
- No in-cell drill-down; no GitHub branding; no new Money pages/DB tables.
- Has UI yes; Verify commands as below.
- **Grill:** primary signal = activity/tx **count** (hero = money-active days; cells/peak/avg = daily tx count → 4 dither levels).
- **Grill:** streak = any money-active day (≥1 tx, income or expense); no threshold.
- **Grill:** year window = rolling last ~365 calendar days.
- **Grill:** footer = “Money” + “Insights · last year”.
- **Grill:** empty year = full empty dither grid + zero KPIs (no empty-copy line).
- **Grill:** registry id = `money.insights_heatmap` (`defaultEnabled: true`).

## Design tree (frontier)

### Settled
- Core / Outcome / ★; defaults A; new slug; Gate A 80/20; leave A/B alone; monochrome inside cell; Has UI yes.
- Grill D1–D6: count signal; any-tx streaks; rolling ~365; Insights footer; empty=zeros; id `money.insights_heatmap`.

### Open frontier
- (empty)

### Blocked
- none

**Grill recommended?** **no** — frontier empty (`02b-grill.md` Result frontier-empty).

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| — | Not run | Skim + analytics read enough to design; year fill is mapper work | discard |

## Blocking questions

(none for Analyze — Open frontier → Grill / Design; ask user if any pick must lock before Grill)

## Clear to grill / design?

**yes** — Grill settled Open frontier; clear to Design.

## Verify commands (confirm for 00-run)

- **cwd:** `/Users/ptquang86/ws/my-apps`
- **build:** `npm run build`
- **unit:** `npm test`
- **e2e:** `npm run test:e2e`

## Has API / Has DB rationale

| Flag | Value | Rationale |
|------|-------|-----------|
| **Has API** | **yes** | New widget id extends `kioskWidgetIdSchema` used by `GET/PATCH /api/user/preferences` (`kioskWidgets`). Public preferences contract changes. No new money analytics HTTP route if page loaders reuse services. Parent may note `tiny-contract-tweak` if folding isolated API review. |
| **Has DB** | **no** | `user_preferences.kiosk_widgets` jsonb already stores widget id arrays; no new table/column/migration for additional enum values. |
