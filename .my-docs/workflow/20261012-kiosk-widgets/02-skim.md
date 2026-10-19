# Light repo skim: 20261012-kiosk-widgets

**Result:** done
**Updated:** 2026-10-13
**Purpose:** constraints only — ground Analyze / Design. Not full analysis.

## Project shape (1–3 sentences)

Next.js shell app: `/kiosk` is a glance board from `lib/kiosk/widget-registry.ts` + server payloads in `lib/kiosk/load-kiosk-page.ts`. Settings PATCH `kioskWidgets` via `/api/user/preferences` into `user_preferences.kiosk_widgets` — on/off only; `kiosk-dashboard.tsx` uses a fixed band stack. No layout/fullscreen prefs; money glance is small cards, not a combined month board.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `app/(shell)/kiosk/page.tsx`, `components/kiosk/kiosk-dashboard.tsx` | Fixed-band board | Extend layout |
| `components/kiosk/kiosk-widget-settings.tsx`, settings page | Widget toggles | + layout/focus |
| `kiosk-*-card.tsx`, `kiosk-dashboard-skeleton.tsx`, `kiosk/loading.tsx` | Cards + CLS skeleton | Keep optional; match new layout |
| `budget-vs-actual-card.tsx`, DESIGN_GUIDE § Kiosk | Budget viz cue; glance ≠ builder | Chart pattern + UX bound |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `GET/PATCH /api/user/preferences` | Auth, same-origin PATCH, rate limit; widgets only today |
| `db/schema/user-preferences.ts`, `0036_kiosk_widgets.sql` | JSONB widgets — layout needs schema/validator |
| `lib/kiosk/load-kiosk-page.ts` | Weather + analytics/loans/investments by enabled ids |
| `lib/money-services/analytics.ts`, `budgets.ts` | Month net/income/expense; budget for new widget |
| `lib/validators/user-preferences.ts` | Zod registry id cap |

## Hard constraints (do not fight)

1. DESIGN_GUIDE: status board, not drag-drop / freeform builder.
2. Ids/defaults/order in `widget-registry.ts`; prefs normalize to that order.
3. Skeleton parity required when board layout changes.
4. Prefs API auth/same-origin/rate-limit — extend patch shape carefully.
5. Finance loads stay workspace-scoped via `load-kiosk-page` patterns.

## Risks if we ignore the repo

Settings vs board drift; builder scope creep; duplicate money cards if defaults unchanged; CLS without skeleton update.

## Enough for Analyze / Design?

yes — Gate A ok. Analyze still: layout sync (prefs vs local), budget definition, default layout name (idea leans grid-1/stack).
