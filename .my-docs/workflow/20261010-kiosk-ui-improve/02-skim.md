# Light repo skim: 20261010-kiosk-ui-improve

**Result:** done  
**Updated:** 2026-10-10  
**Purpose:** constraints only — not full analysis.

## Project shape (1–3 sentences)

Next.js shell app with core `/kiosk` status board. Server page loads widget-gated data; Settings toggles persist via user preferences. DESIGN_GUIDE defines the glance stack; weather detail is a separate sub-route.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/kiosk/kiosk-dashboard.tsx` (+ skeleton) | strip → metrics → insights → payments | yes — hierarchy |
| `kiosk-*-card.tsx`, `kiosk-context-strip.tsx` | Net/ledger/loans; weather strip | yes — restyle |
| `app/(shell)/kiosk/page.tsx`, `weather/` | RSC entry; weather drill-out | page yes; weather OOS |
| `kiosk-widget-settings.tsx` + `#settings-kiosk` | Toggle widgets | yes if defaults change |
| `docs/DESIGN_GUIDE.md` § Kiosk glance | Status board IA + skeleton parity | hard constraint |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `lib/kiosk/load-kiosk-page.ts` | Server aggregate; enabled widgets only |
| `lib/kiosk/widget-registry.ts` | Defaults: weather, net, payments on |
| `PATCH /api/user/preferences` + `kiosk_widgets` | Prefs; no dedicated kiosk API |
| Money/loans/invest/weather in loader | Reuse; no new data domains |

## Hard constraints (do not fight)

1. Status board, not Money home; no dashboard builder (`DESIGN_GUIDE`).
2. Band order today puts payments (urgency) after metrics/insights.
3. Insights reuse full `*InsightsStats` `variant="page"`.
4. Skeleton must mirror live stack; clean-minimal tokens only.
5. Optional widgets stay opt-in unless Design changes registry.

## Risks if we ignore the repo

Reorder without skeleton/loader updates → CLS/empty bands. Elevating full insights to glance fights DESIGN_GUIDE. New APIs inflate past non-goals.

## Enough for Analyze / Design?

yes — paths and glance constraints clear; loans-only attention / compact insights are Design choices, not skim blockers.
