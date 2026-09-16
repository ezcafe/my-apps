# Idea: Baby Insights Activity log matches Money Transactions controls

## Problem

On **Baby Insights** (`/baby/insights`), the **Activity log** already uses a shared `Table` / mobile-card browse shell (from the prior `baby-insights-table-style` pass). That pass treated Money-like **checkbox, row selection, edit buttons, and bulk action chrome as non-goals** — view-only browse.

Caregivers who also use **Money → Transactions** still see a gap: Money rows have leading checkboxes, selected/hover feel, per-row **Edit**, and a bottom selection bar (Edit / Delete / Clear). Activity log today is closer to “click the whole row to open an edit modal,” without that ledger control set. The look is partly aligned; the **interaction pattern is not**.

There may already be partial Activity log merge helpers and an edit modal in the tree — treat them as draft until this workflow proves the Money-parity UX end-to-end.

## User / audience

- **Primary:** Parents / caregivers who open Baby Insights Activity log to **find a past care or growth entry and fix or remove it**.
- **Secondary:** Partners who already know Money Transactions and expect the same select → act pattern.
- **Not this pass:** Clinics, multi-baby households, Money ledger changes, or new capture flows.

## Outcome

What “done” looks like:

1. Baby Insights **Activity log** matches Money Transactions **table interaction patterns**: leading checkbox (header select-all on the visible page/window), selected + hover row chrome, per-row **Edit** (or equivalent Money-style row action), and a selection toolbar when one or more rows are selected (Edit / Delete / Clear — Baby-labeled, same placement and behavior shape as Money).
2. Desktop table and mobile cards both carry those controls with the same selected feel Money uses.
3. Opening Edit (row action or selection bar when one row is selected) uses a clear edit surface for that care or growth row; saving/deleting refreshes Insights data the caregiver already relies on.
4. Skeleton / loading chrome stays in parity with the new controls (zero CLS). Light + dark remain correct.
5. Prior Activity log jobs (expand panel, merged care+growth newest-first, show-more / load-more) keep working.

## Metric

**Primary signal:** A caregiver who knows Money Transactions can open Baby Insights Activity log and **select rows with checkboxes, see selected chrome, and use Edit / Delete from the same control places** without relearning a different table UX.

**Supporting check:** Focused UI/e2e coverage that Activity log exposes checkbox + row Edit + selection actions; unit coverage for any pure selection/edit routing helpers; skeleton mirrors the selectable table.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes — one primary surface (Activity log table + selection chrome); one reference image set against Money Transactions is enough
- **Copy/token-only?** no — this is interaction parity (controls + selected feel), not a token/copy-only tweak

## 80/20 UI (day-to-day)

### Main user goals

- Scan today’s (or filtered) care + growth events in one Activity log.
- Correct a wrong entry (time, type detail, growth value).
- Remove a mistaken entry.
- Select one or a few rows and act without hunting for a different edit path.

### Vital few (high-impact ~20%)

- Money-like **row selection chrome** (checkbox + selected/hover feel) on Activity log.
- **Edit** one row the same way Money does (row Edit + selection-bar Edit when one is selected).
- **Delete** selected row(s) with clear confirm / busy feedback (Money-shaped).
- Keep browse + show-more / load-more working so selection applies to what is on screen.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Activity log rows (event + when) with Money-like table/card chrome once the panel is open.
- **Important info / action #2 (always visible):** Per-row select checkbox + per-row **Edit** (desktop); same on mobile cards.
- **Core action placement:** Checkbox leading; Edit in the row actions column / card action; selection bar appears when `selectedCount > 0` (fixed bottom, Money pattern).
- **Secondary actions:** Bulk multi-edit form details (if any), rarely used field knobs, and advanced filters stay in edit modal / existing Insights filters — not new chrome on every row:
  - Full field editing inside the edit modal (not inline cells).
  - Multi-select edit of heterogeneous care+growth batches (if supported) stays behind selection-bar Edit, not always-visible multi-forms.
  - Clear selection via selection-bar Clear.
  - Expand/collapse Activity log panel remains the gate to the table (dashboard already uses this).

### Top user journey to optimize

Open Insights → open Activity log → find row → (optional) select → Edit or Delete → confirm/save → list and Insights data refresh.

