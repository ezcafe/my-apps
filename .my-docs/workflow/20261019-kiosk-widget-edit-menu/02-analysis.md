# Analysis: Kiosk widget edit menu (resize + same-topic sources)

**Size:** Prefer bullets. ≤5 solution pieces. Stay within artifact size caps.

## Deep dive (required)

### Overall

#### What is this?
Add **Edit / Done** on `/kiosk` and a **top-right per-cell menu** (money | loan | baby care only) with **Resize** (≤4 predefined sizes) and **Source** (1–3 same-topic **signals**). Persist via the existing preferences story. Aligns with Core problem: cells are not tunable on the board today.

#### Why do we need this?
Users leave glance flow for Settings to swap whole widgets when they only need different signals or footprint. Board density stays board-wide (`columns`); fixed registry compositions leave unused fields. Skipping keeps Settings round-trips and wrong density.

#### How to do this?
Extend prefs + Zod; add board edit chrome and cell menus on money/loan/baby cells; map picks to size + signal list; block cross-topic on UI and save. Weather/context stay Settings-only.
- **Other ways:** Settings-only size/source forms (no on-board Edit); or whole-widget swap in the menu (rejected by Gate A — Source = signals).
- **Best practices:** ADR-003 same PATCH; DESIGN_GUIDE glance board (bounded menu, not builder); `MoreMenu`/`Popover` for secondary actions; skeleton/edit-overlay parity; Zod reject invalid mixes.

#### Solution branches (from Core problem)

| Branch | Options (bullets) | Effort / risk | Feeds Design? |
|--------|-------------------|---------------|---------------|
| **1. Quick wins** | Edit/Done chrome only; Settings forms for size/source; docs note on “not a builder” | Low / incomplete metric | later |
| **2. Systemic fixes** ★ | Prefs overlay per cell id + on-board Resize/Source; signal catalog + topic map; Zod same-topic | Med / prefs + render | yes → Option 1 |
| **3. Creative / lateral** | Generic shell cells (instance = topic + sources + size); registry → signal catalog only | High / migrate cells | yes → Option 2 |

- **★ Priority branch for this pass:** Systemic (on-board menu + prefs overlay; keep registry cell ids).
- **Map to Design:** Option 1 = systemic overlay; Option 2 = creative shell. Quick wins → early tasks (Edit chrome) or Non-goals if Settings-only deferred.

### Solution pieces

#### 1. Prefs / API / schema

##### What is this?
Store per-cell **size** + **source signal ids** beside existing `kiosk_widgets` / `kiosk_layout`; validate on PATCH.

##### Why do we need this?
Reload must keep edits; invalid cross-topic must fail at the contract.

##### How to do this?
- Approach: Nest cell overrides in `kiosk_layout` jsonb as `cells` (ADR-005); extend `kioskLayoutSchema` / patch schema + types in `user-preferences`.
- Other ways: LocalStorage only (rejected by ADR-003).
- Best practices: Same authenticated `PATCH /api/user/preferences`; resolve defaults when missing; Zod max 3 sources + topic membership.

#### 2. Signal catalog + same-topic rule

##### What is this?
Stable ids/labels for glance **signals** per topic (money | loan | baby care); money ≠ bills/savings/investments in v1.

##### Why do we need this?
Source is not a registry widget swap; UI and save need one vocabulary.

##### How to do this?
- Approach: New small catalog (e.g. `lib/kiosk/signal-catalog.ts`) mapped from existing card metrics (loan remaining/obligation/next due; money spend/income/net; baby feed/nap/diaper).
- Other ways: Reuse `KioskWidgetId` as “sources” (fights Gate A).
- Best practices: Topic enum + membership set; picker starts on current topic.

#### 3. Board edit chrome + cell menu (UI)

##### What is this?
Edit/Done on board chrome; top-right control → Resize | Source on money/loan/baby cells only.

##### Why do we need this?
Day-to-day path without Settings; glance stays quiet when not editing.

##### How to do this?
- Approach: Client edit flag on dashboard; `MoreMenu`/`Popover` overlay; wire save like `kiosk-widget-settings` PATCH; skeleton parity for overlay + footprint.
- Other ways: Always-on hover (rejected — wall safety); Settings-only.
- Best practices: `fx-hit-40` / `iconOnly`; DESIGN_GUIDE quiet chrome after Done; core-header CTA optional for Edit/Done.

#### 4. Resize model vs board columns

##### What is this?
≤4 predefined footprints applied per cell without freeform layout.

##### Why do we need this?
Per-cell density without rebuilding the board.

##### How to do this?
- Approach: Size tokens (e.g. S/M/L/XL) → CSS grid span / min-height tokens under current `columns` + container queries.
- Other ways: Only change board `columns` (does not meet per-cell ask).
- Best practices: Cap ≤4; e-ink cards must stay readable at smallest size.

#### 5. Cell render / composition

##### What is this?
How a tuned cell paints 1–3 signals (and size) instead of always the fixed registry card body.

##### Why do we need this?
Source picks must change what the cell shows.

##### How to do this?
- Approach (★): Keep `KioskWidgetId` cell; filter/compose metrics inside existing card families by source ids.
- Other ways: Generic shell that ignores registry composition (Option 2).
- Best practices: Defaults = today’s composition until tuned; weather/context unchanged.

## What exists today

