# Light repo skim: baby-care-pump-lr-timer

**Result:** done
**Updated:** 2026-09-19
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js Baby workspace under `app/(shell)/baby/` (GraphQL care/growth). Home one-tap is `components/baby-home.tsx` (local breast timer + done-flash); `/baby/feed|sleep|diaper` use chip forms with no Save. Feed has one `method: "pump"`; Growth also has kind `pump` (amount/unit) on `/baby/growth`.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/baby-home.tsx` + `baby-quick-value-card.tsx` | Care rows, breast L/R timer, bottle, nap/diaper, done-flash | yes — rows + Pump L/R/amount + copy |
| `components/baby-feed-form.tsx` (+ sleep/diaper) | Method/kind chips → create; one-tap (`baby-care-one-tap.test.ts`) | yes — Pump L/R + timer/Done parity |
| `components/baby-bottle-ml-chips.tsx` | Bottle amount + done-flash | yes — Pump amount pattern |
| `components/baby-growth-page.tsx` + `lib/baby-growth-page-chips.ts` | Growth chips include `pump` first | yes — remove Pump from capture UI |
| `messages/baby/{en,vi}.ts` | `tapToStart` / `tapToSave` / `done`; `feed.pump`; `growth.pump` | yes — Tap to stop + L/R + amount |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `lib/baby-breast-timer-store.ts` | `baby.breastTimer.v1`; sides **`breast_l\|breast_r` only** |
| `lib/baby-home-done-flash.ts` + `lib/baby-quick-care-plan.ts` | ~2s Done flash; stop clears breast timer |
| `lib/baby-feed-session.ts` + `lib/validators/baby.ts` | Methods: `breast_l\|breast_r\|formula\|pump` |
| `features/baby/server/quick-care.ts` + `care-events.ts` | Home quick + care event writes |
| `db/schema/baby.ts` + growth Zod | Growth enum includes `pump`; Insights still map it |

## Hard constraints (do not fight)

1. Running chips use `home.tapToSave` (“Tap to save”) while elapsed — need **Tap to stop** until stop; **Done** only after stop (done-flash).
2. Breast timer store cannot hold pump sides without extend/new key — no second ad-hoc timer API.
3. Feed `pump` ≠ Growth `pump` — L/R on home/feed; drop Growth pump chip (legacy label-only OK).
4. New feed sides need validators + care payload + i18n (+ telegram `/feed …pump`) — not UI-only.
5. Gate A locks: home+feed Pump L/R; stop = duration-only; Pump amount Bottle-like; logs match home one-tap spirit.

## Risks if we ignore the repo

Dual Growth+feed pump entry; half-fixed “save/Done” while running; breast-only timer loses pump sessions; skip schema/i18n/telegram → Insights/bot break; forms keep Save-like chrome → night parity fails.

## Enough for UI concept / Analyze?

yes — lean UI concept reuses home breast/Bottle chips; Analyze settles pump L/R method names, timer-store shape, Growth pump UI removal vs history.
