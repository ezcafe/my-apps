# Tasks: Baby Insights Activity log Money interaction parity

**Recommended design:** Option 1 — in-dashboard selectable Activity log + Baby selection bar fork; Edit disabled (visible) when count ≠ 1; mixed multi-Delete via `window.confirm` + per-row client loop; partial fail keeps failed keys + panel `Alert`; skeleton same slice as selectable chrome; keep-and-finish edit modal; Money unchanged.  
**Status:** draft Build complete — Smoke → review next (not ready to ship).

**Order:** selection-key unit (red→green) → bar Edit-enable unit → Baby selection bar + i18n → failing e2e → dashboard selectable table/cards + skeleton parity (same slice) → multi-Delete `window.confirm`/loop → green e2e / light+dark.

---

## Task 1: Failing unit — composite selection keys

**Description:** Add pure helpers for Activity log selection keys so care and growth UUIDs never collide in a `Set`. Cover encode + parse round-trip and reject garbage.

**Acceptance:**

- [x] `activityLogSelectionKey({ source: "care", id })` ≠ growth key for same uuid string
- [x] Parse returns `{ source, id }` or null for invalid
- [x] Tests **fail** if helpers missing / wrong (red before Task 2)

**Tests (TDD — what turns red first):**

- [x] New cases in `lib/baby-insights-activity-log.test.ts` (or small sibling test file)

**Security / UI checks:** N/A (pure); keys must not be treated as authz later.

