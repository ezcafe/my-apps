# Idea: Baby log forms match money/new; vaccines on growth

## Problem

Baby capture pages (feed, sleep, diaper, growth, vaccines) do not share one clear form style with Money’s `/money/new` page. Caregivers see different layouts and interaction patterns for the same job: pick a type, fill a few fields, save. Vaccines also sit on a separate nav item and route, which adds clutter next to Growth for a less frequent log.

## User / audience

Parents and caregivers who log baby care in the Baby workspace (same people already using Feed / Sleep / Diaper / Growth / Vaccines).

## Outcome

- **Form style:** Baby log (capture) pages follow money/new chrome where a form applies: type chips, auto-fit field grid, clear primary save, same spacing/radii hierarchy — **not** a forced multi-step clone. Feed/diaper (and sleep one-tap paths) keep today’s one-tap / few-field primary saves.
- **Vaccines merge:** Vaccine logging lives on `/baby/growth` as an **always-visible** type chip with a plain label (e.g. “Vaccine”) — never overflow-only or hidden secondary. Section nav drops the separate “Log vaccines” item. `/baby/vaccines` permanently redirects to Growth with vaccine type preselected (see Merge + Open questions).

## Metric

- Caregiver opens any in-scope baby log page and saves a typical entry with the same familiar chrome; Growth logs growth/health **and** vaccine; one fewer section-nav capture item.
- **Post-ship check:** taps or time from open → successful save on feed & diaper (must not get worse); vaccine saves started from Growth (findable without a Vaccines nav item).

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes — one primary surface (Growth with vaccine type included, styled like money/new) plus note that other capture pages follow the same pattern; one reference image is enough unless Gate A asks for more.
- **Copy/token-only?** no — layout/interaction restyle + route/nav merge, not copy-only.

## 80/20 UI (day-to-day)

### Main user goals

- Log a care event quickly (feed, nap, diaper, growth/health, vaccine).
- See the same “how to fill this form” pattern as Money new transaction.
- Find vaccine logging without a separate nav destination.

### Vital few (high-impact ~20%)

- Shared form chrome where a form applies: chips / grid / radii / save hierarchy (money/new look) — **not** forcing an extra Save step on one-tap paths.
- Merge vaccine into Growth as always-visible chip + nav cleanup.
- Keep one-tap / few-field saves on feed/diaper (and equivalent sleep) — restyle must **not** add steps there.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Log type selector (chips), matching money/new “Type”. On Growth, **Vaccine** is always one of those chips (plain name) — not menu/overflow-only.
- **Important info / action #2 (always visible):** On form-style pages: primary Save. On feed/diaper (and sleep one-tap): the page’s true primary (e.g. method / choice that saves in one tap) — do not add a required extra Save step.
- **Core action placement:** Where a multi-field form applies: type → required fields → save. Where one-tap already works: keep that path; still match chips/spacing/radii chrome. Descriptive labels; immediate success/error feedback.
- **Secondary actions:** Timer extras, optional notes, rare fields, edit/history — menus, expand, or Activities/Insights. Vaccine is **not** secondary/hidden.

### Top user journey to optimize

- **Form pages (e.g. Growth / vaccine):** Open → pick type chip → fill 1–2 fields → Save → success feedback.
- **High-frequency one-tap (feed/diaper, sleep where one-tap exists):** Open → one primary tap (or few fields) → saved — same or fewer steps than today after restyle.

### Sensible defaults

- Preselect the most common type per page (e.g. Growth weight). Vaccine chip always visible but **not** the default type.
- When Vaccine type is selected (or landed via redirect), show dose-first fields.
- Prefill units/date-time where the product already does.

### Biggest usability risks to fix first

- Restyle that makes one-tap feed/diaper slower (extra Save or forced multi-step).
- Vaccine feel “gone” after nav merge if chip/label is vague or overflow-only.
- Broken bookmarks to `/baby/vaccines` without redirect + vaccine preselect.
- Inconsistent chip/field/save order across pages after restyle.

## Scope (clarify)

### “Baby log pages” (in scope)

Capture routes and their forms:

| Route | Today |
|-------|--------|
| `/baby/feed` | Feed form |
| `/baby/sleep` | Sleep / nap form |
| `/baby/diaper` | Diaper form |
| `/baby/growth` | Growth / health form (kinds already chip-based) |
| `/baby/vaccines` | Vaccine form — **merge into growth** |

### Out of this “log pages” restyle (unless needed for links/nav)

- `/baby` home, `/baby/insights`, `/baby/activities` (history/review), `/baby/settings`.
- No redesign of Insights charts or Activities list beyond nav/link fixes for vaccines → growth.

### “Merge vaccines into growth” means

| Area | Intent for this idea |
|------|----------------------|
| **Nav** | Remove separate “Log vaccines” section-nav item; Growth remains the capture entry for growth/health **and** vaccines. |
| **Write path** | Create vaccine from `/baby/growth` via an **always-visible** Vaccine type chip (plain label). Existing vaccine API/data can stay; UI write entry moves. |
| **`/baby/vaccines`** | **Recommended day-to-day:** permanent redirect to `/baby/growth` **with vaccine type preselected**. Removal-only (no redirect) only if proven unused. |

## Non-goals

- Redesigning Money `/money/new` itself.
- New baby care event types beyond merging vaccine onto Growth.
- Full Activities / Insights rebuild.
- Changing auth, workspace, or non-Baby apps.
- Rewriting the paused `baby-growth-health-logging` run; this is a new requirement on top of current Baby UI.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| “Baby log pages” = feed, sleep, diaper, growth (+ vaccines merge), not Activities | Yes for scope | Confirm with Gate A / user | Expand or shrink restyle list |
| money/new pattern = chrome (chips/grid/radii/save hierarchy) where a form applies; **not** forced multi-step on one-tap feed/diaper/sleep | Yes | Skim `MoneyTransactionForm` + Gate A one-tap rule | Adjust 01b / design; never add Save steps on one-tap paths |
| Vaccine can share Growth page as one type without a second save CTA pattern | Likely | Prototype chip + fields on growth | Keep thin vaccine section on growth, still one route |
| Redirect `/baby/vaccines` → growth **with vaccine preselected** is enough for bookmarks | Yes for day-to-day | Check e2e + nav tests | Keep thin alias or update all links; do not leave dead page |

## What we should not build

- A brand-new shared form framework for the whole app.
- Vaccination schedule / reminder product.
- Pixel-perfect duplicate of Money account/category/budget widgets on Baby pages.

## Success criteria

- [ ] Growth (and other multi-field forms) use money/new chrome: chips / fields / primary save hierarchy.
- [ ] Feed/diaper (and sleep one-tap paths) keep today’s one-tap / few-field primary saves — restyle does **not** add steps; match chrome (chips/grid/radii) without cloning money/new’s multi-step flow.
- [ ] Section nav has no separate vaccines item; vaccine is an always-visible Growth type chip with a plain label.
- [ ] `/baby/vaccines` permanently redirects to Growth with vaccine type preselected (not a dead page).
- [ ] Skeletons stay in parity with live UI; light/dark still work.
- [ ] Existing care write APIs still work; no intentional data loss for past vaccines.

## Open questions

- Exact Growth type chip label for vaccine (plain name) and whether dose UI stays as today.
- Query/param shape for “vaccine preselected” on Growth (behavior decided: preselect; exact URL shape in design).
- Whether Activities filters/labels that say “vaccines” need copy-only updates in this pass.
