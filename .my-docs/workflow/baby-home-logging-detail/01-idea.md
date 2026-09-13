# Idea: Baby home logging detail polish

## Problem

Option B quick-care home (from `baby-home-redesign`) already lets caregivers log breast, bottle, nap, and diaper in a few taps. Several details still hurt at 3AM:

1. **Vietnamese next-due** reads awkwardly (`còn {duration}` with compact `5m`) instead of a clear “next time in xx minutes.”
2. **Bottle log row** does not match **Start nap** height; bottle ± are not **stacked on the right** at half height each; face copy is noisy (band competing with next-due); Custom reads as a fourth primary; no brief Done/Logged after save. **Diaper** still uses a value-card + cycle/steppers — it should become one **2×2 Kind tile grid** (Wet | Poop / Mixed | Dry) at nap/bottle height (no diaper ↑↓; **not** a 1×4 strip).
3. **Diaper logging is thin**: only `wet | dirty | mixed`. Caregivers cannot pick kind in one clear tap (including Dry), or record color, texture, and amount when there is poop — data that matters for meconium, diarrhea, constipation, and red-flag stools.
4. **Last-care row** does not show the last formula/bottle amount (ml), so caregivers cannot glance at “how much last time.”
5. **Remaining / suggested ml on log-feed controls** should follow clearer age bands (and optionally a weight-based pediatric guide for under 6 months). Today’s age guide bands do not match the requested ranges; weight is not on the baby profile (only growth entries).

Today’s diaper payload only stores `kind: wet | dirty | mixed` — richer logging needs payload / API / schema work called out in Design (not invented here).

## User / audience

Primary: a tired caregiver (often mother) logging care one-handed at night in English or Vietnamese.

Secondary: another caregiver in the same family workspace who needs the same clear last-feed amount and diaper detail later.

## Outcome

What “done” looks like:

- **VI next-due** for minutes reads like **“lần tiếp theo trong xx phút”** (EN stays clear, e.g. “next in xx min” or equivalent).
- **Bottle (B1):** Tall log button matches **Start nap** height; **+/− stacked on the RIGHT** at **50% height each**. **Hero = ml amount**; **subtitle quieter** (prefer **next-due** over age-band on the face). **Custom demoted** to text under the card (not a fourth primary). Brief **Done/Logged** flash **~2s** after successful save.
- **Diaper has no ↑↓ / ± steppers** — one Kind control at nap/bottle height as a **2×2 tile grid** (Wet | Poop / Mixed | Dry) — **not** a 1×4 horizontal strip. Icons + short labels OK; **full names in `aria-label`**.
- **Diaper UX (settled — D2 / W1 / S1 + D-A layout):**
  - **D2:** Kind tiles + **Step 2 sheet** (not a progressive 4-phase single-value button).
  - **S1:** **Wet** / **Dry** → instant save (kind only) → brief Done feedback OK → ready again; **Poop Only** / **Mixed** → open Step 2 (sheet unchanged).
  - **W1:** Step 2 keeps a **local draft** on the sheet; **one** `babyQuickCare` at Save (no mid-sheet server writes).
  - **D-A:** Kind = **2×2 grid of four tiles** inside one diaper control at nap/bottle height.
- **Step 2 sheet** (Poop / Mixed): color swatches (incl. red-flag White/Pale and Red/Bloody), texture chips (incl. **watery / hard** in-sheet caution copy — same spirit as color red-flags: **warn labels + store `texture`**; **no Insights alerts**), amount **Smear → Medium → Blowout**. Design spells payload / API / schema beyond today’s `wet|dirty|mixed` (+ `dry`).
- **Row 3 last-care** shows **last ml** for formula / last feed amount when known.
- **Remaining / suggested ml** on **bottle** uses the age guide bands below (guidelines only; wet-diaper / weight-gain caveats noted in UI or copy — **not** competing as loud face copy; prefer next-due on the card face). Weight-based daily ml (kg×150–160 ÷ feeds/day) when latest growth weight exists.

### Age guide bands (target for this pass)

