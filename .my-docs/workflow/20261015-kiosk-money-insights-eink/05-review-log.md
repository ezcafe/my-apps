# Review log: 20261015-kiosk-money-insights-eink

## Adversarial

**Round:** 1 · **Result:** needs update  
**Updated:** 2026-10-15  
**Scope:** Fresh verifier (generation ≠ verification). Draft vs Option 1 / `04-tasks` / `04a` — Critical/Major bugs, security, contracts, Design UI Outcome, missing 04a tests, gated loaders. Do not fix code in this stage.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/kiosk/kiosk-eink-line-chart.tsx:46-49,67-68,109` + `kiosk-insights-chart-card.tsx` (no `currency` / `formatY`) | **Chart Y ticks use raw `spendMinor`, not money majors.** KPIs go through `formatCompactMinor` in `load-kiosk-page`, but the visx chart scales and labels `spendMinor` with a generic `formatYTick` (`≥1000` → `k`). For USD (2 fraction digits), $120 → `12000` minor → Y label `12k` (reads as $12,000). Same day KPI can show `$120` while the axis lies by ~100×. Breaks Design visual lock B (“Y ticks sparse 0…max” as a readable money glance) and Task 5 phone-readable ticks. App SoT elsewhere: `formatY={(minor) => formatCompactMinor(minor, currency)}` (e.g. `net-cumulative-flow-card.tsx`). Chart card never receives `currency`. | fixed |
| Major | `components/kiosk/kiosk-eink-line-chart.tsx` (+ tests) | **Missing failure-mode test for money Y formatting.** `kiosk-insights-chart-card.test.ts` locks KPI/footer/soft-empty/chart-region presence only. Nothing fails if Y ticks stay on raw minor compact (`12k` vs `$120` / `formatCompactMinor`). Export a pure tick formatter (or inject `formatY`) and unit-assert USD (and ideally VND) fixtures so the Major above cannot regress green. | fixed |
| Enhancement | `components/ui/card.tsx` + `kiosk-insights-*-card.tsx` (`bg-surface` + `.kiosk-eink-insights`) | **Forced paper vs Card `bg-surface` race.** Design wants shell border/radius on the outer Card and ink/paper inside. Both classes set background; Tailwind-merge does not drop `bg-surface` for a custom class. Light mode often looks fine (`--surface` ≈ white). Dark mode risk if utility wins over `.kiosk-eink-insights { background-color: white }` → black ink on dark surface. Smoke log already flagged eye-check. Prefer a merge-winning paper utility or drop `bg-surface` on these Cards. | open |
| Enhancement | `components/kiosk/kiosk-dashboard.tsx:88-107` | **Enabled A/B with missing payload → `null` (no cell).** Month board / net always render an Unavailable shell. Insights vanish when `noWorkspace` / `dbUnavailable` leaves `widgets` empty while ids stay enabled — layout hole vs sibling pattern. | open |
| Nit | `components/kiosk/kiosk-eink-line-chart.tsx` | Hand-rolled visx path instead of wrapping `components/charts/line-chart.tsx` (Design allows either). Duplication makes the missing `formatY` contract easier to miss. | open |

### Lock / 04a coverage check

| Lock / 04a red | Proven? | Note |
|----------------|---------|------|
| Registry defaults omit A/B | yes | `widget-registry.test.ts` |
| Zod accept new ids / reject unknown / max = length | yes | `user-preferences.test.ts` |
| A 8-slot order + MoM / null savings / no budget | yes | `insights-stats-grid.test.ts` |
| B daily spend + soft empty series | yes | mapper + card unit |
| Gated skip when disabled | yes | both `load*IfEnabled` units |
| Card A/B footer + skeleton parity | yes | card + skeleton units |
| E2E A alone / B alone + footer copy | yes | `e2e/kiosk-layout.spec.ts` (not run in smoke) |
| Chart money Y ticks | yes | `formatEinkChartYTick` + USD/VND unit |

### Security (surface)

- Prefs remain session + Zod enum + max = registry length; no new money HTTP; workspace scoping unchanged. No Critical/Major security findings this pass.

### Gated loaders

- `loadInsightsStatsGridIfEnabled` / `loadInsightsChartIfEnabled` gate before `Promise.all`; page wiring only schedules tasks when `wantInsights*`. Spy tests prove skip. No Critical/Major gated-loader bug found.

### Fix ask (Critical/Major only)

1. **Major — money Y ticks:** Pass `currency` (or `formatY`) into `KioskEinkLineChart` / chart card; label (and ideally domain display) via `formatCompactMinor` (or major units), matching analytics charts. Wire from `kiosk-dashboard` `data.currency`.
2. **Major — regression test:** Unit that fails if Y tick for a known `spendMinor` + currency does not match `formatCompactMinor` (USD cents case minimum).

**Deferred Enhancements:** Card `bg-surface` vs forced paper; Unavailable shell when A/B enabled without payload; optional wrap of shared `line-chart.tsx`.

### Fix notes (fix-review)

- Exported `formatEinkChartYTick(spendMinor, currency)` → `formatCompactMinor`.
- Wired `data.currency` → `KioskInsightsChartCard` → `KioskEinkLineChart`.
- Unit: USD `12_000` minor → `$120.00` (not `12k`); VND fixture matches `formatCompactMinor`.

### Round notes

- Option 1 contracts (ids, defaults off, payloads, footer copy, visx-only, 04a named reds) largely met.
- Strongest Outcome break: Screenshot B axis magnitude vs KPI money formatting.
- Result **needs update** — 2 Majors fixed in fix-review. Next: re-verify Adv → Quality.

---

## Adversarial

**Round:** 2 · **Result:** needs update  
**Updated:** 2026-10-15  
**Scope:** Fresh verifier (writers ≠ verifiers). Re-check Fix R1 money Y ticks + unit; hunt new Critical/Major. Do not fix code in this stage.

### R1 Major closure proof

| Fix ask | Verdict | Evidence (would fail / mis-type if removed) |
|---------|---------|-----------------------------------------------|
| Major — money Y ticks via `formatCompactMinor` + currency | **closed** | `formatEinkChartYTick` → `formatCompactMinor` (`kiosk-eink-line-chart.tsx:48-49`); SVG text calls it with `currency` (`:111`); `KioskEinkLineChart` / `KioskInsightsChartCard` require `currency: string`; dashboard passes `data.currency` (`kiosk-dashboard.tsx` insights_chart case). Old raw `12k` path gone. |
| Major — regression unit (USD cents + VND) | **closed** | `kiosk-eink-line-chart.test.ts`: USD `12_000` → `$120.00`, `notEqual` `"12k"`; VND matches `formatCompactMinor`. Tests green on re-run. |

### Findings (R2)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/kiosk/kiosk-eink-line-chart.tsx:63` (`margin.left = 40`, Y `text` at `x={-8}`) | **Fixed money Y labels can clip inside the SVG.** R1 Fix correctly prints `formatCompactMinor` / `formatMinor` (e.g. USD `$120.00`). Plot gutter stayed sized for short raw ticks (`12k`). Using the repo’s own `estimateTickLabelWidth` rule (`len * 5.75` in `loan-progress-chart.tsx`), `$120.00` ≈ 40px vs ~32px room (`left − 8`). Mid-range USD ticks (and some VND) can lose leading digits/$ — fights Task 5 / visual lock B “phone-readable” ticks even though magnitude is now correct. Shared money charts use much wider / dynamic left margins (`line-chart.tsx` ≥116). Widen left margin (or measure ticks like loan-progress) so `$120.00`-class labels fully fit. | fixed |
| Enhancement | `components/ui/card.tsx` + insights Cards (`bg-surface` vs `.kiosk-eink-insights`) | Forced paper vs Card `bg-surface` race (dark-mode risk). | open (deferred R1) |
| Enhancement | `kiosk-dashboard.tsx` insights A/B cases | Enabled + missing payload → `null` cell (no Unavailable shell). | open (deferred R1) |
| Enhancement | `kiosk-eink-line-chart.tsx` | Hand-rolled visx vs shared `line-chart.tsx` (allowed). | open (deferred R1) |
| Nit | `kiosk-eink-line-chart.test.ts` | USD/VND units lock the pure formatter; ChartParentSize SSR does not paint SVG ticks in card tests — wiring rests on required props + TS. Acceptable for R1 Fix ask; optional DOM tick assert later. | open |

