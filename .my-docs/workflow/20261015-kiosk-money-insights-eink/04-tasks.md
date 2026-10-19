# Tasks: Kiosk money-insights e-ink widgets (A + B)

**Design pick (recommended):** Option 1 — two systemic widgets. **Chosen:** Option 1 (Gate B approved 2026-10-15).  
**Has API:** yes · **Has DB:** no  
**Verify commands** (from `00-run.md`): cwd `/Users/ptquang86/ws/my-apps` · `npm run build` · `npm test` · `npm run test:e2e`

## Task 1: Registry ids + prefs Zod max

**Description:**
Add `money.insights_stats_grid` and `money.insights_chart` to `KIOSK_WIDGET_IDS` / registry with `defaultEnabled: false`. Ensure prefs `kioskWidgets` Zod max follows `KIOSK_WIDGET_IDS.length`. Clear Settings labels (insights grid vs chart vs month_board).

**Acceptance:**

- [ ] Both ids in registry; not in `DEFAULT_KIOSK_WIDGETS`.
- [ ] PATCH accepts the new ids; rejects unknown; max length matches registry.
- [ ] Design UI lock: Settings can toggle each alone (two toggles).

**Tests (TDD — what turns red first):**

- [ ] Unit: `widget-registry.test.ts` — resolve(null) still weather + month_board + loans; new ids absent from defaults.
- [ ] Unit: prefs Zod accepts arrays including the two new ids; rejects unknown id; max = registry length.