| Age | Per-feed ml (guide) | Feeds/day (guide) |
|-----|---------------------|-------------------|
| 1–2 days | 5–15 | (existing cadence guide as applicable) |
| 3–7 days | 30–60 | |
| 2–4 weeks | 60–90 | |
| 1–3 mo | 90–150 | ~6–8 |
| 3–6 mo | 120–180 | ~5–6 |
| 6–12 mo | 180–240 | ~3–4 milk feeds |

Optional under 6 mo when weight is available: total daily ml ≈ weight(kg)×150 (up to 160); per feed ≈ total ÷ feeds/day. **Guidelines only** — not medical advice; note wet-diaper count and weight-gain caveats.

## Metric

In a low-light check: Wet/Dry save kind-only in ~1s with brief Done feedback (no Step 2); Poop/Mixed open the sheet, draft locally, and save once; the **2×2 Kind tile grid** matches Start nap / bottle height (not a 1×4 strip); bottle shows **ml as hero**, quiet next-due subtitle, stacked right ±, demoted Custom, and ~2s Done/Logged after save; a Vietnamese caregiver understands next-due without guessing `5m`; last ml appears on row 3 when the last bottle/formula amount exists.

## Non-goals

What we will **not** build in this pass:

- Merging or finishing Gate 3 for `baby-home-redesign` (paused; this pass builds on that work).
- A medical diagnosis tool, doctor chat, or alerts that claim clinical certainty.
- Charts, full timeline redesign, or replacing the existing full diaper/feed forms beyond what home needs.
- Telegram logging changes unless Design proves a hard dependency.
- Live multi-device timer sync (already out of home redesign).
- Undo after quick save.
- Pump-only or solid-food logging on home.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Caregivers want richer poop detail on home (color/texture/amount), not only on the full form | Yes for Step 2 scope | Ask user; compare to current full diaper form usage | Keep Kind-only on home; defer sheet |
| Mapping UI “Poop Only” → existing `dirty` (or rename) is acceptable | Yes for schema continuity | Ask user; check validators + i18n | New enum value or display-only rename |
| “Dry” belongs on home Kind row in this pass | Open | Ask user (blocking) | Hide Dry or save as notes-only / skip |
| Weight for pediatric ml can come from latest `baby_growth_entry` weight (profile has no weight field) | Only if weight formula is in scope | Ask user (blocking) | Age bands only; no kg×150 |
| “Remaining ml” means suggested band / default on the bottle control (not a daily remaining budget) | Likely | Ask user | Need daily total tracking UX |
| Breast feed buttons do not need remaining-ml treatment (no amountMl) | Open | Ask user (blocking) | Show duration guide or hide ml on breast |
| Amount is required before save on Poop/Mixed | Open | Ask user (blocking) | Allow save with color/texture only |
| Compact EN duration (`5m`) can stay if the sentence is clear; VI must use “phút” | Yes for VI | Quick copy review | Change duration formatter per locale |

## What we should not build

- Hard medical red-flag notifications that page a clinician.
- Replacing Measure / growth entry flows just to store weight on profile (unless Gate 1 chooses that).
- Redesigning rows 1–2 care order or nap/breast timer behavior from redesign.

## Success criteria

- [ ] Vietnamese next-due for a minutes-ahead feed/diaper/nap reads as **“lần tiếp theo trong xx phút”** (or agreed equivalent); EN remains clear.
- [ ] **B1 bottle:** log matches Start nap height; **+/− stacked on the right** at 50% height each; **hero = ml**; quieter subtitle prefers **next-due** over band on face; **Custom** is demoted text under the card; brief **Done/Logged ~2s** after successful save.
- [ ] **D-A diaper:** one Kind control is a **2×2 tile grid** (Wet | Poop / Mixed | Dry) at nap/bottle height — **not** a 1×4 strip; **no** diaper ↑↓ / ±; icons + short labels OK with full names in `aria-label`.
- [ ] Kind tiles: Wet / Dry instant save (kind only) + brief Done; Poop Only / Mixed open Step 2 (unchanged); local draft on sheet; one `babyQuickCare` at Save (**D2 / W1 / S1**).
- [ ] Step 2 has color swatches, texture chips, and amount Smear → Medium → Blowout (amount optional, default Medium); Design documents schema/API beyond `wet|dirty|mixed` (+ `dry`).
- [ ] Row 3 shows last logged ml when the last feed has `amountMl`.
- [ ] Log-feed suggested/remaining ml on **bottle only** follows the age bands above; when latest growth weight exists (under 6 mo), also offer kg×150–160 ÷ feeds/day; copy marks guidelines + wet-diaper / weight-gain caveats (band not loud on card face).
- [ ] EN + VI strings cover new Kind / Step 2 / Done-Logged labels; light and dark UI still follow the design guide.
- [ ] Unit/e2e coverage exists for copy, layout contracts that tests can assert (B1 + 2×2 Kind + skeleton), richer diaper save paths, and last-ml display.

