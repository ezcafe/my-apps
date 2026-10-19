# Light repo skim: 20261019-kiosk-widget-edit-menu

**Result:** done
**Updated:** 2026-10-19
**Purpose:** constraints only — ground Analyze / Design. Not full analysis.

## Project shape (1–3 sentences)

Next.js shell: `/kiosk` glance board from `lib/kiosk/widget-registry.ts` + `load-kiosk-page.ts`. Prefs today = Settings on/off (`kiosk_widgets`) + board chrome (`kiosk_layout` mode/columns/focus) via ADR-003 PATCH — no edit mode, per-cell size, or multi-signal Source. Cells map 1:1 to fixed registry ids and cards.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `app/(shell)/kiosk/page.tsx`, `kiosk-dashboard.tsx` | Board by enabled ids | Edit chrome + cell menu |
| `kiosk-widget-settings.tsx`, settings page | On/off + layout | Keep; do not replace |
| `kiosk-*-card.tsx`, `kiosk-dashboard-skeleton.tsx` | Cell UI + CLS | Overlay + skeleton parity |
| `components/ui/more-menu.tsx`, `popover.tsx` | Secondary menu | Resize/Source shell |
| `e2e/kiosk-layout.spec.ts` | Prefs layout persist | Extend / sibling edit e2e |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `GET/PATCH /api/user/preferences` | Auth, same-origin; Zod `lib/validators/user-preferences.ts` |
| `db/schema/user-preferences.ts` | `kiosk_widgets` + `kiosk_layout` only — no cell size/sources |
| `lib/kiosk/kiosk-layout.ts` | `{ mode, columns, focusWidgetId }` — no cell footprint |
| `lib/kiosk/widget-registry.ts` | Fixed ids/groups; money ≠ bills/savings/investments |
| ADR-003, DESIGN_GUIDE § Kiosk | Prefs story; board ≠ freeform builder |

## Hard constraints (do not fight)

1. DESIGN_GUIDE: glance board, not drag-drop / freeform — bounded menu only.
2. Persist via same prefs PATCH (ADR-003); extend schema/validators carefully.
3. Registry groups finer than product topics; v1 money = core money only.
4. Skeleton / edit-overlay parity when cell chrome or footprint changes.
5. Weather / context stay Settings-only (no Resize/Source in v1).

## Risks if we ignore the repo

Prefs drift; Source as whole-widget swap; builder creep; CLS without skeleton; cross-topic if Zod skips.

## Enough for Analyze / Design?

yes — Gate A ok. Analyze still: prefs shape for size + sources; signal catalog vs registry ids; size vs `columns`.

## Proposed Verify (for 00-run.md)

- **cwd:** `/Users/ptquang86/ws/my-apps`
- **build:** `npm run build`
- **unit:** `npm test -- lib/kiosk/ components/kiosk/ lib/validators/user-preferences`
- **e2e:** `npm run test:e2e -- e2e/kiosk-layout.spec.ts`
