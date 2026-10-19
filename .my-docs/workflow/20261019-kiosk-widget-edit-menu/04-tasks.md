# Tasks: Kiosk widget edit menu (resize + same-topic sources)

**Design pick (recommended):** Option 1 — systemic overlay (registry cell + `kioskLayout.cells`).  
**Amend (design-backloop A1 B2):** Immediate Resize reflow + edit-mode drag reorder; order = `kioskWidgets` (P1).  
**Has API:** yes · **Has DB:** yes · **Has auth/PII/schema:** no  
**Verify commands** (from `00-run.md`): cwd `/Users/ptquang86/ws/my-apps` · `npm run build` · `npm test -- lib/kiosk/ components/kiosk/ lib/validators/user-preferences` · `npm run test:e2e -- e2e/kiosk-layout.spec.ts e2e/kiosk-edit-menu.spec.ts`  
**Automated tests:** planned (unit + e2e) — parent should re-run 04a after amend when Gate B path requires it.

## Task 1: Signal catalog + topic membership

**Description:**
Add `lib/kiosk/signal-catalog.ts` with draft ids/labels from Design (money.spend/income/net; loan.remaining/obligation/next_payment; baby.last_feed/next_sleep/last_diaper). Export topic enum, membership sets, helpers (`topicForSignal`, `assertSameTopic`, feature→topic), and **editable widget-id sets**: Source-enabled = `money.net_month`, `money.insights_chart`, `loans.summary`; Resize-only = remaining money/loans/baby registry ids from Design UI § (heatmap, stats grid, month board, payments, nursery, next care, funny time).

**Acceptance:**

- [ ] Catalog ids match Design draft table; money excludes bills/savings/investments.
- [ ] Helper rejects mixed-topic lists; accepts 1–3 same-topic ids.
- [ ] Exported Source-enabled / Resize-only sets match Design; weather/context/bills/savings/investments not in either.

**Tests (TDD — what turns red first):**

- [ ] Unit: each topic membership list length and ids.
- [ ] Unit: same-topic pass; cross-topic fail; empty / >3 fail.
- [ ] Unit: feature money/loans/baby → topic; context → none.
- [ ] Unit: Source-enabled and Resize-only id lists match Design lock.