### Lock / 04a coverage check (R2)

| Lock / 04a red | Proven? | Note |
|----------------|---------|------|
| Chart money Y format (magnitude) | yes | Formatter + currency wiring closed |
| Chart money Y readable on phone (fit) | yes | Dynamic left via `einkChartLeftMarginForLabels` + unit |
| Registry / Zod / A map / B series / gates / footers / e2e | yes | Unchanged from R1 |

### Security (surface)

- No new Critical/Major. Prefs still session + Zod enum + max = registry length; no new money HTTP.

### Gated loaders

- Still gated before `Promise.all`; spy units intact. No new Critical/Major.

### Fix ask (Critical/Major only)

1. **Major — Y-tick gutter:** Increase `KioskEinkLineChart` left margin (or dynamically size from `formatEinkChartYTick` widths) so labels like USD `$120.00` are not clipped. Prefer matching shared chart practice (dynamic left / ≥~48–56px for 10px labels). Add a small unit or comment-backed constant so a too-narrow margin cannot silently return.

**Deferred Enhancements:** Card `bg-surface` vs paper; Unavailable shell for A/B; optional shared `line-chart` wrap; optional SVG tick DOM assert.

### Fix notes (fix-review R2)

- `einkChartLeftMarginForLabels` sizes left from `estimateEinkTickLabelWidth` (`len * 5.75`) + `EINK_Y_TICK_GAP_PX` (8), floor `EINK_LEFT_MARGIN_MIN_PX` (48).
- Chart uses that margin after `yScale.ticks`; text `x={-EINK_Y_TICK_GAP_PX}`.
- Unit: `$120.00` fits (`left > 40`); longer labels widen past the floor.

