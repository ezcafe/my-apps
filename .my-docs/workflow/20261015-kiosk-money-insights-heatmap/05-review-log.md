# Review log: 20261015-kiosk-money-insights-heatmap

## Adversarial test review

**Round:** 2 · **Result:** clean  
**Updated:** 2026-10-15  
**Scope:** Fresh verifier (writers ≠ verifiers). Re-check Fix R1 Majors against draft tests vs `04-tasks.md` / Design. Do not fix code in this stage.

### Round 1 (baseline)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `kiosk-insights-heatmap-card.test.ts` | Card unit locked labels/testids/footer/`data-level` only — not fixture hero/KPI **values**. | closed (R2 proven) |
| Major | `kiosk-dashboard.test.ts` | Missing enabled heatmap + empty `widgets` → Unavailable (A/B twins had it). | closed (R2 proven) |
| Enhancement | `kiosk-analytics-filters.ts` (`rollingYearDateRange`) | Rolling ~365d helper untested (`addDaysIso(to, -364)` Grill lock). | open (defer) |
| Enhancement | `insights-heatmap.test.ts` streak edges | “Income-only day” is mock theater (txCount only; kind already erased). | open (defer) |
| Enhancement | `kiosk-insights-heatmap-card.tsx` (`packHeatmapSlots`) | Sunday-first pad packing untested. | open (defer) |
| Nit | `user-preferences.test.ts` | Hard-codes `KIOSK_WIDGET_IDS.length === 11`. | open (defer) |
| FYI | `06-test-log.md` Smoke | E2E heatmap specs exist; not executed this Build (Postgres down). | open (defer) |

### Round 2 — Fix R1 closure proof

| Fix ask | Verdict | Evidence (would fail if removed) |
|---------|---------|----------------------------------|
| Major — card hero/KPI values | **proven** | `kiosk-insights-heatmap-card.test.ts:39-48`: `fixture.hero.value === 3`, HTML `>3<`, KPI `valueDisplay`s `["3","0","4","1.8"]` each matched as `>…<`. Labels-only path no longer enough. |
| Major — Unavailable failure-mode | **proven** | `kiosk-dashboard.test.ts:364-374`: enabled `money.insights_heatmap` + `widgets: {}` → cell + `data-testid="kiosk-insights-heatmap"` + `Unavailable` (mirrors A/B). Live branch `kiosk-dashboard.tsx:106-109` still renders `KioskInsightsHeatmapUnavailable`. |

### Findings (R2)

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `lib/kiosk/kiosk-analytics-filters.ts` (`rollingYearDateRange`) | Rolling ~365d window helper still untested. Empty-window mapper uses a hand-picked range; stubs never call `rollingYearDateRange` / `insightsHeatmapRange`. | open (defer) |
| Enhancement | `lib/kiosk/insights-heatmap.test.ts:97-116` | “Income-only day” remains mock theater (mapper sees `txCount` only). Real lock belongs in daily-count service (no kind filter). | open (defer) |
| Enhancement | `components/kiosk/kiosk-insights-heatmap-card.tsx` (`packHeatmapSlots`) | Sunday-first pad packing still untested. | open (defer) |
| Enhancement | `kiosk-insights-heatmap-card.test.ts:40-48` | Hero value `3` equals longest KPI `3`; independent `>3<` matches do not require two occurrences. Residual binding hardness; aria-label pairs exist for tighter locks later. | open (defer) |
| Nit | `lib/validators/user-preferences.test.ts:39-40` | Hard-codes `KIOSK_WIDGET_IDS.length === 11`. | open (defer) |
| FYI | `e2e/kiosk-layout.spec.ts` + Smoke | Heatmap toggle + month_board coexistence specs look sound; execution still deferred to full test stage. | open (defer) |

**No new Critical/Major this round.**

### Lock / 04-tasks coverage check (R2)

