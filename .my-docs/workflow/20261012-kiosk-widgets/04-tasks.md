# Tasks: Configurable kiosk widgets + month money board

**Design pick:** Option 1 — unified widget-cell CSS Grid. **Has API:** yes. **Has DB:** yes.

## Task 1: Schema + Zod + prefs service for `kioskLayout`

**Description:**
Add `user_preferences.kiosk_layout` JSONB; Drizzle type; Zod on PATCH; serialize/resolve defaults `{ mode: "grid", columns: 1, focusWidgetId: null }`. Nested replace: when `kioskLayout` present, all three fields required; omit key = unchanged. Treat `kioskLayout` as a write key so layout-only PATCH persists (fix today’s weather/widgets early-return silent no-op).

**Acceptance:**

- [ ] Migration + schema column present (`ADD COLUMN IF NOT EXISTS kiosk_layout jsonb` + journal); GET returns resolved `kioskLayout`.
- [ ] PATCH accepts full nested object when key present; rejects bad mode/columns/unknown `focusWidgetId` (`400`); same auth/same-origin/rate-limit.
- [ ] Layout-only PATCH (only `kioskLayout`) round-trips and persists; empty/no-layout keys still no-op.
- [ ] Null/missing layout resolves to grid-1 defaults.

**Tests (TDD — what turns red first):**

- [ ] Unit: `userPreferencesPatchSchema` accepts valid `kioskLayout`, rejects `columns: 5` / bad mode / unknown `focusWidgetId`.
- [ ] Unit: Zod rejects incomplete nested `kioskLayout` (e.g. mode+columns, no `focusWidgetId`).
- [ ] Unit: layout-only PATCH path writes `kiosk_layout` (no silent no-op when only layout key present).
- [ ] Unit: widgets-only PATCH (omit `kioskLayout`) leaves prior `kioskLayout` unchanged.
- [ ] Unit: resolve helper null → grid-1; `resolveFocusWidgetId` maps disabled/stale → first enabled (null if zero). Unknown ids rejected at PATCH — not a resolve fork.
- [ ] Unit (enhancement): PATCH may persist disabled `focusWidgetId`; board resolve still falls back.

**Files likely touched:** `db/schema/user-preferences.ts`, new migration, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, related unit tests

**Scope:** M

**Dependencies:** none

---

## Task 2: Registry — `money.month_board` + default flip

**Description:**
Add `money.month_board` to `KIOSK_WIDGET_IDS` / registry (on by default). Set `money.net_month` / `bills.summary` / `savings.summary` defaultEnabled false. Keep weather + loans.payments on. Update labels so month board vs small cards are clear. **Null-prefs only:** resolve(null) gets new defaults; no migrate of existing stored widget sets.

**Acceptance:**

- [ ] `DEFAULT_KIOSK_WIDGETS` = weather + month board + loans.payments.
- [ ] Old small money cards remain togglable, off by default.
- [ ] Zod max length follows new id list.
- [ ] No one-time migrate that rewrites existing stored prefs.

**Tests (TDD — what turns red first):**

- [ ] Unit: update `widget-registry.test.ts` defaults / resolve(null) expectations (expect red until flip).
- [ ] Unit: `resolveKioskWidgets` keeps stored set without injecting `money.month_board` (e.g. `["money.net_month","loans.payments"]` stays that set).

**Files likely touched:** `lib/kiosk/widget-registry.ts`, `lib/kiosk/widget-registry.test.ts`

**Scope:** S

**Dependencies:** none (can parallel Task 1)

---

## Task 3: Loader payload for month money board

**Description:**
When `money.month_board` enabled, load current-month analytics (expenses, income, net, savings rate); **`billsMinor`** = bills-ledger expense current month via existing `MONEY_LEDGER_BILLS` / `bills.summary` path (`analyticsFiltersForLedgerPresetFromLookups` → `computeMoneyAnalyticsSummary` → expense minor); **`loansMinor`** = `loansInsightsSummary(…).monthlyObligationMinor` (same source as today’s `loans.summary` — not a ledger preset, not installment due-sum); workspace-scope budget via `listMoneyBudgets(workspaceId, { includeSpent: true, from, to })` with `currentMonthDateRange()` → map `spentAmountMinor` / `effectiveLimitAmountMinor`. Empty chart (`budgetChart: null`) if no workspace-scope row. Widget-gated only. Shape locked in Design → Module I/O `KioskMonthBoardWidget`.