### Round notes

- R1 format/magnitude Majors **closed**; currency path and regression units hold.
- New Major is a **fit/clip** follow-on of the Fix (correct longer strings vs static gutter), not a reopen of the `12k` bug.
- Result **needs update** — 1 Major fixed in fix-review. Next: Adv re-verify → Quality.

---

## Adversarial

**Round:** 3 · **Result:** clean  
**Updated:** 2026-10-15  
**Scope:** Fresh verifier (writers ≠ verifiers). Confirm R1+R2 Majors closed; re-check left-margin Fix + hunt new Critical/Major. Do not fix code in this stage.

### R1 + R2 Major closure proof

| Fix ask | Verdict | Evidence (would fail / mis-type if removed) |
|---------|---------|-----------------------------------------------|
| R1 Major — money Y ticks via `formatCompactMinor` + currency | **closed** | `formatEinkChartYTick` → `formatCompactMinor` (`kiosk-eink-line-chart.tsx:48-49`); SVG text uses it (`:141`); `currency` required on chart + card; dashboard passes `data.currency`. Unit: USD `12_000` → `$120.00`, `notEqual` `"12k"`; VND matches `formatCompactMinor`. |
| R1 Major — regression unit | **closed** | `kiosk-eink-line-chart.test.ts` format suite — 2/2 pass on re-run. |
| R2 Major — Y-tick gutter / no clip at old `left=40` | **closed** | `einkChartLeftMarginForLabels` from tick strings (`estimateEinkTickLabelWidth` + `EINK_Y_TICK_GAP_PX`, floor `EINK_LEFT_MARGIN_MIN_PX=48`); chart sets `margin.left` from formatted `yTicks` (`:98-99`); text `x={-EINK_Y_TICK_GAP_PX}`. Unit: `$120.00` fits (`left > 40`, width ≤ room); longer labels widen past floor. Tests green (4/4). |

### Findings (R3)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `components/ui/card.tsx` + insights Cards (`bg-surface` vs `.kiosk-eink-insights`) | Forced paper vs Card `bg-surface` race (dark-mode risk). | open (deferred R1) |
| Enhancement | `kiosk-dashboard.tsx` insights A/B cases | Enabled + missing payload → `null` cell (no Unavailable shell). | open (deferred R1) |
| Enhancement | `kiosk-eink-line-chart.tsx` | Hand-rolled visx vs shared `line-chart.tsx` (allowed). | open (deferred R1) |
| Nit | `kiosk-eink-line-chart.test.ts` | Margin/format units lock pure helpers; ChartParentSize SSR still does not paint SVG ticks in card tests — wiring rests on required props + call site. Same as R2 Nit; not a reopen. | open |

### Lock / 04a coverage check (R3)

| Lock / 04a red | Proven? | Note |
|----------------|---------|------|
| Chart money Y format (magnitude) | yes | R1 closed; still holds |
| Chart money Y readable on phone (fit) | yes | R2 closed; dynamic left + unit |
| Registry / Zod / A map / B series / gates / footers / e2e | yes | Unchanged; no new hole found |

### Security (surface)

- No Critical/Major. Prefs still session + Zod enum + max = registry length; no new money HTTP.

### Gated loaders

- Still gated before `Promise.all`; spy units intact. No Critical/Major.

### Fix ask (Critical/Major only)

- None.

**Deferred Enhancements:** Card `bg-surface` vs paper; Unavailable shell for A/B; optional shared `line-chart` wrap; optional SVG tick DOM assert.

### Round notes

- R1 + R2 Majors **closed** with live code + green units; no reopen.
- No new Critical/Major (contracts, gated loaders, Design Outcome B ticks, 04a reds).
- Result **clean** — Adv exit met. Next: Quality.

---

## Quality

**Round:** 1 · **Result:** clean  
**Updated:** 2026-10-15  
**Scope:** Fresh verifier (writers ≠ verifiers). Design UI locks + Gate A #1/#2 + skeleton parity + DESIGN_GUIDE tokens + task acceptance + 04a tests + readability. Adv Majors closed — do not re-litigate unless still broken. Do not fix code.

