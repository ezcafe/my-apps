# Light repo skim: drawer-nav-assessment

**Result:** done

## Project shape

Next.js multi-app shell: desktop icon rail (`app-shell.tsx`) + mobile hamburger drawer (`MoneyAppMenu` in `money-section-tabs.tsx`). Section IA lives in `lib/app-section-nav.ts` (groups defined; drawer UI flat today). Shell destinations in `lib/features/registry.ts`.

## Related UI (paths)

| Path | Role |
|------|------|
| `components/money-section-tabs.tsx` | `MoneyAppMenu` popover drawer (primary redesign surface) |
| `components/app-shell.tsx` | Mounts drawer `<lg`; desktop rail |
| `lib/app-section-nav.ts` | Apps, items, `AppNavGroup`, visibility |
| `lib/features/registry.ts` | Shell items (Kiosk, Help, Settings) |
| `e2e/helpers/shell.ts` | `openAppMenu` / `appMenuPanel` |
| `e2e/baby-care.spec.ts` | Many hamburger nav asserts |

## Related APIs / data

| Path | Role |
|------|------|
| None new expected | Client nav config only; session for auth row |

## Hard constraints

- DESIGN_GUIDE / clean-minimal: tokens, `rounded-[var(--radius-sm)]` rows, ≥44 hits, no hard hex in product code
- Close-on-navigate via `deferMenuClose` (soft-nav race); Kiosk hard navigates
- Optional Money tabs via `visibilityKey` / `isTabVisible`
- E2E helpers + baby hamburger tests must stay green or update with IA
- Groups already in data (`APP_NAV_GROUP_*`) — UI does not render them yet

## Risks if ignored

- Flat list stays → navigation budget unchanged
- Break e2e menu open/find links → CI red
- Desktop rail drifts from drawer labels/order → mental-model split

## Enough for UI concept / Analyze?

yes — propose grouped drawer HTML on real popover chrome; Analyze maps full inventory + low-value rank.