## Settled after Gate 1

| # | Pick | Decision |
|---|------|----------|
| 1 | A | **Dry** is a 4th Kind; tap **instant-saves** like Wet Only (new kind in schema/API). |
| 2 | A | Weight guide uses **latest growth weight** entry when present; no new profile weight field. |
| 3 | A | Keep storage `wet \| dirty \| mixed` (+ `dry`); UI label **Poop Only** for `dirty`. |
| 4 | A | Suggested / remaining ml on **bottle/formula only** — not breast. |
| 5 | B | Poop/Mixed **amount optional**; default **Medium** if skipped. |

## Settled after Gate 1 / outcome (diaper UX — pre–Gate 2)

User approved architecture **Option B**, then locked diaper product UX:

| Code | Decision |
|------|----------|
| **Architecture** | **Option B** — one `babyQuickCare`, jsonb detail, `latestWeightKg` (do **not** reopen Option A). |
| **D2** | **Kind tiles + Step 2 sheet** — not a progressive 4-phase single-value button. |
| **W1** | **One server save at the end** — local draft on the sheet; one `babyQuickCare` on Save. |
| **S1** | **Wet / Dry** on Kind: instant save (kind only) → brief Done feedback OK → ready again. **Poop / Mixed** open Step 2 (sheet unchanged). |
| **D-A layout** | **Remove diaper ↑↓ entirely.** Kind = **2×2 grid of four tiles** (Wet \| Poop / Mixed \| Dry) in **one** control at nap/bottle height — **not** a 1×4 strip. Icons + short labels OK; full names in `aria-label`. |
| **B1 bottle** | Tall log = Start nap height; **+/− stacked RIGHT** at 50% each; hero ml; quiet next-due subtitle; Custom under card; Done/Logged ~2s after save. |

## Open questions

### Blocking

None — Gate 1 picks above.

### Non-blocking (can settle in Analyze)

6. Should red-flag colors (White/Pale, Red/Bloody) only warn in-sheet, or also tag the saved event for later Insights?
7. Should Step 2 allow notes in this pass?
8. Exact EN phrasing for next-due minutes (“next in 5 min” vs “next in 5m”).
9. Whether overhaul of `lib/baby-age-guide.ts` bands replaces redesign bands entirely or adds a 1–2 day band and retunes edges only.
10. Coordination with unmerged `baby-home-redesign` (Gate 3 paused): ship this on the same branch / PR series, or as a strict follow-on after that merge?

## Context from quick scan (for the team)

- **App:** Next.js workspace shell; Baby feature with GraphQL, Drizzle/Postgres, EN/VI messages.
- **Home:** Option B quick care already in tree (`components/baby-home.tsx`, quick-care server, age guide, next-due).
- **Diaper today:** `BabyDiaperPayload = { kind: "wet" \| "dirty" \| "mixed"; notes? }` in `db/schema/baby.ts`.
- **Next-due copy:** `home.nextIn` EN `"next in {duration}"`, VI `"còn {duration}"`; duration often compact (`5m`) via format helpers.
- **Weight:** Not on `baby_profile`; exists as `baby_growth_entry` kind `weight`.
- **Age guide today:** Bands in `lib/baby-age-guide.ts` differ from the table above (e.g. no 5–15 ml day-1–2 band; 2–4 weeks is 60–120 today).
