# Analysis: Baby home section headers + bottle chips + cleaner status

## What exists today

Baby home (`components/baby-home.tsx`) is the Option B quick-care surface: **row 1** breast L/R, **row 2** bottle (face + ± + Custom) | Start nap | Kind 2×2, then guide caveat, then **row 3** “Last feed / sleep / diaper” status lines. There are **no section headers** above the four control groups today.

**Status:** Feed lines append day progress (`home.feedsToday` / `feedsTodayNoGuide`) and often a leading `home.lastMl` when `amountMl` is present — e.g. `90 ml · Feed (…) · Just now · 7/8 today`. Sleep/diaper already look like `summary · when`.

**Age / bottle guide:** `lib/baby-age-guide.ts` has feed ml bands + `feedsMax`, `babyFormulaSnapList`, `babySuggestedBottleMl`. **No sleep-band helpers** yet (Gate 1 nap table is new). Missing birthday falls back to `BABY_FEED_GUIDE_FALLBACK` (infinite `feedsMax`) so progress max is hidden; a soft birth-date prompt already exists with **7-day snooze**.

**Bottle history for chips:** `babyHomeQuickStatus` returns only `lastFeed` + `feedsToday` — **not** a list of recent formula ml amounts. Snaps come from the age band only.

## Dependencies

What else must change or stay compatible?

- **Prior unmerged home work** (`baby-home-redesign`, `baby-home-logging-detail`, `baby-home-controls-polish`) — treat as context; do not reopen Gate 3 or merge rules / nap grace / Kind sheet behavior.
- **Feed status copy** — client `statusLine("feed")` in `baby-home.tsx` (+ e2e that assert `last ml` / `n/N today`). Keep `careSummary` / session merge as owned by controls-polish; this pass only stops *displaying* progress and duplicate leading ml on home status.
- **Bottle UI** — Gate 1 **4A** replaces `BabyQuickValueCard` face+± with Kind-like chips + Custom → existing `BabyCustomMlModal` (confirm sets ml; do not change auto-save).
- **Chip ml source (3A)** — needs a Design pick: extend `babyHomeQuickStatus` (or a small helper query) with recent formula amounts **vs** local-only store. Today’s API cannot satisfy “last 3 from history” alone.
- **Sleep guide** — new copy + band math; extend `baby-age-guide.ts` or a sibling module. Keep “guidelines only” caveat language.
- **Birth date** — Gate 1: prompt on first load; no fake guide until set. Existing snooze helper may stay or tighten — Design must align with 5A.
- **Skeleton** — `BabyHomeSkeleton` must mirror new headers + chip layout in the same change (zero CLS). Layout may shift from “row2 three columns” to clearer per-group stacks with headers.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `.my-docs/workflow/baby-home-section-headers/01-idea.md` | Gate 1 picks (1B, 2B, 3A, 4A, 5A, status, birth prompt). |
| `.my-docs/workflow/baby-home-controls-polish/03-design.md` | Settled merge / Kind flush / Custom modal / ripple — do not reopen. |
| `.my-docs/workflow/baby-home-redesign/03-design.md` | Birth-date prompt + Option B status / Custom contracts. |
| `.my-docs/workflow/baby-home-logging-detail/03-design.md` | Kind tiles + diaper sheet — chip visual cousin. |
| `components/baby-home.tsx` | Rows, bottle card, status lines, birth prompt, Custom modal wire-up. |
| `components/baby-diaper-kind-control.tsx` | Flush chip grid (`fx-ripple`, primary selected) — **template for bottle chips**. |
| `components/baby-quick-value-card.tsx` | Current bottle face+± — **replaced** for bottle per 4A. |
| `components/baby-custom-ml-modal.tsx` | Custom chip opens this; confirm-sets-ml only. |
| `components/baby-page-skeleton.tsx` | `BabyHomeSkeleton` parity for headers + chips. |
| `lib/baby-age-guide.ts` (+ `.test.ts`) | Feed bands, snaps, suggested ml; sleep bands likely live here or sibling. |
| `lib/baby-birth-date-prompt.ts` (+ `.test.ts`) | Show/snooze rules for unset birthday. |
| `lib/baby-next-due.ts` | Tip-style “next in / overdue” strings for breast/diaper tips (1B). |
| `lib/baby-quick-value-steppers.ts` | `stepBabyFormulaMl` / `parseBabyCustomMl` — still useful after ± removal. |
| `lib/money-quick-pick-chip-cls.ts` | Optional segmented-chip CLS; Kind flush + primary fill preferred over inventing new chrome. |
| `features/baby/server/home-quick-status.ts` | `feedsToday`, last* items, birthDate, weight — likely home for recent ml if server-backed. |
| `features/baby/server/timeline.ts` | `careSummary` — status uses `item.summary`; do not break merge summaries. |
| `lib/graphql/baby-typeDefs.ts` / `baby-resolvers.ts` | `BabyHomeQuickStatus` shape if chips need new fields. |
| `db/schema/baby.ts` | Feed payload `amountMl` / `legs[]` for extracting formula history. |
| `messages/baby/en.ts`, `messages/baby/vi.ts` | Status, feedsToday, guide, birth prompt — new header/blend keys. |
| `docs/DESIGN_GUIDE.md` | Segmented controls, ≥44 hit, concentric radii, skeleton parity. |
| `e2e/baby-home-option-b.spec.ts` | Asserts bottle B1, last ml on status, feedsToday — expect rewrites. |
| `components/baby-home.test.ts`, `baby-diaper-kind-control.test.ts`, `baby-quick-value-card.test.ts` | Unit hooks for layout / status / chips. |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Flush Kind chip grid | `components/baby-diaper-kind-control.tsx` | Bottle chips should match Kind tile language (4A), not Money soft chips alone. |
| Primary selected + `fx-ripple` | Kind control + `app/globals.css` | Same press/selected feedback as controls-polish. |
| Custom ml modal confirm-then-set | `components/baby-custom-ml-modal.tsx` | Custom chip opens it; no new modal. |
| Pure age-guide helpers + unit tests | `lib/baby-age-guide.ts` | Sleep blend + chip fill-from-snaps belong in pure `lib/` first. |
| `babyFormulaSnapList` | `lib/baby-age-guide.ts` | Fill &lt;3 recent ml from age-band snaps (3A). |
| Next-due tip strings | `lib/baby-next-due.ts` + `home.nextIn` / `home.overdue` | Breast/diaper short tips (1B) without inventing a second due system. |
| Birth-date prompt + localStorage snooze | `lib/baby-birth-date-prompt.ts` + home footer | Extend/reuse; do not invent a second prompt channel. |
| Guide caveat copy | `home.guideCaveat` | Sleep/feed headers stay “guidelines only,” not medical claims. |
| Half-open day + `feedsToday` | `home-quick-status.ts`, `lib/baby-home-day-window.ts` | Progress `n/N` in bottle header still uses this count; do not change how feeds are counted. |
| Skeleton parity | `components/baby-page-skeleton.tsx` | Mandatory with header + chip layout. |
| Intrinsic auto-fit grids | `baby-home.tsx` `repeat(auto-fit, minmax(...))` | Keep no hardcoded content breakpoints (aligns with qan CSS tips + DESIGN_GUIDE). |
| Done flash ~2s | `lib/baby-home-done-flash.ts` | Keep bottle logged feedback after chip save. |