### Sensible defaults

- No rows selected on open / after clear.
- Selection applies to the **visible Activity log window** (same “page” idea as Money’s current page), not a silent all-history select.
- Single-row selection-bar Edit opens the same edit surface as the row Edit button.
- Empty Activity log stays a quiet empty state (not an error); no fake checkboxes on empty.

### Biggest usability risks to fix first

- Checkbox vs row-click conflict (Money separates select from Edit; Baby today uses whole-row click — must not fight the new controls).
- Mixed care + growth selection: unclear what multi-Edit or multi-Delete means.
- Missing selected/hover parity on mobile cards.
- Skeleton missing checkbox / actions column → CLS.
- Accidental bulk delete without clear confirm / busy disable.

## Non-goals

What we will **not** build in this pass:

- Changing Money Transactions itself (it is the reference, not the patient).
- Restyling other Baby lists beyond Activity log (separate care timeline / growth-only lists if they still exist as distinct surfaces).
- New capture flows, Telegram, or new event kinds.
- Money-style account / category / amount columns, multi-column sort, or analytics exclusion tags on Baby rows.
- A second design language outside shared `Table` / `Checkbox` / design-system patterns.
- Hardcoded breakpoints.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Scope is **Activity log only** (not redoing every Baby list) | Yes for a small pass | User wants all Baby tables to get checkboxes | Broaden to shared Baby ledger shell; re-size tasks |
| “Same as Money” means **controls + chrome + interaction**, not cloning Money columns | Yes | User wants Date / Category / Amount layout | Product reshape of Baby rows; larger UI concept |
| Existing / draft edit modal + update/delete mutations are enough for single-row Edit | Likely | Edit APIs incomplete for some kinds | Block on API gaps or cut those row types from edit |
| Multi-select **Delete** is in scope like Money; multi-select **Edit** follows Money (1 → single edit, many → bulk edit or limited) | Needs design pick | Bulk edit across care+growth is unsafe/hard | Selection-bar Edit only when 1 selected; multi = Delete/Clear only |
| Prior table-style chrome stays; this pass **adds** selection/actions on top | Yes | Current Activity log chrome regressed / unfinished | Fix chrome first, then controls |
| Draft Activity log / edit-modal code in tree is unfinished until proven | Yes | Code already ships full Money parity | Shrink to polish/tests only |

## What we should not build

- Inline cell editing on the table.
- A Baby-only checkbox component outside `components/ui/checkbox`.
- Silent “select all history” across unloaded pages.
- Fake bulk edit that only works for one event type while claiming Money parity.

## Success criteria

- [ ] Activity log desktop table shows leading checkbox column (incl. header select for visible rows), selected/hover row feel, and per-row Edit action matching Money Transactions patterns.
- [ ] Activity log mobile cards show checkbox + selected feel + Edit affordance consistent with Money mobile cards.
- [ ] With selection > 0, a bottom selection bar offers Edit / Delete / Clear (Baby copy); behavior matches Money’s select → act shape for the decisions locked in design.
- [ ] Edit opens a working edit surface for the selected/targeted care or growth row; save/delete updates data and clears or refreshes selection sanely.
- [ ] Whole-row click no longer fights checkbox/Edit (Money-like separation).
- [ ] Skeleton parity for new columns/controls; light + dark OK; show-more / load-more still work.
- [ ] Money Transactions unchanged; non-Activity-log Baby surfaces out of scope unless needed for shared primitives.

## Open questions

1. **Multi-select Edit:** When several Activity log rows are selected, should Edit match Money’s bulk-edit modal, only allow Edit when exactly one row is selected, or disallow mixed care+growth multi-edit?
2. **Multi-select Delete:** Confirm bulk delete of mixed care + growth rows is in scope (with confirm), same as Money’s multi-delete shape.
3. **Row click:** Confirm we drop whole-row-open-edit in favor of explicit Edit / selection-bar Edit (Money pattern).
4. **Draft code:** How much of the in-tree Activity log + edit-modal work should be treated as keep-and-finish vs replace during Build? (Default: reuse if it meets parity; do not assume finished.)
5. **Header select-all:** Confirm select-all means **visible window only** (Money page behavior), not every loaded/unloaded Activity log row.
