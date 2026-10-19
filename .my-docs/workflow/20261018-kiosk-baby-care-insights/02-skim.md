# Light repo skim: 20261018-kiosk-baby-care-insights

**Result:** done
**Updated:** 2026-10-18
**Size:** ≤ ~40 lines — constraints only (not full analysis)

## Project shape (1–3 sentences)

Next.js `/kiosk` is a registry status board (`lib/kiosk/widget-registry.ts`) with prefs/layout (ADR-003). Money e-ink cells ship dither + footer; **no baby feature group or ids**. Baby Care (`/baby`) has home quick status + timeline loaders — not wired into `load-kiosk-page`.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/kiosk/kiosk-{dashboard,insights-*-card,insights-footer,widget-settings,*-skeleton*}.tsx` | Board, money e-ink, toggles, CLS | yes — pattern; leave money cells |
| `app/(shell)/kiosk/{page,loading}.tsx` | Route + default skeleton | yes |
| `app/globals.css` (`.kiosk-eink*`); DESIGN_GUIDE § Kiosk; `refs/*.png` | Dither/footer; board rules; fidelity | extend CSS; match PNGs |
| `components/baby-home.tsx` + `/baby` | Caregiver home glance | data remap only |
| `e2e/kiosk-layout.spec.ts` | Prefs → `/kiosk` | extend for baby / inject |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `lib/kiosk/widget-registry.ts` (+ test) | `resolve`: null→defaults; stored→normalize (**no inject**; money tests lock) |
| `lib/kiosk/load-kiosk-page.ts` | Widget-gated; no baby branch |
| `GET/PATCH /api/user/preferences` + validators + ADR-003 | `kioskWidgets` enum = registry |
| `features/baby/server/{home-quick-status,timeline,profile}.ts` | Status / sleep / last care / name-age |
| `lib/baby-care-guideline-content.ts` | Guide text — **not** timed schedule |

## Hard constraints (do not fight)

1. **Status board** — DESIGN_GUIDE § Kiosk; glance-only; no in-cell log/timers.
2. **Registry + Zod** — three baby ids, `defaultEnabled: true`, Baby Settings group; prefs max follows ids.
3. **One-time inject** of those three into stored lists that omit them (Gate A); `[]` stays empty.
4. **100% e-ink vs refs** — reuse `.kiosk-eink*` / footer; skeleton parity; monochrome cells.
5. **Prefer no new API/DB** — baby loaders + local Funny Time quotes; schedule may hide.

## Risks if we ignore the repo

Theme-tinted cells; invent schedule API; skip Zod → PATCH break; no inject → no day-one glance; booking copy; CLS; fight money no-inject without a baby-scoped rule.

## Enough for Analyze / Design?

yes — Gate A ok. Analyze still: next-care SoT; schedule pill vs hide; inject persist shape; footer labels.
