# Idea: Baby care pages match home + money/new controls

## Problem

Baby capture pages do not match the controls caregivers already use on Baby Home and Money new:

- **Feed** still shows old Formula / Pump amount chips plus an Amount (ml) field, and keeps Pump L/R on the same page as breast/bottle — unlike Home’s clear split and one-tap chips.
- **Pump** has no dedicated page; pump timers live on Feed, so pumping feels like a feed subtype.
- **Growth** form layout does not match money/new (field-per-line; Category-style pickers; Amount-style numbers).
- **Diaper** logs with plain chips and no detail modal, while Home opens a sheet for dirty/mixed.
- **Skeletons** can drift from the live layouts after control changes (CLS risk).

## User / audience

Parents and caregivers who log care from Baby Home and from Feed / Pump / Diaper / Growth pages (often one-handed, interrupted, low light).

## Outcome

- **Feed (`/baby/feed`):** Same primary controls as Home for feeding (Breast L/R timers + Formula / bottle chips with custom ml as on Home). **No** Formula + Pump amount + Amount (ml, optional) fields. Pump controls removed from Feed.
- **Pump (`/baby/pump`):** Dedicated page with the same Pump L + R + custom ml controls as Home. Section nav includes Pump when needed.
- **Growth (`/baby/growth`):** Form chrome matches money/new: each field on its own line; Symptoms + Unit use the same control pattern as Category on money/new; Amount + Value match Amount on money/new.
- **Diaper (`/baby/diaper`):** Same kind buttons as Home; selecting dirty/mixed opens the same detail modal/sheet pattern as Home (wet stays one-tap if that is Home’s behavior).
- **Skeletons:** Feed, pump, growth, diaper (and related baby loading UIs touched by this change) stay in visual parity with the live pages.

## Metric

- Caregiver can log breast/bottle from Feed and pump from Pump with the same tap patterns as Home (no old amount-method fields on Feed).
- Growth save path uses money/new-like field rows and Category/Amount-style controls for Symptoms, Unit, Amount, Value.
- Diaper dirty/mixed opens the detail sheet before save, matching Home.
- Loading skeletons match live layout (no obvious CLS on those pages).

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** no — four primary surfaces (feed, pump, growth, diaper); need reference images for Gate A2.
- **Copy/token-only?** no — control/layout parity and a new Pump route surface.

## 80/20 UI (day-to-day)

### Main user goals

- Log breast / bottle / pump / diaper / growth quickly with familiar controls.
- Find Pump as its own job (not buried on Feed).
- Fill Growth without learning a different form language than money/new.

### Vital few (high-impact ~20%)

- Feed = Home feed controls; remove old Formula/Pump-amount/Amount fields; no Pump on Feed.
- Pump page = Home Pump L + R + custom ml.
- Diaper = Home buttons + detail modal for dirty/mixed.
- Growth = money/new field-line + Category/Amount control parity for named fields.
- Skeleton parity for every touched page.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Primary care controls for that page (Feed: breast + formula chips; Pump: L/R + ml; Diaper: wet/dirty/mixed; Growth: kind chips + field rows).
- **Important info / action #2 (always visible):** Immediate feedback (running timer, done flash, or Save on multi-field Growth) — same stakes scale as Home / money/new.
- **Core action placement:** One-tap or few-tap paths stay dominant; Growth fields stack one per line; descriptive labels; no extra steps vs Home for the same action.
- **Secondary actions:** Notes, rare options, history — expand / Activities / Insights; not competing with primary chips.

### Top user journey to optimize

1. **Feed:** Open → Breast L/R or Formula chip (custom ml if needed) → saved / timer running — same as Home.
2. **Pump:** Open → Pump L/R or custom ml → same as Home pump.
3. **Diaper:** Open → pick kind → (dirty/mixed) detail sheet → confirm → saved.
4. **Growth:** Open → pick kind → fill Value/Amount/Unit/Symptoms as money/new-style rows → Save.

### Sensible defaults

- Keep existing Home defaults for bottle ml snaps, growth kind default, diaper wet one-tap.
- Pump page defaults to idle L/R ready (no forced side).
- Do not preselect Growth Vaccine unless deep-linked.

### Biggest usability risks to fix first

- Leaving Formula/Pump amount/Amount fields on Feed after “parity” work (confusing duplicate paths).
- Pump still only on Feed (nav/discoverability).
- Diaper page saves dirty/mixed without the Home detail sheet (data/quality mismatch).
- Growth “looks like money/new” but uses different Category/Amount controls.
- Skeletons out of sync after layout change (CLS).

## Non-goals

- Redesigning Baby Home itself (reference only).
- Changing Insights / Activities history UIs beyond what skeleton or shared control reuse requires.
- New GraphQL entities or growth kinds (reuse existing APIs unless Analyze finds a hard block).
- Sleep page restyle (out of this ask).
- Full money/new feature clone (wizards, splits, ledger presets) — visual/control pattern only.

## Assumptions to attack

- Home’s feed/pump/diaper controls are the source of truth for care logging UX.
- money/new Category + Amount field patterns are the source of truth for Growth form chrome.
- `/baby/pump` can be added to section nav without a large IA rethink.
- Existing create mutations cover Feed (breast/formula), Pump, Diaper (+ detail), Growth — likely **Has API = no** / **Has DB = no** unless Analyze finds gaps.
- “Same controls” means shared components or thin wrappers, not a pixel-perfect duplicate of Home chrome (status sentences, due cues can stay Home-only).

## Success criteria

- [ ] Feed has Home-like breast + formula controls; no Formula/Pump amount/Amount (ml) fields; no Pump L/R on Feed.
- [ ] `/baby/pump` exists with Home-like Pump L + R + custom ml; reachable from Baby section nav.
- [ ] Growth fields are one-per-line; Symptoms + Unit match Category control; Amount + Value match Amount style.
- [ ] Diaper uses Home kind buttons; dirty/mixed opens the same modal/sheet pattern as Home.
- [ ] Touched baby page skeletons match live UI.
- [ ] Light + dark still pass design tokens (no hard-coded hex).

## Open questions

- Exact Feed bottle set: confirm Home formula chips + custom ml only (no separate “method” row) — assumed yes.
- Pump nav label and icon: reuse Home pump icon; place near Feed — assumed yes.
- Wet diaper: confirm Home one-tap without sheet — assumed yes; dirty/mixed use sheet.
- Any API/schema change needed for pump-only page — defer to Analyze; default assume reuse existing feed/pump mutations.

## Blocking questions

none — proceed to Gate A with assumptions above; resolve Open questions in Analyze if code disagrees.
