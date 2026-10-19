# Grill: 20261019-kiosk-widget-edit-menu

**Result:** frontier-empty
**Updated:** 2026-10-19
**HITL:** async-notify — from **HITL Grill** in `00-run.md`
**Size:** ≤ ~60 lines

## Design tree summary

- **Settled:** Overlay on registry cell ids; nest cell overrides in `kioskLayout`; Edit/Done on board strip; catalog draft from idea examples; size = ≤4 span/height tokens under `columns`; edges below.
- **Open frontier:** (empty)
- **Blocked:** none

## Frontier round 1

❓ **Q1** — **Cell model**: Overlay on existing `KioskWidgetId` cells (compose/filter signals inside card families) **or** generic shell cells (instance = topic + sources + size)?

➡️ Recommended: Overlay — user-first: keeps Settings on/off 1:1 and avoids cell migration.

**Settled as:** Overlay (auto-pick) — rationale: Gate A Source=signals; Systemic ★; shell = Option 2 later.

---

❓ **Q2** — **Edit/Done chrome**: Board strip on `/kiosk` **or** shell header CTA (`core-app-header`)?

➡️ Recommended: Board strip — user-first: edit stays next to cells; header stays glance-quiet (`cta: null` today).

**Settled as:** Board strip (auto-pick) — rationale: idea “board chrome”; wall safety; header shared.

## Frontier round 2

❓ **Q3** — **Prefs shape**: Nest per-cell overrides inside `kioskLayout` jsonb **or** new `kiosk_cells` column?

➡️ Recommended: Nest under `kioskLayout.cells` keyed by widget id — user-first: same PATCH/ADR-003; no new column.

**Settled as:** Nest in `kioskLayout` (auto-pick) — rationale: jsonb already holds layout + ADR-004 flag; Zod extends one object.

---

❓ **Q4** — **Signal catalog**: Lock final ids/labels before Design **or** Design drafts from idea examples + card metrics?

➡️ Recommended: Draft in Design from examples — user-first: unblock Option 1/2; lock ids in tasks/Build.

**Settled as:** Draft in Design (auto-pick) — rationale: examples + cards enough; labels polish later.

---

❓ **Q5** — **Size tokens**: How do ≤4 sizes relate to board `columns`?

➡️ Recommended: Named tokens (S/M/L/XL) → grid span + min-height under current `columns`; default M; not free px.

**Settled as:** Span/height tokens (auto-pick) — rationale: per-cell density without freeform; e-ink readability at S.

## Edge scenarios

| Scenario | Outcome / rule locked |
|----------|------------------------|
| Add loan signal after two money picks | Picker stays on current topic; other topics hidden/disabled; Zod rejects cross-topic. |
| Widget off in Settings while overrides exist | Keep overrides; ignored while off; re-enable restores last size/sources. |
| Fullscreen + resized cell | Store size always; fullscreen ignores footprint; grid uses stored size. |

## Domain modeling

### Glossary updates
- Kiosk edit mode, Kiosk data source, Kiosk cell override, Kiosk cell size; clarify Kiosk layout mode `_Avoid_`
- Paths touched: `GLOSSARY.md`

### ADR
- **Wrote:** `docs/decisions/ADR-005-kiosk-cell-overrides-in-layout.md` — nest overrides in `kiosk_layout` (3-part bar: hard prefs shape, surprising “layout” holds sources, nest vs new column).

## Auto-pick log

- `auto-pick — Q1 → Overlay — user-first: Settings 1:1; system: Gate A signals`
- `auto-pick — Q2 → Board strip — user-first: edit beside cells; system: header cta null`
- `auto-pick — Q3 → Nest kioskLayout.cells — user-first: one PATCH; system: ADR-003`
- `auto-pick — Q4 → Draft catalog in Design — user-first: unblock; system: examples OK`
- `auto-pick — Q5 → S/M/L/XL span tokens — user-first: readable density; system: ≤4`

## Grill digest (≤4 bullets)

1. Overlay + nest `kioskLayout.cells` + board Edit/Done; sizes = S–XL tokens; catalog drafts in Design.
2. Residual risk: tiny S vs e-ink cards; Design must prove readable spans.
3. Glossary + ADR-005 touched.
4. Ready for Design? yes