`/kiosk` maps enabled registry ids 1:1 to fixed cards (`kiosk-dashboard.tsx`). Prefs = `kiosk_widgets` + `kiosk_layout` `{ mode, columns, focusWidgetId }` via ADR-003 — no edit mode, size, or sources. Settings owns on/off + board chrome.

## Dependencies

- Keep Settings toggles + layout; extend, do not rip out.
- Docs/glossary still say “not a builder” / avoid per-widget size — follow-up after Gate A (non-blocking).
- Loader (`load-kiosk-page.ts`) may need to pass cell overrides into cards.
- E2e: extend `kiosk-layout.spec.ts` or sibling edit flow.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/kiosk/kiosk-dashboard.tsx` | Board cells; add Edit chrome + menu |
| `components/kiosk/kiosk-widget-settings.tsx` | PATCH prefs pattern |
| `components/ui/more-menu.tsx` | Menu shell |
| `lib/kiosk/widget-registry.ts` | Ids/groups; topic ≠ group |
| `lib/kiosk/kiosk-layout.ts` | Layout type to extend |
| `lib/validators/user-preferences.ts` | Zod contract |
| `db/schema/user-preferences.ts` | jsonb prefs |
| `docs/decisions/ADR-003-…` | Prefs persistence |
| `docs/DESIGN_GUIDE.md` § Kiosk | Glance / non-builder |
| `e2e/kiosk-layout.spec.ts` | Persist surface |
| `components/kiosk/kiosk-dashboard-skeleton.tsx` | CLS parity |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Preferences PATCH + notify | `kiosk-widget-settings.tsx` | Same save/feedback story |
| MoreMenu / Popover | `components/ui/more-menu.tsx` | Bounded secondary actions |
| Registry + normalize | `widget-registry.ts` | Known ids; topic map beside |
| Layout resolve defaults | `kiosk-layout.ts` `resolveKioskLayout` | Missing overrides → defaults |
| Skeleton parity | `kiosk-dashboard-skeleton.tsx` | Edit overlay / size CLS |
| `data-kiosk-cell` | dashboard sections | Test hooks / targeting |

## System shape candidates (prefer in Design)

| Shape / concept | Where it lives | Why Design should teach it |
|-----------------|----------------|----------------------------|
| ADR-003 prefs board | user_preferences jsonb | One persistence story |
| Glance board ≠ builder | DESIGN_GUIDE | Bounds Resize/Source |
| Overlay vs shell cell | Analyze Option 1/2 | Core model fork |
| Topic vs feature group | registry `feature` | Same-topic validation |
| Signal catalog | new (proposed) | Source ≠ widget id |

## Constraints and risks

- Hard: bounded menu only; same PATCH; money topic = core money only; weather/context out; skeleton parity.
- Risk: Source misread as widget swap; tiny sizes vs e-ink; accidental Edit on wall; prefs drift if Zod weak; builder creep.

## Settled decisions (do not relitigate)

- Edit/Done enter/exit; Source = signals 1–3; same-topic money|loan|baby; Resize ≤4 predefined; weather/context Settings-only; no drag/freeform; keep Settings on/off + layout.
- **Grill:** Cell model = registry-id **overlay** (not generic shell in v1).
- **Grill:** Prefs = nest `cells` overrides in `kioskLayout` jsonb (ADR-005); no new column.
- **Grill:** Edit/Done on **board strip** (not header CTA).
- **Grill:** Signal catalog **drafted in Design** from idea examples + card metrics; lock ids in tasks/Build.
- **Grill:** Size = ≤4 **S/M/L/XL** span/min-height tokens under board `columns`; default M; fullscreen ignores footprint display but still stores size.
- **Grill edges:** same-topic picker lock; overrides kept when widget off; fullscreen ignores size display.

## Design tree (frontier)

### Settled
- Gate A 80/20; Core problem; Non-goals; ADR-003 + ADR-005; topics/membership; overlay; nest prefs; board Edit/Done; catalog draft-in-Design; size tokens; edge rules.

### Open frontier
- (empty — Grill Result frontier-empty)

### Blocked
- None (docs/DESIGN_GUIDE glossary follow-up still non-blocking for Design).

**Grill recommended?** done — frontier empty; proceed to Design.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| N/A | — | No throwaway spike this pass | — |

## Parent flags (for 00-run.md)

| Flag | Value | Note |
|------|-------|------|
| **Has API** | **yes** | Extend `PATCH /api/user/preferences` (+ GET shape) |
| **Has DB** | **yes** | Extend jsonb prefs type / optional column + migration if new key |
| **Has auth/PII/schema** | **no** | Same auth’d prefs; no new trust boundary |

## Verify commands (confirm / refine)

- **cwd:** `/Users/ptquang86/ws/my-apps`
- **build:** `npm run build`
- **unit:** `npm test -- lib/kiosk/ components/kiosk/ lib/validators/user-preferences`
- **e2e:** `npm run test:e2e -- e2e/kiosk-layout.spec.ts`  
  (Design may add a sibling edit e2e; keep this until then.)

## Blocking questions

1. Overlay vs shell → **Settled: overlay** (Grill).
2. Nest vs new column → **Settled: nest in `kioskLayout`** (ADR-005).
3. Catalog lock timing → **Settled: draft in Design** from idea examples.

## Clear to grill / design?

**yes** for Design — frontier empty after Grill; Option 1 (overlay) is the v1 path; Option 2 (shell) remains the rejected / later alternative in Design docs.