## Constraints and risks

- **Tribal — Gate 3 pause on prior baby-home workflows:** headers/chips/status only; do not reopen nap lock, feed-session merge, Kind sheet, or Custom auto-save.
- **No recent-ml API today:** 3A needs an explicit data contract in Design (server list vs client memory). Relying only on `lastFeed.amountMl` cannot fill three distinct history chips.
- **Fallback guide vs 5A:** `BABY_FEED_GUIDE_FALLBACK` keeps the page usable without birthday but must **not** fake `n/N` or sleep blend until birth date is set. Progress + recommended ml only when a real band / finite `feedsMax` exists.
- **Birth prompt vs snooze:** Product says ask on first load; current UX allows “Not now” for 7 days. Design must pick keep-snooze vs stronger until-set without blocking analysis.
- **Layout CLS:** Adding four headers (and replacing tall bottle cluster with a chip row) changes vertical rhythm; skeleton + e2e layout contracts will churn.
- **3AM copy length:** Nap blend must compress the full sleep table into one short EN+VI line — Design owns exact strings.
- **Status e2e drift:** `e2e/baby-home-option-b.spec.ts` currently expects leading last-ml and day progress on feed status.
- **Merged feed payloads:** Recent ml extraction must read formula from top-level `amountMl` **and** `legs[]` (controls-polish), without double-counting the same session as three history entries unless Design says otherwise.
- **Front-end local knowledge:** `dev-decision-routing` context-mode MCP was **unavailable** this run. Used qan `Work/Dev/CSS` (intrinsic grids, concentric polish) + `Work/Dev/Js` (prefer platform APIs) plus repo `docs/DESIGN_GUIDE.md`. HTML folder empty.

## Settled decisions (do not relitigate)

From Gate 1 (`01-idea.md`):

| # | Decision |
|---|----------|
| **1B** | Breast / diaper headers = **label + short tip** |
| **2B** | Nap header = **one-line sleep blend** (total + naps + typical length) |
| **3A** | Bottle chips = last **3** from this baby’s bottle/formula history; fill &lt;3 from age-band snaps |
| **4A** | Chips **replace** bottle face + ± |
| **5A** | Show **`0/N` + recommended ml** when guide max exists; unset birthday → **prompt**; **no fake** age guide |
| **Status** | Always `Feed (…) · {when}` — no `n/N today`, no redundant leading `ml ·` |
| **Addendum** | Headers easy at 3AM; birthday unset → ask on first load |
| **Non-goals** | No sleep charts/alarms; no medical claims; no undo; no pump/solids on home; no merge-rule rewrite; no full timeline redesign |

## Blocking questions

None for Analyze. Gate 1 product picks are enough to design.

**Design should decide (non-blocking):**

1. Exact EN/VI tip + nap-blend copy (3AM-short).
2. Sleep bands: extend `lib/baby-age-guide.ts` vs sibling module.
3. Recent ml: extend `babyHomeQuickStatus` vs other read; how to dedupe merged `legs`.
4. Birth-date prompt: keep 7-day snooze vs always show until set for this session/device.
5. Layout: headers inside current row cells vs restack groups for clearer 3AM scan.

---

**Clarity check for Design:** Are the instructions and reference files clear enough to design?