**Files likely touched:** `lib/kiosk/signal-catalog.ts`, `signal-catalog.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Layout type + Zod cells + resolve pass-through

**Description:**
Extend `KioskLayout` with optional `cells` keyed by Design editable sets. **Source-enabled** override = `{ size, sources: 1–3 }` (same-topic + feature match). **Resize-only** override = `{ size }` only — `sources` present → **400**. Reject keys outside editable sets (weather, context, bills, savings, investments, unknown) → **400**. Update `resolveKioskLayout` pass-through + drop corrupt keys on read. Write semantics: omit `cells` → preserve; present → replace whole map; clear = omit id; widgets-only + baby-inject copy `cells`. No new DB column (ADR-005).

**Acceptance:**

- [ ] Zod accepts Source-enabled + Resize-only shapes; rejects sources on Resize-only; rejects non-editable keys → 400.
- [ ] Rejects cross-topic, sources≠feature topic, unknown signal/size, sources length ∉ 1..3 on Source-enabled.
- [ ] Write: omit preserves; present replaces; omit one id clears; widgets-only preserves `cells`.
- [ ] Resolve round-trips valid cells + sibling fields; may drop corrupt keys on read.
- [ ] Has DB: jsonb nest only; nest validated before persist.

**Tests (TDD — what turns red first):**

- [ ] Unit: Zod happy path `loans.summary` with sources; happy path heatmap `{ size: "L" }` only.
- [ ] Unit: Zod rejects `sources` on Resize-only key (e.g. heatmap / funny_time).
- [ ] Unit: Zod rejects cross-topic; loan signals under `money.net_month`; unknown signal.
- [ ] Unit: Zod rejects weather/context/bills/savings/investments/unknown keys → 400.
- [ ] Unit: Zod rejects empty cell override `{}` for a key (clear = omit key, not empty object).
- [ ] Unit: Zod rejects Source-enabled sources length outside 1..3 (missing / `[]` / four ids).
- [ ] Unit: clear override — sent `cells` without id removes that entry after replace.
- [ ] Unit: prefs apply — omit `cells` keeps prior; present replaces whole map.
- [ ] Unit: widgets-only rewrite copies existing `cells`.
- [ ] Unit: `resolveKioskLayout` keeps `cells` + `babyDefaultsInjected` + mode/columns/focus.
- [ ] Unit: `resolveKioskLayout` drops corrupt / non-editable `cells` keys; keeps valid siblings.
- [ ] Unit: missing `cells` → defaults (size M when helpers default).

**Files likely touched:** `lib/kiosk/kiosk-layout.ts`, `kiosk-layout.test.ts`, `lib/validators/user-preferences.ts`, `lib/user-preferences-service.ts`, `user-preferences` tests, `db/schema/user-preferences.ts` (types/comments only if needed)

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: Size token → grid span / min-height helpers (+ immediate reflow)

**Description:**
Pure helper mapping S/M/L/XL to CSS class names or span/min-height tokens under board `columns` + container-query-friendly classes. Default M. Document fullscreen ignores display but storage still holds size. **Amend:** CSS + apply path must update footprint **immediately** on Resize (optimistic `setLayout`); siblings reflow via CSS grid (`span min(2, --kiosk-cols)` + min-heights). No masonry.

**Acceptance:**

- [ ] Four tokens only; default M.
- [ ] S remains readable intent (no zero-height / hidden content classes).
- [ ] Design UI lock: labels S M L XL.
- [ ] Resize apply updates `data-kiosk-cell-size` + size class before PATCH settles; rollback on fail.
- [ ] When `--kiosk-cols` ≥ 2, L/XL span 2 and neighbors pack; when cols=1, min-height still changes immediately.

**Tests (TDD — what turns red first):**

- [ ] Unit: each token returns distinct footprint class/span.
- [ ] Unit: unknown/missing → M.
- [ ] Unit/component: Resize apply → layout state size changes synchronously (before fetch resolve).
- [ ] Unit: footprint helpers match Design span/min-height intent table.

**Files likely touched:** `lib/kiosk/cell-size.ts`, `cell-size.test.ts`, `app/globals.css` token classes, `cell-edit-timing` / dashboard apply path

**Scope:** S

**Dependencies:** none (can parallel Task 1–2)

---

## Task 4: Card compose — filter metrics by sources

**Description:**
Implement Design **Source compose map** only for Source-enabled ids: `money.net_month`, `money.insights_chart`, `loans.summary`. When override sources exist, show only those signals (1–3) per map. Untuned → today’s default. Resize-only cards ignore sources (never wired). Wire overrides from layout into dashboard cell props.

**Acceptance:**

- [ ] Tuned `loans.summary` can show Remaining + Obligation only (APR hidden when tuned).
- [ ] Tuned `money.net_month` / `money.insights_chart` follow Design compose map (chart band hidden without `money.spend`).
- [ ] Untuned Source-enabled cells unchanged vs today.
- [ ] Resize-only / weather / context never apply Source filters.
- [ ] Design UI lock: Source = signals, not whole-widget swap.

**Tests (TDD — what turns red first):**

- [ ] Unit: compose helpers for the three Source-enabled ids (fixtures per Design map).
- [ ] Unit: missing override → default composition matches current happy path.
- [ ] Unit: Resize-only id + stray sources in fixture → compose ignores / no Source path.

**Files likely touched:** `kiosk-net-card`, insights-chart card, `loans-insights-stats` / kiosk loans summary path, pure compose helpers under `lib/kiosk/`, dashboard props, matching tests

**Scope:** M

**Dependencies:** Task 1, Task 2

---

## Task 5: Board Edit/Done strip + cell MoreMenu (Resize | Source)

**Description:**
Client edit mode on `kiosk-dashboard`: board strip Edit / Done. Edit mode → top-right on **editable** cells (Source-enabled ∪ Resize-only). Menu: **Resize** on all editable; **Source** only on Source-enabled (hidden/absent on Resize-only). Apply local state; **PATCH on each Resize/Source apply** (full `kioskLayout` merge); Done exits without extra PATCH if already saved. Quiet chrome after Done. Skeleton parity. **Amend:** leave room for Task 9 drag handles (top-left) without overlapping MoreMenu hit areas.

**Acceptance:**

- [ ] Gate A #1/#2 + Design: board-strip Edit/Done; menus on editable sets only; Source action **only** on Source-enabled ids.
- [ ] Resize-only cells (e.g. heatmap, funny time) show Resize, never Source.
- [ ] Topic early on Source picker; cross-topic blocked; quiet after Done.
- [ ] Hit targets ≥44; skeleton mirrors edit chrome / footprint.
- [ ] Save uses authenticated PATCH on each apply.

**Tests (TDD — what turns red first):**

- [ ] Unit/component: editMode toggles strip labels Edit ↔ Done.
- [ ] Unit/component: weather cell has no menu; Resize-only cell has no Source action.
- [ ] Unit/component: Source-enabled cell shows Source; picker blocks cross-topic.
- [ ] Unit: save payload — Source-enabled includes sources; Resize-only size-only; preserves mode/columns/focus.
- [ ] Unit/component: Resize or Source apply → prefs PATCH spy once; Done → no further PATCH.

**Files likely touched:** `components/kiosk/kiosk-dashboard.tsx`, new edit-menu component(s), `kiosk-dashboard-skeleton.tsx`, `kiosk-dashboard*.test.ts`, prefs save helper reuse from settings

**Scope:** M

**Dependencies:** Task 2, Task 3, Task 4

---

## Task 6: Edge rules + Settings coexistence

**Description:**
Implement Grill edges: keep overrides when widget off; re-enable restores size/sources; fullscreen ignores size display but stores size; Settings on/off + layout still work **without wiping `cells`**. Settings layout PATCH (omit `cells`) and widgets-only saves must preserve overrides; baby-inject write-back copies `cells`. Docs touch: DESIGN_GUIDE / glossary note bounded edit menu (non-blocking polish if time).

**Acceptance:**

- [ ] Off widget: cell hidden; `cells` entry retained after PATCH round-trip.
- [ ] Fullscreen: no span change visible; size still in prefs.
- [ ] Settings layout save (omit `cells`) keeps stored overrides.
- [ ] Widgets-only save / baby-inject rewrite copies existing `cells` (no wipe).
- [ ] Settings layout + toggles still pass existing tests.

**Tests (TDD — what turns red first):**

- [ ] Unit: resolve/render ignores size in fullscreen mode.
- [ ] Unit: disabled widget + stored override still present in layout object.
- [ ] Unit: Settings layout PATCH omit `cells` → overrides unchanged.
- [ ] Unit: widgets-only prefs write preserves `cells`.
- [ ] Unit: baby-inject write-back preserves existing `cells` (not wiped).
- [ ] Existing Settings / layout unit tests stay green.

**Files likely touched:** `kiosk-dashboard.tsx`, `kiosk-layout.ts`, `user-preferences-service.ts`, `baby-defaults-inject.ts`, tests; optional `docs/DESIGN_GUIDE.md` / `GLOSSARY.md` clarify

**Scope:** S

**Dependencies:** Task 5

---

## Task 7: E2E — Edit → Resize/Source → reload

**Description:**
Extend `e2e/kiosk-layout.spec.ts` or add sibling `e2e/kiosk-edit-menu.spec.ts`: Edit → Resize + Source on a **Source-enabled** cell (e.g. `loans.summary` or `money.net_month`) → Done → reload keeps both; Resize-only cell has no Source; weather has no menu; cross-topic blocked. If sibling spec lands, update `00-run` Verify e2e path.

**Acceptance:**

- [ ] Source-enabled path: Edit → Resize + Source → Done → reload keeps both.
- [ ] Resize-only cell: Resize ok; no Source control.
- [ ] Weather cell has no edit menu.
- [ ] Verify path noted for `00-run` when sibling file chosen.
- [ ] **Amend:** after Resize, `data-kiosk-cell-size` updates **before** Done (immediate).

**Tests (TDD — what turns red first):**

- [ ] E2E: resize + source persist across reload (Source-enabled).
- [ ] E2E: Done returns quiet board.
- [ ] E2E: Resize L → wrap `data-kiosk-cell-size="L"` without requiring Done first.

**Files likely touched:** `e2e/kiosk-layout.spec.ts` and/or `e2e/kiosk-edit-menu.spec.ts`

**Scope:** M

**Dependencies:** Task 5, Task 6

---

## Task 8: Preserve `kioskWidgets` order (P1)

**Description:**
Change `normalizeKioskWidgets` to **preserve input order** (filter unknown, dedupe first-seen). Stop forcing registry order. Settings toggle-on **appends** new ids. Board paints `enabledWidgets` as returned from prefs. Baby-defaults inject appends missing baby ids at end (fixed baby order) without re-sorting the whole list. Update unit tests that asserted registry order.

**Acceptance:**

- [ ] `normalizeKioskWidgets(["loans.summary","money.net_month"])` keeps that order.
- [ ] Unknown ids dropped; duplicates collapse to first.
- [ ] Default resolve still uses `DEFAULT_KIOSK_WIDGETS` order when stored null.
- [ ] Existing Settings on/off still works; new enable appends at end.
- [ ] Baby-inject does not re-sort existing widgets; only appends missing defaults.

**Tests (TDD — what turns red first):**

- [ ] Unit: preserves caller order (not registry sort).
- [ ] Unit: dedupe + drop unknown.
- [ ] Unit: null stored → defaults order unchanged.
- [ ] Unit: prefs PATCH with reordered `kioskWidgets` round-trips order.
- [ ] Unit: baby-inject with custom prior order keeps prior relative order + appends missing baby ids.

**Files likely touched:** `lib/kiosk/widget-registry.ts`, `widget-registry.test.ts`, `baby-defaults-inject.ts` (+ tests), `user-preferences-service` / validators tests if they assume registry sort

**Scope:** S

**Dependencies:** none (can parallel; required before Task 9)
---

## Task 9: Edit-mode drag reorder (B2)

**Description:**
In edit mode + grid mode, show a drag handle on **every enabled** board cell. Pointer drag to reorder; keyboard path (focus handle → ArrowUp/ArrowDown or move commands). On drop/commit: optimistic reorder → PATCH `kioskWidgets` (permutation only). Fullscreen: no handles. Handle hit area must not overlap MoreMenu (`fx-hit-40`). Skeleton parity for handles in edit chrome. Prefer light native HTML DnD or existing repo pattern — **no** heavy new DnD library unless already in package.json.

**Acceptance:**

- [ ] Handles only when Edit + grid; all enabled cells.
- [ ] Drop / keyboard move → board order updates immediately; PATCH `kioskWidgets`; rollback on fail.
- [ ] Done does not PATCH order.
- [ ] MoreMenu and handle do not share overlapping extended hit areas.
- [ ] DESIGN_GUIDE note: bounded edit-mode exception for drag rearrange.

**Tests (TDD — what turns red first):**

- [ ] Unit: `reorderWidgets(list, from, to)` permutation helper.
- [ ] Unit/session: reorder apply → PATCH payload is new `kioskWidgets` order; Done → no PATCH.
- [ ] Unit/component: editMode false → no handles; fullscreen → no handles.
- [ ] E2E: Edit → drag (or keyboard) reorder two cells → reload keeps order.

**Files likely touched:** `components/kiosk/kiosk-dashboard.tsx`, new handle/reorder helper under `lib/kiosk/` or `components/kiosk/`, `cell-edit-timing` / edit session, skeleton, `e2e/kiosk-edit-menu.spec.ts`, optional `docs/DESIGN_GUIDE.md` / `GLOSSARY.md`

**Scope:** L

**Dependencies:** Task 5, Task 8

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused unit tests pass (`npm test -- lib/kiosk/ components/kiosk/ lib/validators/user-preferences`)
- [ ] Slice works: prefs Zod → resolve → one cell menu save → reload
- [ ] UI locks still match Design / Gate A #1/#2 (+ amend reflow + drag)
- [ ] No new prefs column; ADR-005 nest only; order in `kiosk_widgets` (P1)