**Files likely touched:** `lib/kiosk/widget-registry.ts`, `lib/kiosk/widget-registry.test.ts`, `lib/validators/user-preferences.ts`, `lib/validators/user-preferences.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Pure mappers + gated loaders (A + B)

**Description:**
Implement pure builders + `load*IfEnabled` for A (8 slots: Exp/Inc · Net/Sav%/Bills · Loans/Budget/Spend MoM) and B (Exp/Inc/Net + daily spend series from expense cumulative deltas). Period = this calendar month. Gate so disabled widgets never call finance loaders. Reuse analytics / bills / loans / budget helpers like month_board; MoM = prior calendar month expense compare → signed % or `—`.

**Acceptance:**

- [ ] Slot order and labels match Design metric map lock.
- [ ] B series = daily spend deltas (Grill); empty series OK when no spend days.
- [ ] No workspace budget → Budget slot unavailable/`—`; other A slots still present.
- [ ] Disabled → loaders not called; payload omitted.

**Tests (TDD — what turns red first):**

- [ ] Unit: build A from fixture analytics + bills + loans + budget + prior expense → 8 slots in locked order.
- [ ] Unit: MoM signed %; missing prior → `—`.
- [ ] Unit: `budget unavailable keeps other stats-grid slots` — no workspace budget → Budget `—`/unavailable; other 7 slots still ordered/labeled.
- [ ] Unit: `null savings rate shows em dash` — `savingsRatePct: null` → Savings % value `—` (not `0%`).
- [ ] Unit: build B daily spend from cumulative expense points.
- [ ] Unit: `empty daily spend series is soft empty` — `series: []` → KPIs present; no error; chart not treated as loaded series (mapper and/or card).
- [ ] Unit: skip loads when each id disabled (spy never called).

**Files likely touched:** `lib/kiosk/insights-stats-grid.ts` (new), `lib/kiosk/insights-chart.ts` (new), matching `*.test.ts`, `lib/kiosk/load-kiosk-page.ts`

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: E-ink CSS chrome (footer, dotted rules, dither)

**Description:**
Extend `.kiosk-eink-*` (or sibling classes) for A/B: vertical dither bars, dotted horizontal dividers, dither footer band, typography hierarchy (top KPIs larger). Force monochrome ink/paper **inside** cell. Outer Card keeps shell tokens / `rounded-[var(--radius-md)]`.

**Acceptance:**

- [ ] Visual elements match Design UI locks for A and B (bars, dotted rules, footer).
- [ ] Footer copy: left “Money”; right “Insights · this month”.
- [ ] Greys via dither only inside cell (no soft theme wash that fails Outcome).

**Tests (TDD — what turns red first):**

- [ ] Unit/DOM: card markup exposes footer text + row structure classes (or snapshot of class names) — no visual e2e required here.

**Files likely touched:** `app/globals.css`, shared e-ink metric primitive if extracted

**Scope:** M

**Dependencies:** none (can parallel Task 2)

---

## Task 4: Card A — stats grid UI + skeleton

**Description:**
New `kiosk-insights-stats-grid-card` matching `refs/money-insights-stats-grid.png` at 100% fidelity (2+3+3, dither bars, dotted dividers, footer). Wire into dashboard when payload present. Update skeleton with matching 2+3+3 + footer stubs (skeleton parity / zero CLS for this cell).

**Acceptance:**

- [ ] Layout/IA matches Design visual lock A (Build ↔ UI lock).
- [ ] Money formats readable (same style family as month_board).
- [ ] Empty/unavailable slots clear, not errors.
- [ ] Skeleton order/grid mirrors live card.

**Tests (TDD — what turns red first):**

- [ ] Unit: card renders 8 labels/values from fixture; footer strings present.
- [ ] Unit: skeleton exposes same band structure / footer stub (parity assert).

**Files likely touched:** `components/kiosk/kiosk-insights-stats-grid-card.tsx` (+ test), `kiosk-dashboard.tsx`, `kiosk-dashboard-skeleton.tsx` (+ tests)

**Scope:** M

**Dependencies:** Task 2, Task 3

---

## Task 5: Card B — chart UI (visx) + skeleton

**Description:**
New `kiosk-insights-chart-card` matching `refs/money-insights-chart.png`: 3 KPIs + dotted-grid line chart + footer. Chart via **visx** only (reuse/wrap `components/charts/line-chart.tsx` with monochrome stroke/grid). Sparse ticks for phone. Skeleton: 3 KPI stubs + chart area + footer.

**Acceptance:**

- [ ] Visual lock B met (dither KPI bars, dotted chart grid, footer).
- [ ] Visx only — no Lightweight Charts / hand-roll chart stack.
- [ ] Phone-readable stroke/ticks; empty series soft empty, not error.
- [ ] Skeleton parity with live B.

**Tests (TDD — what turns red first):**

- [ ] Unit: card renders 3 KPI labels + footer; mounts chart region when series non-empty.
- [ ] Unit: `empty daily spend series is soft empty` — `series: []` → 3 KPIs + footer; no error UI; chart region not mounted as loaded series.
- [ ] Unit: skeleton structure mirrors B.

**Files likely touched:** `components/kiosk/kiosk-insights-chart-card.tsx` (+ test), chart wrapper if needed, `kiosk-dashboard.tsx`, skeleton + tests

**Scope:** M

**Dependencies:** Task 2, Task 3

---

## Task 6: Settings + board wiring + e2e smoke

**Description:**
Settings toggles list new registry entries. Dashboard switch renders A/B cards. Extend `e2e/kiosk-layout.spec.ts` (or sibling) to enable each widget and assert cell/footer presence. Do not change sibling layout engine / month_board defaults except integration hooks.

**Acceptance:**

- [ ] A and B toggle off by default; month_board unchanged as default money glance.
- [ ] Enabling either shows that cell under existing layout modes.
- [ ] E2E: toggle on → board shows widget chrome/footer (or stable test id).
- [ ] Design UI locks still honored in wired board.

**Tests (TDD — what turns red first):**

- [ ] Unit: settings lists both ids; dashboard maps payloads → cards.
- [ ] E2E: `kiosk insights A alone` — enable A only → stats-grid cell/footer; chart cell absent.
- [ ] E2E: `kiosk insights B alone` — enable B only → chart cell/footer; stats-grid absent.
- [ ] E2E: footer copy `Money` / `Insights · this month` on enabled cell(s).

**Files likely touched:** `kiosk-widget-settings.tsx` (+ test), `kiosk-dashboard.tsx` (+ test), `e2e/kiosk-layout.spec.ts`

**Scope:** M

**Dependencies:** Task 4, Task 5

---

## Checkpoints

After Tasks 1–2:

- [ ] Focused unit tests green for registry + mappers/loaders
- [ ] Verify unit slice: `npm test` (targeted files OK)

After Tasks 3–5:

- [ ] Side-by-side visual check vs refs A/B (manual)
- [ ] Skeleton parity reviewed for A and B
- [ ] `npm test` for new card/skeleton tests

After Task 6:

- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run test:e2e` (kiosk layout / new specs)

## Non-goals (do not schedule)

- Rewrite sibling layout / month_board feature
- New money REST route or DB migration
- YouTube/GA/trmnl branding; Insights page redesign
