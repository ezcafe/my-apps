# Light repo skim: baby-care-pages-control-parity

**Result:** done
**Updated:** 2026-09-19
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js baby workspace under `app/(shell)/baby/` with capture forms and a rich Home (`components/baby-home.tsx`) that already owns breast/bottle/pump/diaper controls. Money new uses `components/money-transaction-form.tsx` (Category Select + Amount field + quick chips). Shared care chips: `BabyTimedCareChip`, `BabyBottleMlChips`, `BabyCustomMlModal`, `BabyDiaperKindControl`, `BabyDiaperDetailSheet`.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/baby-home.tsx` + bottle/pump/diaper chips/sheets | Source of truth for feed/pump/diaper controls | yes — extract/reuse |
| `components/baby-feed-form.tsx` | Feed: breast+pump timers + Formula/Pump amount + Amount field | replace with Home feed controls; drop pump |
| `components/baby-growth-page.tsx` | Growth form (chips + Field grid) | restyle vs money/new |
| `components/money-transaction-form.tsx` | Category Select + Amount row pattern | yes — pattern |
| `components/baby-page-skeleton.tsx` + `app/(shell)/baby/*/loading.tsx` | Skeletons | update in same change |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| GraphQL `createBabyFeed` / diaper / growth (existing mutations in forms) | Likely reuse; no new entity assumed |
| `lib/baby-breast-timer-store.ts` | Shared breast/pump timer state with Home |
| `lib/app-section-nav.ts` | No `/baby/pump` yet — add capture item |
| `components/baby-diaper-detail-sheet.tsx` | Home dirty/mixed modal — reuse on diaper page |

## Hard constraints (do not fight)

1. DESIGN_GUIDE / semantic tokens; skeleton parity mandatory with UI changes.
2. Reuse Home shared components; do not fork a second timer/diaper UX.
3. Feed must not keep Formula + Pump amount + Amount (ml) fields.
4. Sleep out of scope; Insights/Activities only if shared control reuse forces it.

## Risks if we ignore the repo

- Duplicate pump timer state vs Home → desync.
- Diaper page saves without detail sheet → worse data than Home.
- Growth “looks money” but wrong Category/Amount control → false parity.
- New `/baby/pump` without nav → undiscoverable.
- Skeleton mismatch → CLS.

## Enough for UI concept / Analyze?

yes — primary reuse paths and constraints clear; Analyze should confirm mutation shapes + extract vs wrap for shared chips.
