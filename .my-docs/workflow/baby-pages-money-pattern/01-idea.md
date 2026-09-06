# Idea: Baby pages aligned with Money layout UX

## Problem

Baby Care already has Money-style **chrome** (hamburger, `PageHeading`, no shell rail, language in settings). The **pages themselves** still feel like a thinner, one-off UI:

- Home is only big buttons — no scannable “what happened last?” status before act.
- Capture pages (feed / sleep / diaper) use ad-hoc large CTAs instead of Money’s clear section stack, flat form surfaces, and field patterns.
- Growth / timeline / settings don’t follow Money’s eye-flow (status → act → browse → configure) or shared layout tokens (`MONEY_DASHBOARD_STACK`, settings sections, skeleton parity).
- Caregivers at 3am need a caregiving-app flow (last feed / nap / diaper, one-thumb log, shared day view) — not a finance dashboard copy-paste, and not a random button wall.

Result: Baby and Money feel like different products under one shell, and Baby pages are harder to scan and trust when tired.

## User / audience

- **Primary:** Sleep-deprived parents / caregivers logging feed, nap, diaper with one hand on a phone.
- **Secondary:** Partner / other household caregivers who open Timeline or Growth and need the same layout language as the rest of the shell.
- **Not this pass:** Pediatric clinics, public API consumers, multi-baby households.

## Outcome

What “done” looks like:

1. Every Baby route (home, feed, sleep, diaper, growth, timeline, settings) follows the **same page-level design pattern as Money**: shell grid span, heading + body stack, flat forms/settings, Cards only for metrics/charts, matching skeletons.
2. **Eye reading flow** is consistent and caregiving-aware:
   - **Home / review:** last-status or day snapshot first → primary log actions → secondary browse/configure.
   - **Capture (feed / sleep / diaper):** fewest decisions at the top; optional detail below; large targets; clear success feedback.
   - **Growth:** metrics/chart then list/form (Money dashboard order), not a jumble.
   - **Timeline:** day browse as the shared log surface (filters/load more as needed).
   - **Settings:** configure-once sections (locale, Telegram) like Money settings — headings + dividers, not cards-for-everything.
3. Behavior and APIs stay as shipped by baby-care; this pass is **layout / UX consistency**, not new logging features.
4. Light + dark, mobile-first, skeleton parity, DESIGN_GUIDE tokens — no CLS when content loads.

## Metric

**Primary signal:** A caregiver (or reviewer) can open Baby next to Money and say the pages share the same layout language — and can still log feed / nap / diaper in one thumb session without hunting for the primary action.

**Supporting check:** Side-by-side review of Baby vs Money (heading → body stack → section order → skeletons) passes for all Baby routes; existing baby e2e / focused layout tests stay green.

## Non-goals

What we will **not** build in this pass:

- New care features (prediction, reports/PDF, offline/CRDT, multi-baby, roles).
- Rebuilding Telegram bot behavior or GraphQL contracts unless a page layout forces a tiny display-only tweak.
- Changing shell / hamburger chrome again (already done in baby-care UI polish).
- Copying Money’s finance dashboard (KPIs about spending) onto Baby — only the **pattern** (stack, tokens, flat vs card rules, eye flow).
- Native apps / wearables / redesign of the whole shell.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Page-level Money pattern + caregiving eye-flow is the gap (chrome is already OK) | Yes for this workflow | Side-by-side: if chrome still feels wrong, reopen chrome work | Expand scope to chrome / nav order |
| Home should show last-status / day snapshot before log CTAs | Likely | User says home must stay three buttons only | Keep CTA-first home; put status on Timeline only |
| Capture pages stay dedicated routes (not merge into one mega-form) | Yes unless user says otherwise | User wants single “Log” wizard | Redesign IA; bigger Design |
| No new backend required for layout UX | Yes | Status widgets need fields we don’t return | Thin API/query tweak in Design, or cut status widgets |
| Money layout helpers (`MONEY_FULL_SPAN`, dashboard stack, settings sections) are safe to reuse or mirror for Baby | Yes | Coupling proves messy | Baby-local layout constants that mirror Money |

## What we should not build

- A second design system just for Baby.
- Decorative cards around every form and timeline row.
- Desktop-only layouts or hardcoded breakpoints for content.
- Fake “insights” charts on home that don’t help logging.
- Scope creep into feature work already deferred in baby-care.

## Success criteria

- [ ] All Baby pages use Money-aligned page structure (full-span body, section stack / gaps, flat forms & settings, Cards only where Money would).
- [ ] Eye flow matches caregiving jobs: status/context → capture → browse → configure across home, capture, growth, timeline, settings.
- [ ] Skeletons / `loading.tsx` match live UI (zero CLS) for every changed route.
- [ ] DESIGN_GUIDE: tokens, hit targets, light+dark, no hard-coded chrome.
- [ ] Existing baby logging flows still work (feed, sleep, diaper, growth, timeline, settings locale/Telegram).
- [ ] Non-goals stay out: no prediction, reports, offline, multi-baby, chrome redo.

## Open questions

Resolved at Gate 1 (2026-09-06):

1. **Home content:** Last feed / last nap / last diaper (or today summary) **above** log CTAs.
2. **Capture after save:** Navigate **back to home**.
3. **Growth page job:** **Add first**, then chart.
4. **Scope:** **All seven** Baby surfaces in this pass.
5. **Depth of alignment:** **Reuse / generalize** Money primitives (Field, settings sections, stack helpers) for both apps where practical.
6. **Nav / page titles:** Keep current labels unless Design finds a clear rename win (not blocking).

---

*Gate 1 approved 2026-09-06 with answers above.*