| Lock / planned red | Proven? | Note |
|--------------------|---------|------|
| Registry resolve(null): heatmap + month_board; omit A/B | yes | `widget-registry.test.ts` |
| Stored set not injected with heatmap | yes | same |
| Zod accept id / reject unknown / max = registry length | yes | `user-preferences.test.ts` |
| Mapper: hero, 4 KPIs, buckets, empty year, sparse fill, avg 1 decimal | yes | `insights-heatmap.test.ts` |
| Streak edges (gap / today inactive / trailing current) | yes | same (income-only claim = Enhancement theater) |
| Gated skip when disabled (spy) | yes | `loadInsightsHeatmapIfEnabled` |
| Rolling ~365d helper | **no** | Enhancement — helper untested |
| Footer year vs A/B this month | yes | `kiosk-insights-footer.test.ts` |
| Cell levels 0–3 exposed | yes | card unit `data-level` |
| Card hero/KPI **values** from fixture | yes | R2 closed |
| Empty card → zeros + level-0 grid, not error | yes | card empty fixture |
| Skeleton three bands + footer stub | yes | card + dashboard-skeleton units |
| Dashboard present / omit when off | yes | dashboard unit |
| Enabled + missing payload → Unavailable | yes | R2 closed |
| E2E toggle round-trip + month_board coexistence | yes (spec) | not run in smoke |
| Defaults path includes heatmap | yes (unit) | registry + skeleton order; e2e relies on toggle-on |

### Security (surface)

- Prefs stay session + Zod enum + max = registry length; no new money HTTP; workspace-scoped grain. No Critical/Major security findings this pass.

### Gated loaders

- `loadInsightsHeatmapIfEnabled` returns early before `loadDailyTxCounts`; page only schedules when `wantInsightsHeatmap`. Spy unit proves skip. Unavailable UI failure-mode now unit-locked.

### Fix ask (Critical/Major only)

none — Round 2 clean.

**Deferred Enhancements:** `rollingYearDateRange` unit; income-only service-level proof; Sunday pad packing unit; tighter hero/KPI value asserts (count or aria-label pairs); Zod length hard-code nit; e2e run when Postgres up.

### Round notes

- Fix R1 delivered both Majors as test locks only (production unchanged); re-read confirms behavior + asserts align with Task 4 / sibling A/B Unavailable pattern.
- Core mapper / registry / Zod / footer / gated-skip / empty-grid / e2e-spec coverage remains solid and deterministic.
- Result **clean** — zero Critical/Major open. Next: Quality.

## Quality

**Round:** 1 · **Result:** clean  
**Updated:** 2026-10-15  
**Scope:** Fresh verifier (writers ≠ verifiers). Design UI locks + Gate A #1/#2 + chrome (size/positions/texts) + skeleton parity + System design / patterns + task acceptance. Do not deep-review API (Lens plan api). Do not fix code.

### Adv Major closure (no reopen)

| Prior Adv Major | Still broken? | Note |
|-----------------|---------------|------|
| Card hero/KPI **values** locked in unit | no | `kiosk-insights-heatmap-card.test.ts` fixture values in markup |
| Enabled + empty `widgets` → Unavailable | no | `kiosk-dashboard.test.ts` + live Unavailable branch |

### Design UI / Gate A #1/#2

| Lock | Pass? | Evidence |
|------|-------|----------|
| Gate A #1 — hero (large value + money label) always visible when on | yes | `KioskInsightsHeatmapCard` hero band; label `Active days in last year` |
| Gate A #2 — year contribution heatmap always visible when on | yes | `kiosk-eink-heatmap-grid` + `data-level` 0–3 pills; no in-cell controls |
| Visual — top band hero \| 2×2 KPIs (value over label) | yes | `.kiosk-eink-heatmap-top` + KPI order Longest→Current→Most→Average |
| Visual — 1px dotted rules (V between hero/2×2; H under top; H+V in 2×2) | yes | `::before` + `.kiosk-eink-insights-rule` + KPI background cross |
| Visual — ~7×52+ vertical rounded pills; 4 dither densities | yes | `grid-template-rows: repeat(7)`; levels 0 outline / 1–2 stipple / 3 solid |
| Visual — footer Money / Insights · last year; no GitHub/@ | yes | `KioskInsightsFooter periodLabel="last year"`; mark + Money |
| Visual — monochrome ink/paper inside; greys via stipple | yes | `--eink-ink` / `--eink-paper` + `--eink-stipple` on live cell |
| Metric map + buckets + empty zeros + full level-0 grid | yes | `insights-heatmap.ts` + card empty fixture unit |
| Defaults A (heatmap + month_board on; A/B off) | yes | `widget-registry.ts` |

No Major size / position / text / chrome drift vs Design visual lock or Gate A #1/#2. Fidelity SoT (bands / dotted rules / dither / footer; not RYAN letter art) held in draft markup + CSS.

