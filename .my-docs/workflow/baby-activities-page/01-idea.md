# Idea: Dedicated Baby Activities page (Spending-style)

## Problem

Today the **Activity log** lives on **Baby Insights** (`/baby/insights`) as a deferred / collapsed panel under charts and “More insights.” Caregivers who mainly want to **browse, fix, or delete past care and growth entries** must open Insights first, then expand the log. That mixes two jobs: **review patterns** (charts / KPIs) and **manage the ledger** (row list + edit / delete).

A prior run (`baby-insights-activity-log-money-parity`) already pushed the Activity log **table controls** toward Money Transactions parity (checkboxes, selection bar, row Edit) while it still lived on Insights. That does not give the log its own page or the full **Money Spending page layout** (period → filters → content ledger as the primary surface).

## User / audience

- **Primary:** Parents / caregivers who open Baby Care to find and fix past feed, sleep, diaper, or measurement rows.
- **Secondary:** Partners who already use **Money → Spending** and expect a similar “filter + ledger” page shape.
- **Not this pass:** Clinics, multi-baby households, new capture flows, or Money product changes.

## Outcome

What “done” looks like:

1. A new **Baby Activities** page exists in Baby Care (route `/baby/activities` + section nav label **Activities**, next to Insights under review), styled like the **Money Spending** page: period / filter chrome first, then the activity ledger as the main surface (not buried under Insights charts).
2. The **Activity log** moves off Insights — Insights no longer hosts that panel; Insights stays focused on charts / KPIs / “More insights.”
3. After the move, Insights shows a **short link or one-line cue** to **Activities** so caregivers who still open Insights for the old log are not left thinking entries vanished (do **not** ship silent removal only).
4. Existing Activity log jobs stay: merged care + growth newest-first, filters, show-more / load-more, select → Edit / Delete, edit modal, light + dark, skeleton parity.
5. Caregivers can reach Activities from Baby section nav without opening Insights first.

## Metric

**Primary signal:** A caregiver can open **Baby → Activities**, see a Spending-like filter + ledger page, and complete find → edit / delete without expanding anything on Insights.

**Supporting check:** Insights no longer shows an Activity log panel; focused UI/e2e covers the new page path and Spending-style chrome order.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes — one primary surface (Activities page = period/filters + ledger); one reference image set against Money Spending is enough
- **Copy/token-only?** no — new page + nav + move off Insights + Spending-style layout (not a copy/token tweak)

## 80/20 UI (day-to-day)

### Main user goals

- Open a dedicated place to scan past care + growth events.
- Filter by date / care type (and growth where relevant) without fighting Insights charts.
- Correct a wrong entry or remove a mistaken one.
- Leave Insights for pattern review only.

### Vital few (high-impact ~20%)

- New **Activities** page with **Money Spending–style** page stack (period → filters → ledger).
- **Move** Activity log off Insights (no duplicate ledger on Insights).
- Keep Money-like **row selection + Edit / Delete** behavior already earned on the log.
- Clear Baby section **nav** entry so Activities is one tap away.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Period / date range (and Apply when draft differs) — same “time scope first” idea as Spending.
- **Important info / action #2 (always visible):** Activity ledger rows (event + when) with select + Edit once the page is open — not behind a collapsed panel.
- **Core action placement:** Filters above the list; checkbox leading; Edit in row / selection bar; selection bar when `selectedCount > 0`.
- **Secondary actions:** menus / overflow / expand / modal — list what is deferred:
  - Full field editing inside the existing edit modal (not inline cells).
  - Rare advanced filter knobs stay in filter UI / overflow, not new always-on chrome.
  - Insights charts / “More insights” stay on Insights only.
  - Capture flows stay on Home / Log feed / nap / diaper / measure.

### Top user journey to optimize

Open Baby → Activities → set / keep default range → scan list → select or row Edit → save / delete → list refreshes.

### Sensible defaults

- Default date range = current Insights Activity log default (**last 7 days**). Aligning to Money Spending’s default period is **out of scope** for this pass.
- No rows selected on open / after clear.
- Empty list is quiet (muted copy), not an error; no fake selection chrome when empty.
- Insights default view stays charts-first with no Activity log section, plus the short Activities cue (see Outcome).

### Biggest usability risks to fix first

- Caregivers still look for Activity log on Insights and think data is gone.
- New page does not feel like Spending (wrong order: charts or buried filters vs period → filters → table).
- Nav label / placement unclear so Activities is hard to find.
- Broken deep links or old e2e / bookmarks that still expect the Insights Activity log panel.

## Non-goals

- Redesigning Insights charts, KPIs, or “More insights.”
- New capture / quick-care flows or Telegram logging changes.
- Changing Money Spending itself.
- Multi-baby, sharing, clinic exports, or new event types.
- Rebuilding selection/edit from scratch if current Activity log helpers already work — prefer move + page chrome parity.
- Spending-like **summary stats / trend strip** above the Activities table — this pass is **period → filters → ledger only**.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Caregivers want a **separate** Activities page, not only a taller Insights log | Yes for this ask | Gate A day-to-day read; confirm nav + move | Scope shrinks to Insights-only layout polish |
| “Same styles as Money Spending” means **page stack** (period → filters → ledger), not only table row chrome | Yes for visual parity | Compare `/money` vs proposed Activities in UI concept | If table-only, lean toward prior parity run and skip full page mimic |
| Moving the log off Insights is acceptable (no dual copy on Insights) | Yes for this ask | Confirm in Gate A | Keep a short link from Insights → Activities instead of full panel |
| Existing Activity log behavior (filters, selection, edit/delete) can be reused on the new page | Preferred | Skim current dashboard + helpers in Analyze | Larger rebuild; raise risk in design |

## What we should not build

- A second Activity log still embedded on Insights (a short Insights → Activities cue is required instead of silent removal).
- New analytics charts or a Spending-like summary stats / trend strip on Activities this pass.
- Inline spreadsheet editing of every field.
- Money feature or API changes.

## Success criteria

- [ ] New Baby **Activities** route (`/baby/activities`) + section nav label **Activities** (next to Insights under review) opens a Spending-style page (period / filters → ledger).
- [ ] Activity log UI and jobs live on Activities; Insights no longer hosts the Activity log panel.
- [ ] Insights shows a short link or one-line cue to Activities after the move (not silent removal only).
- [ ] Caregiver can filter, select, edit, and delete care/growth rows on Activities with light + dark + skeleton parity.
- [ ] Default range on Activities is last 7 days (Insights Activity log default); no summary stats strip this pass.
- [ ] Focused tests cover the new page path and confirm Insights no longer exposes the old Activity log panel.

## Open questions

- Old URLs: any redirect needed beyond existing `/baby/timeline` → Insights redirects?
- Cue copy / placement on Insights (link vs one-line banner) — exact wording left to UI concept; presence is required.

### Decided (Gate A Round 1 Fix ask)

- **Route / nav:** `/baby/activities`, label **Activities**, placed next to Insights under the review group.
- **Default date range:** last 7 days (match current Insights Activity log). Spending-period parity deferred.
- **Page stack this pass:** period → filters → ledger only — **no** summary stats / trend strip.
- **Post-move findability:** Insights must show a short link or one-line cue to Activities — do not ship silent removal only.
