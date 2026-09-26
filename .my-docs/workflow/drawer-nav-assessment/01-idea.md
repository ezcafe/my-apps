# Idea: Drawer nav assessment redesign

**Project shape:** Next.js multi-app shell (Money, Investments, Loans, Baby) with a left icon rail on large screens and a mobile hamburger drawer (`MoneyAppMenu`) that lists current-app sections, other apps, Help/Settings/Kiosk, and auth. Nav items live in `lib/features/registry.ts` and `lib/app-section-nav.ts` (groups exist in data; drawer UI is mostly a flat list today).

## Problem

The mobile drawer has become **long navigation** debt: many destinations in one popover (page actions + current-app sections + other apps + shell/core + sign in/out). Users pay a **navigation budget** cost on every open—reorient, scan a long list, tap. Labels and order grew feature-by-feature (rationale debt), not from a clear mental model. Desktop rail and drawer do not tell the same story. Partial P&P-style groups exist in `APP_SECTION_NAV` but the drawer does not surface them, so the assessment work was never finished in the UI.

## User / audience

Household operators who switch between Money / Investments / Loans / Baby on phone or narrow viewports. Primary persona for assessment: signed-in owner who can see all apps (full-access skew). Secondary: someone who lives in one app most of the day.

## Outcome

1. Design docs apply the **Pencil & Paper Navigation Assessment Framework** (long-nav path) to this shell drawer: persona inventory → low-value rank (cut / amalgamate / interaction rework) → overloaded-flow notes → category map + proposed drawer IA.
2. Shipped drawer matches that map and approved HTML ui-refs: fewer way-finding mistakes, clearer parent categories (not only cuts), current-app tasks dominant, other apps and shell/auth secondary.
3. Desktop rail stays consistent with the same IA story (labels/order/grouping intent)—no separate product invent.

## Metric

On a typical phone session in one app: open drawer → find a known in-app destination in **≤2 seconds / ≤1 scroll** for top tasks; cross-app jump remains obvious without scanning the whole list as one flat dump. Success criteria checklist in Design + e2e smoke for drawer structure.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** no — full HTML proposed drawer for Gate A2 (primary surface; optional second HTML only if rail chrome must change)
- **Copy/token-only?** no

## 80/20 UI (day-to-day)

### Main user goals

- Jump to a section inside the **current** app (Home/Spending, Insights, capture actions, settings for that app)
- Switch to **another** product app
- Reach Help / Settings / sign out (and Kiosk when relevant) without hunting

### Vital few (high-impact ~20%)

- Current-app destinations used daily (browse + capture)
- Other-app jump (when switching context)
- Settings / sign out (account trust)

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Current-app section list (task-oriented; prefer grouped labels over one undifferentiated dump)
- **Important info / action #2 (always visible):** Other apps as a short jump list (or clear “Apps” parent)—not mixed into current-app tasks
- **Core action placement:** Open hamburger → see current app first; strong hierarchy; descriptive labels; close on navigate; ≥44px hits; light/dark tokens
- **Secondary actions:** Page actions (when registered), Help, Kiosk, Settings, Sign in/out—footer / separated band; rare items stay out of the top band

### Top user journey to optimize

Open drawer → scan current-app group → tap section → land (menu closes) — or Open drawer → Other apps → tap app home

### Sensible defaults

Drawer opens scoped to **current app** first; optional sections honor existing visibility settings; no new “show everything” admin dump as the default mental model

### Biggest usability risks to fix first

- Flat long list with weak categories (high scan cost)
- Mixing page actions, app sections, and shell chrome without clear bands
- Admin/full-access skew hiding how sparse a single-app day feels
- Cutting detail blindly instead of clearer parents / amalgamate / interaction rework

## Non-goals

- New product features or new routes for their own sake
- Deep breadcrumb / wide nested IA overhaul (this is long-nav, not 8-level workflow breadcrumbs)
- Global search product (may stay an Open question; not required for MVP)
- Rewriting desktop-only layouts of every page
- Splitting into separate marketed products (controversial question only)

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Drawer is the main nav problem (not missing workflows) | Prefer yes for this pass | Skim support / own day-to-day | Pivot Outcome to guided flows instead of IA-only |
| Long-nav framework fits better than wide/deep | Yes for shell drawer | Check for deep indent/breadcrumb in drawer | Add wide-nav pass if drawer nests deep |
| Groups in `APP_SECTION_NAV` are the right parents | Maybe | Persona inventory + rank | Rename/regroup in Design map |
| Desktop rail should mirror drawer IA | Prefer yes for labels/order | Compare rail vs drawer jobs | Document intentional divergence |

## What we should not build

- Mega-menu marketing chrome, purple/glow decorative nav, or a second competing hamburger
- Search-as-only-fix without fixing categories
- Deprecating whole apps in this pass without explicit product decision

## Success criteria

- [ ] `03-design.md` has a **Navigation Assessment** section: persona inventory, low-value rank (cut/amalgamate/rework), category map, proposed drawer structure, navigation-budget notes
- [ ] Framework source cited: `refs/navigation-assessment-framework.md` / Pencil & Paper article
- [ ] Gate A2 HTML shows proposed drawer (size/positions/texts/chrome parity with real popover)
- [ ] Build matches approved HTML; skeleton/loading parity if menu chrome changes
- [ ] Current-app tasks visually dominant; other apps + shell/auth secondary
- [ ] Unit/e2e cover drawer IA structure (labels/order/groups) per tasks
- [ ] Light and dark verified

## Open questions

- Redesign **desktop rail** in the same pass, or drawer-first with rail label/order sync only?
- Should **Review / Capture / Browse / Configure** group labels appear in the UI, or stay data-only?
- Is **search** in the drawer in scope, or defer?
- Any destinations already candidates to **cut / amalgamate** (e.g. one-action pages) before Design inventories them?
- Does “drawer” include the popover on tablet widths where the rail is hidden (`lg:` breakpoint), only?
-