### Adv Major closure (no reopen)

| Prior Adv Major | Still broken? | Note |
|-----------------|---------------|------|
| R1 money Y ticks / `formatCompactMinor` + currency | no | `formatEinkChartYTick` + required `currency`; USD/VND units green |
| R1 regression unit | no | `kiosk-eink-line-chart.test.ts` format suite |
| R2 Y-tick gutter / clip | no | `einkChartLeftMarginForLabels` + unit (`left > 40` for `$120.00`) |

### Design UI / Gate A #1/#2

| Lock | Pass? | Evidence |
|------|-------|----------|
| Gate A #1 — A on: 2+3+3 + dither + row dividers | yes | `KioskInsightsStatsGridCard` bands `--2` / `--3`×2 + `metric-bar` + two `insights-rule` |
| Gate A #2 — B on: 3 KPIs + line chart | yes | Chart card band `--3` + visx `KioskEinkLineChart` when series non-empty |
| Visual A — structure / dotted rules / dither atom / type hierarchy / footer texts | yes | CSS + card markup; footer “Money” / “Insights · this month” |
| Visual B — KPI row / dotted H+V grid / thick black line / ≤5 X ticks / footer | yes | stroke 2.5; `strokeDasharray`; `xTickIndices(..., 5)`; money Y format + dynamic left |
| Metric map labels A/B + MoM signed % | yes | `SLOT_LABELS` / `KPI_LABELS` match Design; MoM unit |
| Defaults off; month_board stays default money | yes | registry `defaultEnabled: false`; dashboard + registry units |
| Outer Card tokens; ink/paper inside | yes | Card `rounded-[var(--radius-md)] border-border`; `.kiosk-eink-insights` forces ink/paper |

No Major size / position / text / chrome drift vs Design locks or Gate A #1/#2.

### Skeleton parity

| Cell | Pass? | Note |
|------|-------|------|
| A | yes | 2+3+3 metric-skel + two rules + footer-skel; unit asserts band counts |
| B | yes | 3 KPI stubs + chart-skel + footer-skel |
| Default route skeleton | yes | Omits A/B (accepted per Design / DESIGN_GUIDE for non-default prefs) |

### DESIGN_GUIDE / tokens

- Outer surfaces: `rounded-[var(--radius-md)]`; nested skeleton stubs: `rounded-[var(--radius-sm)]`.
- No hard-coded hex / `rounded-md` / shadow chrome in insights components; intentional black/white inside cell matches Design e-ink lock.
- Charts: visx only (no Lightweight Charts).

### Task acceptance + 04a

| Area | Pass? | Note |
|------|-------|------|
| Task 1 registry + Zod max | yes | ids present; defaults omit; max = `KIOSK_WIDGET_IDS.length` |
| Task 2 mappers + gates | yes | order / MoM / budget / null savings / daily spend / skip loads |
| Task 3–5 cards + CSS + skeletons | yes | structure + footer units |
| Task 6 Settings + board + e2e A/B alone | yes | specs named; dashboard map unit |
| 04a Majors (budget / null savings / soft empty / A alone / B alone) | yes | named units + e2e present; related units re-run green (24/24) |

### Architecture (System design / patterns)

- Registry SoT + Zod enum; widget-gated loaders; pure mappers; page-composed payloads; Has DB no — honored. No conflicting shape.

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `components/ui/card.tsx` + insights Cards (`bg-surface` vs `.kiosk-eink-insights`) | Forced paper vs Card `bg-surface` race (dark-mode risk). Same deferred Adv item; not proven Outcome break this pass. | open (deferred) |
| Enhancement | `kiosk-dashboard.tsx` insights A/B cases | Enabled + missing payload → `null` cell (no Unavailable shell vs month_board/net). | open (deferred) |
| Enhancement | `kiosk-eink-line-chart.tsx` | Hand-rolled visx vs shared `line-chart.tsx` (Design allows either). | open (deferred) |
| Nit | `kiosk-eink-line-chart.test.ts` | Margin/format units lock helpers; ChartParentSize SSR does not paint SVG ticks in card tests. | open (deferred) |

### Fix ask (Critical/Major only)

- None.

**Deferred Enhancements:** Card `bg-surface` vs paper; Unavailable shell for A/B; optional shared `line-chart` wrap; optional SVG tick DOM assert.

### Round notes

- Adv R1–R2 Majors remain closed; no reopen.
- Design UI locks, Gate A #1/#2, skeleton parity, tokens, task/04a coverage, and architecture checks pass with zero Critical/Major.
- Result **clean** — Quality exit met. Next: Conditional lens (api).

## Merged lenses

**Result:** clean  
**Lenses:** api only (Has DB no) — `05-lens-api.md` Result clean. No Merge Task (single lens).