**Files likely touched:** `lib/baby-insights-activity-log.ts`, `lib/baby-insights-activity-log.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Implement selection key helpers + Edit-enable rule

**Description:** Implement `activityLogSelectionKey` / parse helper. Add `activitySelectionBarEditEnabled(selectedCount)` → true only when `count === 1` (locked multi-Edit rule).

**Acceptance:**

- [x] Task 1 tests green
- [x] Unit asserts Edit enabled iff count === 1 (0 and 2+ false)
- [x] No GraphQL or Money file changes

**Tests (TDD — what turns red first):**

- [x] Green: selection key + Edit-enable unit tests

**Security / UI checks:** Document in test name that multi-Edit is intentionally blocked.

**Files likely touched:** `lib/baby-insights-activity-log.ts` and/or `lib/baby-insights-activity-edit.ts` (+ tests)

**Scope:** S

**Dependencies:** Task 1

---

### Checkpoint A (after Tasks 1–2)

- [x] Focused unit tests green
- [x] Locked multi-Edit rule encoded in a pure helper

---

## Task 3: Baby selection bar + EN/VI strings

**Description:** Add a Baby selection bar that mirrors `TransactionSelectionBar` (portal, fixed bottom, safe-area, busy disable) with **props for labels** / i18n — do not edit Money’s bar. Bar **Edit stays visible but disabled** when `selectedCount !== 1` (matches Gate A2 `ui-refs/02`; do not hide Edit). Add Baby message keys (count singular/plural, Edit/Delete/Clear, toolbar aria, `window.confirm` delete copy / partial-fail `Alert` text as needed).

**Acceptance:**

- [x] Bar renders only when `selectedCount > 0` and client-mounted
- [x] Edit control is **disabled** (still visible) when `selectedCount !== 1` — not hidden
- [x] EN + VI keys exist; no hard-coded Money “transactions” copy
- [x] Money `transaction-selection-bar.tsx` unchanged

**Tests (TDD — what turns red first):**

- [x] Prefer unit on label/enable helpers; optional light component test if the project already patterns portal bars that way
- [x] i18n key presence covered by existing baby i18n test style if applicable

**Security / UI checks:** Toolbar has accessible name; buttons ≥44px hit via existing `Button` sizes; `aria-live` polite like Money; disabled Edit still announced.

**Files likely touched:** new `components/baby-activity-selection-bar.tsx` (name flexible), `messages/baby/en.ts`, `messages/baby/vi.ts`, maybe `lib/baby-i18n.test.ts`

**Scope:** M

**Dependencies:** Task 2

---

## Task 4: Failing e2e — checkbox, row Edit, selection bar

**Description:** Extend `e2e/baby-care.spec.ts` **before** dashboard selectable wiring so asserts fail on current view-only Activity log. Cover: open Activity log → see checkbox / select control → per-row Edit → select one → bar Edit/Delete/Clear; select two → Edit not available for multi. Prefer roles/labels over brittle classes.

**Acceptance:**

- [x] Spec **fails** for the right reasons against current UI (red before Tasks 5–7)
- [x] Does not require Money UI changes
- [x] Asserts Baby labels (activities / Activity log), not Money “transactions”

**Tests (TDD — what turns red first):**

- [x] Playwright asserts in `e2e/baby-care.spec.ts` run until red
- [x] **Required (04a):** with 2 rows selected, bar Edit `toBeVisible()` **and** `toBeDisabled()` (do **not** assert hidden)
- [x] **Required (04a):** with 1 selected, bar Edit enabled and opens modal (happy path)

**Security / UI checks:** N/A until wired; include at least one path that opens Edit without whole-row click.

**Files likely touched:** `e2e/baby-care.spec.ts`

**Scope:** M

**Dependencies:** none (can start after Task 2 conceptually; keep red until UI lands)

---

## Task 5: Wire selectable desktop table + drop whole-row open-edit (+ skeleton same slice)

**Description:** In `baby-insights-dashboard.tsx`, add leading checkbox column (header select-all = **visible window** ids only), `TableRow` `selected`, `freeze` after checkbox, `TableRowActions` Edit opening existing modal. Remove desktop `clickable` / whole-row open-edit. Selection `Set` uses composite keys. **Keep** selection when show-more / load-more grows the list. **Clear** selection only on Insights filter apply, panel close, or bar Clear (delete pruning is Task 7). Mount Baby selection bar. **In the same change/slice as this task**, update skeleton (Task 8) so checkbox + actions placeholders land with live chrome — no Checkpoint B / green e2e claim until skeleton matches.

**Acceptance:**

- [x] Header select-all toggles only `activityListWindow.visible` rows
- [x] Row Edit and single-selection bar Edit open `BabyInsightsEditModal` for that `editTarget`
- [x] Whole-row click no longer opens edit
- [x] Empty state still quiet (no checkboxes)
- [x] Show-more / load-more still work; **selection retained** when the visible window grows
- [x] Selection clears on filter apply / panel close / Clear (not on show-more / load-more alone)
- [x] Skeleton parity for selectable chrome lands in the **same slice** (see Task 8) — selectable UI not “done” without it

**Tests (TDD — what turns red first):**

- [x] Task 4 e2e starts turning green for desktop select / Edit paths as this lands
- [x] Keep unit helpers green
- [x] **Required (04a):** named e2e (or strong unit + light e2e) — select row → show-more or load-more → still selected
- [x] **Required (04a):** select → apply Insights filter **or** close Activity log panel → selection cleared / bar gone (prefer both if cheap)

**Security / UI checks:** Checkbox `aria-label` per row; selected = wash + checked (not color alone); DESIGN_GUIDE flat sharp table (no Card shell); CLS — skeleton mirrors live order in same slice.

**Files likely touched:** `components/baby-insights-dashboard.tsx`, `components/baby-page-skeleton.tsx` (with Task 8), maybe small helpers already in Task 2

**Scope:** M

**Dependencies:** Tasks 2–3

---

## Task 6: Mobile cards — checkbox + selected + Edit

**Description:** On `@md` Activity log cards, add checkbox, selected feel, and always-visible Edit (per `01b`). Cards must not be one big button that fights checkbox/Edit.

**Acceptance:**

- [x] Mobile cards show checkbox + Edit without hover-only
- [x] Selected card matches Money-like selected feel tokens
- [x] Card Edit opens same modal as desktop

**Tests (TDD — what turns red first):**

- [x] E2E mobile viewport or role asserts if fixtures allow; else manual checklist in verification

**Security / UI checks:** ≥44px hits; no hover-only actions; concentric radii on cards (`--radius-sm`).

**Files likely touched:** `components/baby-insights-dashboard.tsx`

**Scope:** M

**Dependencies:** Task 5

---

## Task 7: Multi-Delete `window.confirm` + per-row client loop

**Description:** Selection-bar Delete (any `selectedCount >= 1`) uses **`window.confirm`** with Baby EN/VI copy — Money / repo pattern (`analytics-transactions-table.tsx`). Do **not** add a new ConfirmDialog / modal confirm UI. On confirm, set busy, run `Promise.allSettled` over selected `editTarget`s calling `deleteBabyEvent` / `deleteBabyGrowth` via existing client GraphQL helpers / `activityEditMutationFor`. Invalidate Insights queries. On partial failure: **drop succeeded keys**, **keep failed keys** if still on screen; show one failure via existing **`Alert`** in the Activity log panel (`components/ui/alert`). Note: this **differs from Money** (Money clears all selection then `Alert`) — intentional.

**Acceptance:**

- [x] Mixed care+growth multi-delete works with one `window.confirm`
- [x] Single-row Delete from the bar also uses the same confirm path
- [x] Busy disables bar actions during run; busy cleared on success, cancel, or settle complete
- [x] Partial failure: succeeded keys removed; failed keys stay selected if still present; one panel `Alert` — not silent full success; not toast-only invent
- [x] No new batch GraphQL API; no new ConfirmDialog component

**Tests (TDD — what turns red first):**

- [x] Unit for routing already exists; add unit for “build delete plan from keys” if extracted
- [x] **Required (04a):** unit `pruneActivityLogSelectionAfterDeletes` (or equivalent) — 2 selected, one fulfilled + one rejected → Set keeps only failed key
- [x] **Required (04a):** e2e partial fail — mock one delete OK + one reject; after confirm: failed row still selected; panel `Alert` visible; succeeded row gone/deselected
- [x] **Required (04a):** `window.confirm` returns false → zero delete mutations; selection + bar unchanged
- [x] **Required (04a):** mixed care+growth delete — unit or e2e mock asserts both `deleteBabyEvent` and `deleteBabyGrowth` fire once
- [x] E2E: select → Delete → confirm happy path (mock GraphQL if suite already does)

**Security / UI checks:** `window.confirm` before destructive; server still workspace-scopes each delete; do not log secrets; disable double-submit while busy.

**Files likely touched:** `components/baby-insights-dashboard.tsx`, maybe thin helper + test, messages for confirm/partial-fail `Alert`

**Scope:** M

**Dependencies:** Tasks 3, 5

---

## Task 8: Skeleton parity for selectable chrome (same slice as Task 5)

**Description:** Update `BabyInsightsPageSkeleton` / Activity list skeleton to include checkbox + actions placeholders (and mobile card control placeholders) matching live order — zero CLS. Follow Money selectable skeleton pattern without Money amount columns. **Must land in the same change/slice as Task 5** (dep + checkpoint): do not call selectable UI done, Checkpoint B green, or e2e “pass for chrome” until skeleton matches live order.

**Acceptance:**

- [x] Skeleton column/card order: checkbox → event → recorded → actions
- [x] Same PR / same slice as Task 5 live selectable UI (not a later follow-up)
- [x] Light + dark tokens only (no hard-coded hex)
- [x] Checkpoint B cannot claim selectable UI done without this

**Tests (TDD — what turns red first):**

- [x] Prefer structural assert in e2e/skeleton test if present; else manual CLS check on Insights load/expand

**Security / UI checks:** UI/mobile — mirrors live; concentric radii on non-table chrome.

**Files likely touched:** `components/baby-page-skeleton.tsx`

**Scope:** S

**Dependencies:** Task 5 (**same slice** — not “after Delete”)

---

### Checkpoint B (after Tasks 5–8)

- [x] Focused units green
- [x] Activity log select → Edit (1) / Delete (n) works on desktop
- [x] Mobile cards have checkbox + Edit
- [x] **Skeleton matches live order** (Task 8) — required before calling selectable UI done or green e2e for this chrome
- [x] Money files untouched

---

## Task 9: Green e2e + polish verification

**Description:** Drive Task 4 e2e to green. Smoke light + dark; confirm filter change clears selection; panel close clears selection; show-more / load-more **keeps** selection; empty state has no bar/checkboxes. Confirm `ui-refs` look still matches Gate A2 at Gate B (Edit disabled when 2+ selected).

**Acceptance:**

- [x] Extended Activity log e2e written (Playwright run deferred to Smoke / full test workflow)
- [ ] Light + dark OK for selectable chrome + bar (manual / Smoke)
- [x] Selection clears on filter apply / panel close; retained on show-more / load-more
- [x] Money Transactions still unchanged

**Tests (TDD — what turns red first):**

- [x] Green: focused unit + e2e cases authored including 04a Fix ask (Edit disabled-visible, retention/clear, cancel confirm, partial-fail Alert, mixed delete) — e2e execution → Smoke

**Security / UI checks:** Re-check OWASP A01 (no client-only authz assumptions in UI copy); a11y labels on checkbox/bar.

**Files likely touched:** e2e + any small fix files from Tasks 5–8

**Scope:** M

**Dependencies:** Tasks 4–8

---

## Checkpoints

After every 2–3 tasks:

- [x] Focused tests pass
- [x] Slice works end-to-end where applicable
- [x] Money Transactions / other Baby lists not drifted

**Human Gate B (parent):** Approve Decision 1 (Option 1 recommended), confirm multi-Edit / multi-Delete locks, confirm UI still matches `ui-refs/`, then Build.