### Skeleton parity

| Check | Pass? | Note |
|-------|-------|------|
| Three-band skel (top hero\|2×2 → grid stub → footer stub) | yes | `KioskInsightsHeatmapCardSkeleton` + dashboard default order |
| Dotted rule stub between top and grid | yes | `kiosk-eink-insights-rule` in skel |
| Zero CLS intent (same Card / class shell) | yes | `kiosk-eink-insights-heatmap` on skel |

### Architecture (System design / patterns)

| Pattern / practice | Honored? | Note |
|--------------------|----------|------|
| Registry SoT + Zod enum + default on | yes | id present; A/B stay off |
| Widget-gated loader + pure mapper | yes | `loadInsightsHeatmapIfEnabled` + `buildInsightsHeatmapWidget` |
| E-ink contribution chrome CSS | yes | heatmap-specific classes; shared footer |
| Anti-patterns (theme wash live / GitHub / spend intensity / amend A/B) | yes | live path ink/paper; count signal; A/B untouched |

### Findings

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `components/ui/card.tsx` + heatmap Card (`bg-surface` vs `.kiosk-eink-insights`) | Forced paper vs Card `bg-surface` race (dark-mode risk if utility wins). Same class of issue as A/B insights. | open (defer) |
| Enhancement | `app/globals.css` `.kiosk-eink-heatmap-grid` | Fixed `0.7rem` columns + `overflow-x: auto` — on narrow board cells much of the ~52-week year scrolls off-canvas. Ref shows full-year snake in frame; Design “dense on phone” reads as shrink-to-fit, not scroll. Not Major vs locked fidelity list (bands/rules/dither/footer). | open (defer) |
| Enhancement | Adv carry-forward | `rollingYearDateRange` untested; income-only theater; Sunday pad packing untested; Zod length hard-code nit; e2e not run in smoke. | open (defer) |
| Nit | `.kiosk-eink-heatmap-hero-label` `max-width: 12rem` | Long hero label may wrap tighter than ref under huge value. | open (defer) |

### Task acceptance (spot)

| Task | Acceptance vs draft | Note |
|------|---------------------|------|
| 1 Registry / Zod / defaults | yes | unit coverage from Adv |
| 2 Mapper / gated load / page wire | yes | Adv lock table |
| 3 CSS chrome + footer year copy | yes | live CSS + footer unit |
| 4 Card + skeleton + dashboard | yes | units + Unavailable |
| 5 E2E specs | yes (spec) | execution deferred to full test |

### Fix ask (Critical/Major only)

none

**Deferred Enhancements:** Card `bg-surface` vs paper; year-grid width-fit vs overflow-x; Adv carry-forwards (rollingYearDateRange unit; pad packing; Zod length nit; e2e when Postgres up); hero label max-width nit.

### Round notes

- Adv R2 Majors remain closed; no reopen.
- Design UI / Gate A #1/#2 / chrome checklist pass with zero Critical/Major.
- Result **clean** — Quality exit met. Next: Conditional lens (api).

## Fix notes (adversarial-tests · Round 1)

**Updated:** 2026-10-15  
**Lens:** adversarial-tests  
**Result:** fixed (Critical/Major only) — Adversarial Round 2 re-verified clean

### Changes

1. **Card values** — `kiosk-insights-heatmap-card.test.ts`: assert fixture `hero.value === 3` and KPI `valueDisplay`s `["3","0","4","1.8"]` appear as `>…<` in rendered HTML (labels alone no longer enough).
2. **Unavailable failure-mode** — `kiosk-dashboard.test.ts`: enabled `money.insights_heatmap` + empty `widgets` → cell + `data-testid="kiosk-insights-heatmap"` + `Unavailable` (mirrors A/B).

**Production code:** unchanged (test locks only).  
**TDD:** added asserts / new case first; both suites green (behavior already present).  
**Verify:** `npm run build` pass; `npm test` exit 0 (fail 0; unrelated telegram AbortSignal cancel flake sometimes cancels 1). E2E not required this Fix.  
**Deferred Enhancements:** unchanged — rollingYearDateRange unit; income-only service proof; Sunday pad packing; Zod length nit; e2e when Postgres up.  
**Self-approve:** no — parent re-ran Adversarial (R2 clean).
