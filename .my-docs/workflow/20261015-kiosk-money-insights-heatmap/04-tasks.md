# Tasks: Kiosk money-insights heatmap widget

**Design pick (recommended):** Option 1 — systemic new heatmap widget.  
**Has API:** yes · **Has DB:** no  
**Verify commands** (from `00-run.md`): cwd `/Users/ptquang86/ws/my-apps` · `npm run build` · `npm test` · `npm run test:e2e`  
**04a:** yes — planned unit + e2e tests below (parent runs TDD test-case review)

## Task 1: Registry id + prefs Zod + defaults

**Description:**
Add `money.insights_heatmap` to `KIOSK_WIDGET_IDS` / registry with `defaultEnabled: true`. Keep `money.month_board` default on; leave A/B insights default off. Prefs `kioskWidgets` Zod max follows `KIOSK_WIDGET_IDS.length`. Clear Settings label (heatmap vs month board vs A/B).

**Acceptance:**

- [ ] Id in registry; present in `DEFAULT_KIOSK_WIDGETS` with `money.month_board`.
- [ ] A/B insights still absent from defaults.
- [ ] PATCH accepts the new id; rejects unknown; max = registry length.
- [ ] Design UI lock: Settings can toggle heatmap alone.

**Tests (TDD — what turns red first):**

- [ ] Unit: `widget-registry.test.ts` — resolve(null) includes `money.insights_heatmap` **and** `money.month_board`; excludes A/B insights ids.
- [ ] Unit: prefs Zod accepts arrays including `money.insights_heatmap`; rejects unknown id; max = registry length.
- [ ] Unit (04a Major): `resolveKioskWidgets keeps stored set without injecting insights_heatmap` — e.g. `["money.month_board","loans.payments"]` stays that set (null-prefs-only defaults).

**Files likely touched:** `lib/kiosk/widget-registry.ts`, `lib/kiosk/widget-registry.test.ts`, `lib/validators/user-preferences.ts`, `lib/validators/user-preferences.test.ts`, Settings kiosk widget copy if needed

**Scope:** S

**Dependencies:** none

---

## Task 2: Year window + daily activity grain + pure mapper + gated loader

**Description:**
Add rolling ~365d range helper + thin Money service (or injectable loader) returning `{ date, txCount }[]` for the window (all tx kinds). Pure mapper: calendar-day fill → money-active days → streaks → peak → average (1 decimal) → dither levels 0–3 per Design buckets → widget payload. `loadInsightsHeatmapIfEnabled` skips loaders when disabled. Wire into `load-kiosk-page`.

**Acceptance:**

- [ ] Window = rolling last ~365 calendar days (workspace TZ end = today).
- [ ] Hero = money-active day count; KPIs order/labels match Design metric map.
- [ ] Streaks = any day with ≥1 tx; current streak 0 if today inactive.
- [ ] Buckets: 0→0, 1→1, 2–3→2, ≥4→3; empty year → zeros + all level 0 cells (full grid).
- [ ] Disabled → loaders not called; payload omitted.

**Tests (TDD — what turns red first):**

- [ ] Unit: build from fixture daily counts → hero, 4 KPIs, cell levels match locks.
- [ ] Unit: empty window → hero 0, streaks 0, peak 0, avg `0.0`, all cells level 0, length ≈ 365.
- [ ] Unit: streak edges (gap breaks longest; today inactive → current 0; income-only day counts as active).
- [ ] Unit: bucket boundaries (0 / 1 / 2 / 3 / 4+).
- [ ] Unit: skip loads when id disabled (spy never called).
- [ ] Unit (04a Major): `sparse daily grain fills missing days as level 0` — few dated counts → full window `cells.length`; gaps level 0.
- [ ] Unit (04a Enhancement): `average per day uses one decimal` — non-zero avg formats to one decimal (e.g. `2.5`).

**Files likely touched:** `lib/kiosk/insights-heatmap.ts` (new), `lib/kiosk/insights-heatmap.test.ts`, `lib/kiosk/kiosk-analytics-filters.ts` (year range), `lib/money-services/analytics.ts` (daily count grain if needed), `lib/kiosk/load-kiosk-page.ts`

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: E-ink CSS — heatmap grid + dotted rules + footer year copy

