# Idea: Baby Insights page (merge Growth + Timeline)

## Problem

Baby Care splits “review the baby’s day and growth” across two places:

- **`/baby/timeline`** — day log of care events (feed / sleep / diaper).
- **`/baby/growth`** — growth measurements, chart, and add/edit.

Caregivers who want the full picture bounce between two nav items. Money (and Loans / Investments) already use one **Insights** surface for review. Baby feels inconsistent and costs extra taps when tired.

## User / audience

- **Primary:** Parents / caregivers who open Baby to **review** — what happened today, how growth looks — not to log a new feed.
- **Secondary:** Partner / other household caregivers who need the same browse path as the rest of the shell.
- **Not this pass:** Pediatric clinics, public dashboards, multi-baby households, new prediction/AI insights.

## Outcome

What “done” looks like:

1. **One Baby Insights page** replaces separate Growth and Timeline as the review home (nav + route aligned with Money’s Insights idea).
2. The page **shows both** growth (chart / measurements) and the care **timeline** in one scannable stack — same layout language as Money insights (heading → body stack → review content; Cards for charts/metrics; flat list for timeline rows; matching skeleton).
3. **Old URLs** (`/baby/growth`, `/baby/timeline`) do not strand users (redirect or clear nav replacement — settled in Design after Gate 1 answers).
4. **Capture routes** (feed / sleep / diaper), Home, and Settings stay as they are for logging and configure — this pass is the **review** merge, not a new logging product.
5. Light + dark, mobile-first, skeleton parity, DESIGN_GUIDE tokens — no CLS when content loads.

## Metric

**Primary signal:** A caregiver can open **one** Baby Insights entry and see both growth context and today’s care timeline without switching nav items — and say it feels like Money’s Insights pattern (one review page), not two orphan tools.

**Supporting check:** Nav shows Insights instead of separate Growth + Timeline; e2e / focused tests cover the merged page and redirects (if any); light/dark + skeleton parity pass.

## Non-goals

What we will **not** build in this pass:

- New analytics product (spend-style filters, drilldowns, PDF/export, AI summaries, percentile WHO charts unless already present).
- Changing feed / sleep / diaper capture flows or Telegram bot behavior.
- Multi-baby, roles, offline/CRDT, native apps.
- Re-doing the whole Baby shell chrome (hamburger / page heading) — already covered elsewhere.
- Waiting on or merging the separate **baby-pages-money-pattern** Gate 3 work as part of this run (coordinate only if it blocks UX).

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| One Insights page that **hosts both** growth + timeline is what users want | Yes for this idea | User says keep two routes; only restyle | Stop merge; maybe rename only |
| “Follow money insight page” means **page pattern** (stack, cards for charts, review eye-flow), not cloning Money’s full filter/KPI analytics | Likely | User wants full Money analytics chrome (period chip, many filters, KPI strip) on Baby | Design a heavier insights shell; more scope |
| Growth **add/edit** can live on the same Insights page (or a clear section) without hurting “review first” | Open | User wants chart+timeline only; add growth elsewhere | Split “add measurement” to Home or a small modal/route |
| Existing growth + timeline APIs / data are enough; no new backend | Likely | Design needs new aggregations | Thin API tasks or cut metrics |
| Replacing nav items Growth + Timeline with Insights is OK | Yes unless user says otherwise | User wants Insights **plus** keep Timeline link | Keep both links or nest sections |
| This workflow can ship against **current** Baby UI even if baby-pages-money-pattern is still merging | Yes | That PR reshapes growth/timeline heavily mid-flight | Sequence after that merge, or rebase Design |

## What we should not build

- A second design system or finance-style spend charts pasted onto Baby.
- Decorative cards around every timeline row.
- Hardcoded breakpoints for content layout.
- Fake “insight” KPIs that don’t map to real baby data.
- Scope creep into prediction, meds schedules, or new care event types.

## Success criteria

- [ ] Single Baby **Insights** nav item / route is the review surface for growth + timeline content.
- [ ] Page layout follows Money Insights **pattern** (full-span stack, chart/metrics as cards, timeline as browse list, skeleton parity).
- [ ] Caregivers can **view** growth history and **browse** care events on Insights; growth create/edit is **not** on Insights (elsewhere, per Design).
- [ ] `/baby/growth` and `/baby/timeline` removed (redirects to Insights OK); nav is one Insights item.
- [ ] Shared period filter (default **this month**) drives both growth and timeline sections.- [ ] Capture (feed/sleep/diaper), Home, Settings unchanged in job; no new analytics product features from Non-goals.
- [ ] Light + dark and zero CLS for the new page.

## Settled product answers (Gate 1 — 2026-09-06)

1. **Money pattern depth:** Full Money Insights (period chip, filters, KPI strip, chart grid).
2. **Section order:** Growth first, then timeline. Both follow the shared filter criteria. **Default period: this month.**
3. **Growth add/edit:** Insights is **view-only**. Add/edit growth moves elsewhere (Design will place it — not on Insights).
4. **Route:** `/baby/insights`. **Remove** `/baby/growth` and `/baby/timeline` (no keep-alive pages; redirects OK if needed for bookmarks).
5. **Nav:** One **Insights** item replaces both Timeline and Growth & meds.
6. **vs baby-pages-money-pattern:** Design/build against **current** Baby UI. Do not wait on that Gate 3 merge.

## Open questions

- Where should growth **add/edit** live now that Insights is view-only? (Design will propose; soft pick OK before/at Gate 2.)

---

*Gate 1 approved — product answers locked 2026-09-06.*
