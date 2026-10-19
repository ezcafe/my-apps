# Light repo skim: 20261019-remove-kiosk

**Result:** done
**Updated:** 2026-10-19
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Analyze / Design in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js shell with core nav (Kiosk, Settings) plus Money/Baby workspaces. Kiosk spans routes, `components/kiosk` + `lib/kiosk`, prefs, Settings UI, e2e, and ADRs. Weather day UI and city prefs are only wired through kiosk paths today.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `app/(shell)/kiosk/*` | Board + weather day | Delete (+ redirect) |
| `components/kiosk/*`, `lib/kiosk/*` | Widgets, Settings, loaders | Delete unless named keep |
| `app/(shell)/settings/page.tsx` | Kiosk + weather city blocks | Strip; keep other prefs |
| `lib/features/registry.ts`, `lib/core-app-header.ts` | Nav + crumbs | Remove kiosk entries |
| `components/weather/*`, `lib/weather/*` | Day chart / Open-Meteo | Drop with kiosk (Gate A) |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `app/api/user/preferences/route.ts` | PATCH kiosk + weather fields |
| `…/preferences/city-search/route.ts` | Geocode for weather city |
| `db/schema/user-preferences.ts` | `kiosk_*` + `weather_*` columns |
| `db/migrations/0036_*`, `0048_*` | Drop targets (+ weather cols) |
| ADRs 003–005; `e2e/kiosk-*.spec.ts` | Retire with feature |

## Hard constraints (do not fight)

1. No `WorkspaceAppKey` on core — do not break Money/Baby bootstrap (`docs/ARCHITECTURE.md`).
2. Shared prefs PATCH — drop kiosk/weather fields without breaking theme/account validators.
3. Gate A: drop weather with kiosk unless another consumer; redirect `/kiosk` → Money; layout loss OK.
4. Uncommitted kiosk WIP on `main` — Design inventories keep vs delete vs discard.
5. Auth: `/kiosk` omitted from proxy matcher (`auth.ts`) — clean up with routes.

## Risks if we ignore the repo

Settings still imports kiosk modules → runtime break. Orphan prefs/API/CSS (`.kiosk-*` in `globals.css`). Dead city-search. Nav/crumbs to gone URLs. Ghost DB columns.

## Enough for Analyze / Design?

yes — paths + Gate A weather/redirect calls enough; Analyze confirms no non-kiosk consumers and inventories WIP keepers.
