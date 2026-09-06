# Idea: Baby log UX, vaccine, Insights charts

## Problem

Caregivers use Baby Care at odd hours. Several pain points stack:

- **After log:** Feed and sleep forms send you **home** on save (`runBabyCareSaveThenNavigate` → `/baby`). The on-page **timer** disappears, so logging back-to-back feeds or watching an open nap means reopening the form.
- **Capture UX:** Log pages are usable but not tuned for **3AM / one-thumb** scanning (eye flow, primary action first, low cognitive load).
- **Insights timeline:** Feed/sleep rows do not clearly show **side** (Breast L/R), **stop time only**, and a **friendly duration** (end − start). Partners scanning the day need that at a glance.
- **Vaccine:** There is **no** way to log vaccines today (care types are feed / sleep / diaper; growth kinds are weight / height / head / temperature / medication).
- **Hamburger icons:** Baby nav reuses Money glyphs that do not match the job (e.g. sleep → `"bills"`, diaper → `"import"`) — hard to scan in the menu.
- **Measure / growth kinds:** Weight, Height, Head, Temperature, Medication are awkward as a long select / separate controls; they should live in a **filter-style chip bar** like Money Insights filters.
- **Charts:** Insights already shows weight/height line charts; caregivers want **richer demo charts** in the same spirit as Money Insights (card grid, chart chrome) for growth and/or care review — not a thin one-off.

## User / audience

- **Primary:** Sleep-deprived parents / caregivers logging feed, sleep, diaper, measurements (and vaccines) on a phone, often one-handed at night.
- **Secondary:** Partner / other household caregivers who open **Insights** to see what happened (timeline + charts) without logging.
- **Not this pass:** Pediatric clinics, multi-baby households, public health reporting, native apps, Telegram vaccine commands (unless Design later says a tiny parity is required).

## Outcome

What “done” looks like:

1. **Feed/sleep Start stay, End home** — after Start, Start disabled and timer visible on the log page; after End, go to `/baby`.
2. **Feed / sleep (and related capture) pages** are easier at 3AM: clear top-to-bottom eye flow, large primary targets, optional fields below, DESIGN_GUIDE tokens + skeleton parity.
3. **Insights timeline** labels feed as **“Feed (Breast R)” / “Feed (Breast L)”** (and sensible labels for formula/pump), shows **stop time only**, plus **duration** in a friendly format; **Sleep** gets the same stop-time + duration pattern.
4. Caregivers can **log vaccines** in a **separate list** (required: **name**, **dose** first/second).
5. **Hamburger** Baby menu items use **new dedicated SVGs** that match each job.
6. **Weight / Height / Head / Temperature / Medication** are chosen from a **filter / chip bar** on **both** Insights and Measure.
7. **Insights** gains **Money-style chart cards**: more **growth series** plus **care-count over time**, driven by real baby data.

## Metric

**Primary signal:** At night, a caregiver can log a feed (or sleep), **stay on the page with the timer**, then scan Insights and instantly read **side + stop time + duration** for feed/sleep — and can log a **vaccine** and pick growth kinds from a **chip filter bar**, with **chart cards** that feel like Money Insights.

**Supporting check:** Focused / e2e coverage for stay-on-page, timeline label format, vaccine create, nav icons, filter bar, and chart regions; light + dark + zero CLS.

## Non-goals

What we will **not** build in this pass:

- Full vaccine **schedule / reminders / WHO calendar** product (unless Gate 1 explicitly expands).
- Changing Telegram bot command set as a primary deliverable (web-first; bot parity only if required).
- Multi-baby, roles, offline/CRDT, PDF export, AI summaries.
- Cloning Money’s **finance** charts (spend, accounts) onto Baby — only the **chart card / grid pattern**.
- Rebuilding the whole Baby shell chrome again (hamburger **structure** stays; **icons** update only).
- Waiting to invent a second design system.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| After feed/sleep save, **stay on the log page** and keep a usable **timer** is the desired behavior (overrides earlier “navigate home” preference) | Yes for this idea | User says stay only for feed, or only show last-saved summary | Narrow to one surface or restore home navigate for sleep |
| Timeline copy change (Breast L/R, stop time, friendly duration) is **display-only** — payload already has method + times | Likely | Data lacks end time or method on some rows | Backend/payload fix or hide duration when missing |
| **Vaccine** is in scope as a first-class log (new care type or growth-like entry) | Yes unless cut | User wants “notes only” or defer vaccines | Drop vaccine tasks; keep UX + charts |
| “Merge kinds into filter bar” means **chip/filter UI** for growth kinds on Insights (and/or Measure), not a new analytics product | Likely | User only wants Measure form chips, not Insights | Scope to one page |
| “Charts same as money/insights” means **layout chrome** (period/filters → KPI optional → **chart card grid**), with baby-relevant series (more kinds / care counts) — not copying spend charts | Yes | User wants literal Money chart types with dummy data | Cut to demo placeholders or expand analytics scope |
| Dedicated / clearer **hamburger icons** for Baby items are enough (no nav IA rewrite) | Yes | User wants new nav groups or vaccine as its own nav item | Expand nav Design |
| Parallel workflows (Insights merge, Money-pattern pages) can share files; this pass designs against **current** Baby UI and coordinates on collide | Yes | Mid-flight PRs reshape Insights heavily | Sequence / rebase after those land |

## What we should not build

- Fake “insight” numbers that do not map to real care or growth data.
- Decorative cards around every timeline row or form field.
- Hardcoded breakpoints for content layout.
- A full medical record / immunization schedule engine in v1.
- Scope creep into prediction, wearables, or native apps.

## Success criteria

- [ ] On **feed** and **sleep**: after Start, stay on page with Start disabled + timer; after End, **redirect home** (diaper unchanged).
- [ ] Feed / sleep capture pages follow a clear **3AM eye flow** (primary actions first; optional detail below; large targets; light + dark; skeleton parity).
- [ ] Insights timeline shows feed as **Feed (Breast L/R)** (and clear labels for other methods), **stop time only**, and duration as **`12m` / `1h 5m`**; sleep rows match stop time + duration.
- [ ] User can **create and list vaccines** (separate list; required **name** + **dose** first/second).
- [ ] Baby hamburger items use **new dedicated SVGs** (sleep/diaper/measure/etc. match the job).
- [ ] Weight / Height / Head / Temperature / Medication are selectable via a **filter / chip bar** on **both** Insights and Measure.
- [ ] Insights includes **Money-style chart cards** for **more growth series** and **care-count over time** (visx + shared chart chrome).
- [ ] Non-goals stay out; DESIGN_GUIDE + zero CLS on changed surfaces.

## Open questions

*(Settled at Gate 1 — 2026-09-06)*

1. **Stay + timer:** After **Start**, stay on page, disable Start, show timer. After **End**, **redirect home**. Feed/sleep only (not diaper).
2. **Vaccine model:** **Separate list** + hamburger item `/baby/vaccines`. Required: **name**, **dose** (first/second). Log-only.
3. **Filter bar where?** **Both** Insights and Measure.
4. **Charts depth:** **More growth series** plus **care-count over time**.
5. **Hamburger icons:** **New dedicated SVGs** per Baby menu item (incl. vaccine).
6. **Duration format:** Compact **`12m` / `1h 5m`**.
7. **Parallel work:** Design/build against **current in-tree** Baby UI.
8. **Design Option A** approved Gate 2 (with Start stay / End home nuance).

---

*Gate 1 approved with answers above.*