**Acceptance:**

- [ ] `KioskPageData.widgets.monthBoard` matches Design contract: `expenseMinor`, `incomeMinor`, `netMinor`, `savingsRatePct`, `billsMinor`, `loansMinor`, `range`, `budgetChart: { spentMinor, limitMinor } | null`.
- [ ] `billsMinor` uses `MONEY_LEDGER_BILLS` expense path (same as `bills.summary`); `loansMinor` = `monthlyObligationMinor` from `loansInsightsSummary` (same as `loans.summary`).
- [ ] Budget load uses `listMoneyBudgets` + current-month `from`/`to` (not a fictional `listBudgets`); `.find(b => b.scopeType === "workspace")`.
- [ ] No workspace budget → `budgetChart: null`; six metrics still when analytics ok.
- [ ] Disabled widget → no extra finance fetch for month board.

**Tests (TDD — what turns red first):**

- [ ] Unit/integration: loader (or pure mapper) builds `monthBoard` fields from analytics + bills-ledger fixture + `loansInsightsSummary.monthlyObligationMinor` + `listMoneyBudgets`; missing workspace-scope row → `budgetChart: null`.
- [ ] Unit: `loansMinor` maps from `monthlyObligationMinor` (not remaining / not due-installment sum); `billsMinor` from bills-ledger expense.
- [ ] Unit: `skips month-board finance loads when money.month_board disabled` — spies/mocks (`listMoneyBudgets` / month analytics / bills+loans month-board paths) never called; payload omits `monthBoard`.

**Files likely touched:** `lib/kiosk/load-kiosk-page.ts`, `lib/money-services/budgets.ts` (call site only), loader tests if present

**Scope:** M

**Dependencies:** Task 2

---

## Task 4: Layout resolve helpers (focus + pure cols test helper)

**Description:**
Pure helpers: `resolveKioskLayout`, `resolveFocusWidgetId(enabled, focus)` (invalid/disabled → first enabled), and `effectiveKioskColumns(pref, viewportCap)` as a **pure unit-test helper** (`min(pref, injectedCap)` only — callers inject cap; live board does **not** call this with a measured width). Live column SoT is CSS-only (Design Concept 1: `--kiosk-pref-cols` + `@container` tokens `kiosk-cq-phone-narrow` / `kiosk-cq-phone-wide` / `kiosk-cq-wider`). Settings + board share layout resolve/focus; Settings still offers columns 1–4.

**Acceptance:**

- [ ] `effectiveKioskColumns` is pure: injected cap only; documented that live board uses CSS container override, not JS measure.
- [ ] Cap bands named in Design (phone-narrow → 1, phone-wide → 2, wider → 4) — no second SoT in JS.
- [ ] Focus fallback matches Grill edge table.
- [ ] Default layout grid-1.

**Tests (TDD — what turns red first):**

- [ ] Unit: `effectiveKioskColumns(4, 2) → 2`; `effectiveKioskColumns(3, 4) → 3`; focus disabled → first enabled; zero enabled → null focus.

**Files likely touched:** `lib/kiosk/` (new or extend registry/layout module) + `*.test.ts`

**Scope:** S

**Dependencies:** Task 1 (types) preferred; can stub types briefly

---

## Task 5: Settings UI — layout + conditional focus

**Description:**
Extend `kiosk-widget-settings`: mode (fullscreen/grid), columns 1–4, focus select only when mode=fullscreen and 2+ enabled. PATCH with existing notify. No builder chrome.

**Acceptance:**

- [ ] User can save layout; GET/reopen shows same values.
- [ ] Focus control hidden when grid or fewer than 2 enabled widgets.
- [ ] ≥44px hits; light/dark tokens.

**Tests (TDD — what turns red first):**

- [ ] Component/unit: focus control visibility matrix (fullscreen+2+ / grid / 1 widget).
- [ ] E2E (later Task 8): Settings save layout persists.

**Files likely touched:** `components/kiosk/kiosk-widget-settings.tsx`, settings page wiring if needed, tests

**Scope:** M

**Dependencies:** Task 1, Task 4

---

## Task 6: Board engine Option 1 + month money card UI