**Description:**
Extend `.kiosk-eink-insights*` for hero|2×2 dotted rules, vertical-pill week×day grid, four stipple densities, dither footer. Force monochrome ink/paper inside cell. Extend `KioskInsightsFooter` (or heatmap variant) so right text can be “Insights · last year” without breaking A/B “this month”.

**Acceptance:**

- [ ] Visual elements match Design visual lock (bands, dotted rules, 4 dither levels, footer).
- [ ] Footer: left “Money”; right “Insights · last year”; no GitHub / Octocat / @handle.
- [ ] Greys via dither only inside cell (no soft theme wash).

**Tests (TDD — what turns red first):**

- [ ] Unit/DOM: footer renders year copy when heatmap props used; A/B still “this month” if shared component.
- [ ] Unit/DOM: cell level classes/attrs expose levels 0–3 (or snapshot of class names).

**Files likely touched:** `app/globals.css`, `components/kiosk/kiosk-insights-footer.tsx` (+ test if present)

**Scope:** M

**Dependencies:** none (can parallel Task 2)

---

## Task 4: Heatmap card UI + skeleton + board / Settings wiring

**Description:**
New `kiosk-insights-heatmap-card` matching `refs/money-insights-heatmap.png` at 100% fidelity (hero + 2×2 + year grid + footer). Wire into `kiosk-dashboard` when payload present. Update dashboard/insights skeletons for three-band parity (zero CLS). Settings toggle already from registry.

**Acceptance:**

- [ ] Layout/IA matches Design visual lock (Build ↔ UI lock); money labels only.
- [ ] Empty year shows zeros + empty dither grid + footer (no empty-copy line).
- [ ] Skeleton order/bands mirror live card.
- [ ] Design UI lock: Gate A #1 hero + #2 heatmap always visible when widget on; no in-cell controls.

**Tests (TDD — what turns red first):**

- [ ] Unit: card renders hero + 4 KPI labels/values + footer strings from fixture.
- [ ] Unit: empty fixture → zeros + level-0 grid present (not error UI).
- [ ] Unit: skeleton exposes same band structure / footer stub (parity assert).
- [ ] Unit: dashboard renders heatmap card when payload present; omits when absent.

**Files likely touched:** `components/kiosk/kiosk-insights-heatmap-card.tsx` (+ test), `kiosk-dashboard.tsx` (+ test), `kiosk-dashboard-skeleton.tsx` (+ test), `kiosk-insights-skeletons.tsx`, `docs/DESIGN_GUIDE.md` § Kiosk note if needed

**Scope:** M

**Dependencies:** Task 2, Task 3

---

## Task 5: E2E prefs toggle smoke

**Description:**
Extend `e2e/kiosk-layout.spec.ts` (or sibling) so enabling/disabling `money.insights_heatmap` persists and board shows/hides the cell; defaults path covers heatmap present with month_board when prefs null/fresh.

**Acceptance:**

- [ ] Toggle off → cell gone after reload; toggle on → cell back.
- [ ] Fresh/default prefs path includes heatmap (and month_board still available).
- [ ] Does not assert A/B default-on.

**Tests (TDD — what turns red first):**

- [ ] E2E: heatmap toggle round-trip in Settings → `/kiosk`.
- [ ] E2E or unit already covering defaults — ensure e2e does not require A/B widgets on.
- [ ] E2E/unit (04a Major): `heatmap off keeps month_board on /kiosk` — disable heatmap → heatmap cell gone; month_board still present when enabled (Grill coexistence).

**Files likely touched:** `e2e/kiosk-layout.spec.ts`

**Scope:** S

**Dependencies:** Task 1, Task 4

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused unit tests pass
- [ ] Side-by-side composition check vs `refs/money-insights-heatmap.png` (bands / dither / footer)
- [ ] Light + dark shell: monochrome **inside** cell still holds
- [ ] Verify commands ready: `npm run build` · `npm test` · `npm run test:e2e`
