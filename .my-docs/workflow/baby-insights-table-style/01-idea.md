# Idea: Baby Insights lists match Money Transactions table + default today

## Problem

On **Baby Insights** (`/baby/insights`), care timeline and growth history still render as plain `<ul>` divide-y lists. Money’s **Transactions** ledger uses the shared `Table` chrome (hairline border shell, header row, cell padding, hover/selected row feel, and on small screens card rows). Caregivers who use both apps see two different “browse a list of events” looks.

Separately, Baby Insights still opens on **this calendar month** (same default as Money Insights). For day-to-day baby review, caregivers usually care about **today** first; a full-month window makes the timeline long and noisy before they narrow the filter.

## User / audience

- **Primary:** Parents / caregivers who open Baby Insights to check **what happened today** (feeds, sleep, diapers) and scan recent growth rows.
- **Secondary:** Partners who already know Money’s Transactions table and expect the same browse chrome in Baby.
- **Not this pass:** Clinics, multi-baby households, new analytics products, or changing Money’s own default range.

## Outcome

What “done” looks like:

1. Baby Insights **event lists** (care timeline **and** growth history) **look and behave like** Money’s Transactions table style: flat section + shared table/card chrome from the design system — not a Card-wrapped custom list, not a leftover divide-y `<ul>`.
2. Opening Baby Insights with no saved custom filter shows **today only** (`fromDate` = `toDate` = local today). That today range drives **KPIs, charts, and both lists**. Sparse or empty today metrics are **normal** (quiet day ≠ broken); use the existing date filter + Apply to widen for trends.
3. Charts, KPIs, Care chips, Apply/Reset, and load-more / show-more behavior keep working for the selected range; skeletons stay in parity with the new list chrome (zero CLS).
4. Light + dark still look correct; no new capture flows or backend product features.

**Baby ≠ Money default:** Baby Insights opens on **today**; Money Insights stays on **this month**. Do not sync those defaults.

## Metric

**Primary signal:** A caregiver who knows Money Transactions can open Baby Insights and (1) recognize the same table-style browse surface for the event list, and (2) land on **today’s** events by default without changing the date filter.

**Supporting check:** Focused unit tests for the new default range; UI/e2e coverage that Insights opens with today and renders table-style rows (not the old `<ul>` chrome); skeleton mirrors the new layout.

## Non-goals

What we will **not** build in this pass:

- Changing Money Transactions or Money Insights defaults.
- Full ledger features on Baby (bulk select, multi-column sort, account/category columns, edit-from-row) unless needed for visual parity — Baby stays **view** browse.
- Reworking KPI cards, charts, or Care / growth chip filters beyond what the new default range requires.
- New care event types, Telegram, or capture route changes.
- Hardcoded breakpoints or a one-off Baby-only table design system.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| “Same style as Transactions table” means **shared Table + mobile card chrome**, not cloning Money’s columns/actions | Yes for a small pass | User wants exact Money columns / edit / bulk select | Scope grows to a full Baby ledger; re-ideate |
| Both **timeline and growth** lists should get the new chrome | Likely | User says timeline only (or growth only) | Style one list; leave the other as `<ul>` for now |
| Default **today only** should drive **all** Insights data (KPIs, charts, both lists) | Yes unless user says otherwise | User wants today for lists but keep month for charts/KPIs | Split defaults or two filters — more product complexity |
| Visual restyle + default-range change is enough; no new GraphQL fields | Likely | Design needs new columns that APIs don’t return | Thin API / mapping tasks or cut columns |
| Reset should return to **today**, not “this month” | Yes if default is today | User wants Reset → month | Document dual defaults; confuse day-to-day flow |

## What we should not build

- A second list design language next to `components/ui/table.tsx`.
- Card wrappers around the event table.
- Fake “insight” columns with no real baby data.
- Scope creep into edit-in-place timeline rows or Money-style bulk tools.

## Success criteria

- [ ] Baby Insights care timeline (and growth list if in scope) uses Transactions-like **table / mobile-card** presentation per DESIGN_GUIDE (flat section, sharp table shell, skeleton parity).
- [ ] Default date filter on first open (and on Reset, unless settled otherwise) is **local today only**.
- [ ] User can still change from/to dates and Apply; filtered data still drives KPIs, charts, and lists.
- [ ] Empty / loading / error states remain clear; empty today is not a hard error and includes a simple widen-range next step via the existing date filter.
- [ ] Light + dark + zero CLS for the restyled lists.
- [ ] No change to Money ledger defaults or Baby capture flows.

## Open questions

**Settled** by Locked product picks in `03-design.md` (do not re-open in Build unless Gate 2 rejects):

1. **Which lists?** → **Both** timeline and growth.
2. **Parity depth?** → Visual chrome + existing show-more / load-more only (no Money sort/bulk).
3. **Default today scope?** → **Entire Insights** (KPIs + charts + lists).
4. **Row content?** → Keep Baby fields; map into Table cells/cards (not Money Date / Category / Amount).
5. **URL / bookmark?** → Client-only today default this pass (**no** new `from`/`to` URL sync).