**Description:**
Refactor `kiosk-dashboard` to widget cells (unified CSS Grid). Fullscreen = one focus cell; grid = CSS `--kiosk-cols` from pref + container-query cap (Concept 1 tokens — no ResizeObserver / no JS width measure). Implement month money card: **circular** budget % gauge + dither accents + 2×3 value-over-label pairs (Expenses/Income, Net/Savings rate, Bills/Loans); theme tokens + default Card border; no footer — layout from `refs/money-widget-ref.png`. Empty enable prompt when zero widgets. Money off → #2 = first non-money primary content.

**Acceptance:**

- [ ] Gate A #1/#2 visible rules met for money on/off.
- [ ] Column cap is CSS-only (`kiosk-cq-phone-narrow` / `phone-wide` / `wider`); phone never shows unreadable 3–4 col squeeze.
- [ ] Budget viz is circular e-ink gauge (progressbar a11y); not linear bar.
- [ ] No Tesla/e-ink chrome; light/dark OK.
- [ ] DESIGN_GUIDE: status board cells, not builder.

**Tests (TDD — what turns red first):**

- [ ] Unit: dashboard picks focus cell in fullscreen; grid renders N cells; board sets `--kiosk-pref-cols` from layout.
- [ ] Unit: month money card renders six labels + empty chart state + circular gauge affordance.
- [ ] Unit: `shows enable prompt when zero widgets enabled` (enable-prompt / Settings link copy; no money/loan cells).
- [ ] Unit: `without month board shows first non-money widget as primary content` (enabled = weather + loans only → no Expenses/Income month-board block).

**Files likely touched:** `components/kiosk/kiosk-dashboard.tsx`, new month-board card component, kiosk CSS/tokens for `--kiosk-cols`, related tests, DESIGN_GUIDE kiosk wording if needed

**Scope:** M

**Dependencies:** Task 2, Task 3, Task 4

---

## Task 7: Skeleton / loading — default-only layout

**Description:**
Lock `app/(shell)/kiosk/loading.tsx` + `kiosk-dashboard-skeleton` to **default-only** layout: `mode: "grid"`, `columns: 1`, cells for default widgets only (`context.today_weather` + `money.month_board` + `loans.payments`) with month-board structure (circular gauge placeholder + 2×3 metric grid). **No** prefs/DB await in route `loading`. Do **not** require skeleton variants for fullscreen or grid 2–4. Accept possible CLS when user prefs differ from defaults (documented in Design UI).

**Acceptance:**

- [ ] Route `loading` / skeleton always render default-only grid-1 three-cell layout (weather + month board + loans).
- [ ] Month-board skeleton mirrors circular gauge + metric pairs of live default card.
- [ ] Concentric radii tokens (`--radius-md` / `--radius-sm`).
- [ ] No code path that reads `user_preferences` inside `loading.tsx`.

**Tests (TDD — what turns red first):**

- [ ] Extend `kiosk-dashboard-skeleton.test.ts` for **default-only** structure (three cells / month-board slots) — not fullscreen or multi-col variants.

**Files likely touched:** `components/kiosk/kiosk-dashboard-skeleton.tsx`, `app/(shell)/kiosk/loading.tsx`, skeleton tests

**Scope:** M

**Dependencies:** Task 6

---

## Task 8: E2E — Settings layout + kiosk glance

**Description:**
Add e2e covering: set grid cols / fullscreen focus → `/kiosk` matches; default widgets include month board; money metrics visible when seeded; CSS column-cap readable on narrow viewport if project has viewport helpers (no JS measure assert).

**Acceptance:**

- [ ] Happy path Settings → kiosk reflects layout without confusion.
- [ ] Month board shows budget progress and key pairs when data present (or empty chart + metrics).

**Tests (TDD — what turns red first):**

- [ ] E2E: `settings kiosk layout persists on /kiosk` — save grid cols=2 (or fullscreen + focus) → `/kiosk` shows matching mode/cols/focus cell; month-board glance (Expenses/Income labels or empty chart + metrics).

**Files likely touched:** `e2e/` kiosk/settings specs

**Scope:** M

**Dependencies:** Task 5, Task 6, Task 7

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused unit tests pass (`npm test` scoped)
- [ ] Slice works: prefs save → `/kiosk` layout (manual or e2e)
- [ ] Default-only `loading` / skeleton checked; note CLS OK when prefs ≠ defaults

**Planned automated tests:** yes — unit (Tasks 1–4, 6–7) + e2e (Task 8). Suitable for `04a` TDD review.
