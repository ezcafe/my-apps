# Analysis: Pump L/R + care log parity + timer Tap-to-stop

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.
**Updated:** 2026-09-19
**UI concept:** settled (`01b` + Gate A2) — implement that IA; do not invent a conflicting layout.

## Deep dive (required)

### Overall

#### What is this?
Make Baby **home** and care logs speak one language for night one-tap care: **Pump L / Pump R** (like breast), **Pump amount** (like Bottle), **Tap to stop** while timers run, four **collapsed** guideline accordions, and **no Pump on Growth**.

#### Why do we need this?
Today pump is one feed blob + a Growth chip; running chips say “Tap to save” / feel Done-ish; home row layout ≠ locked 4 rows; feed/sleep/diaper still diverge from home timer rules. Skipping keeps false completion, dual pump homes, and night friction.

#### How to do this?
- Honor Gate A / A2 locks: home rows 1–3 + icons; Row 4 = Feed/Sleep/Diaper/Pump collapsibles (collapsed default); duration-only timer stop; Pump amount Bottle-like; remove Growth pump capture.
- Extend feed methods + one shared client timer store + quick-care / createFeed paths; i18n EN/VI; skeleton parity.
- Align log forms to home **behavior** (one-tap / Tap-to-stop / Done flash), not pixel-clone home.
- **Other ways:** UI-only L/R labels (breaks validators/Insights/telegram); force amount on stop (rejected Gate A); keep Growth pump (dual entry).
- **Best practices:** Repo — `baby-home` breast timer + done-flash + `BabyBottleMlChips` + Zod/GraphQL care events. Industry — progressive disclosure for guidelines; one write surface per habit; clear running vs done states.

### Solution pieces

#### 1. Pump L/R data model + timer store (feed methods / validators)

##### What is this?
First-class feed sides for pump (home + `/baby/feed`), validators/payloads/i18n, and a **single** persistent timer store that can hold breast **or** pump sides (not a second ad-hoc API).

##### Why do we need this?
Skim hard constraint: breast store is `breast_l|breast_r` only; feed enum is `breast_l|breast_r|formula|pump`. UI-only chips will fail Zod, quick-care, Insights labels, and telegram. Two timer keys risk losing a running session.

##### How to do this?

**Decision 1 — Feed method identifiers**

- **Option 1 — Add `pump_l` / `pump_r`; keep legacy `pump` for amount-only (+ old rows / telegram)**
  - **What it is:** Timed sides mirror breast; **Pump amount** writes `method: "pump"` + `amountMl` (no side).
  - **Example:** Stop Pump L → `{ method: "pump_l", durationSec: 420 }`; pick 90 ml → `{ method: "pump", amountMl: 90 }`.
  - **Pros:** Matches breast mental model; `mergeFeedLegs` already keys by method; amount chip needs no side.
  - **Cons:** Enum/GraphQL/i18n/telegram/timeline updates; three pump-related methods to document.
- **Option 2 — Keep single `pump` + new optional `side: "l"|"r"` on payload**
  - **What it is:** One method; side only when timed.
  - **Example:** `{ method: "pump", side: "l", durationSec: 420 }`.
  - **Pros:** Fewer enum values.
  - **Cons:** Legs merge / Insights / edit paths don’t know `side` today; fights breast pattern; more special-case code.
- **Recommendation:** **Option 1** — repo already treats L/R as distinct methods for breast.

**Decision 2 — Client timer store shape**

- **Option 1 — Widen one store + bump key** (e.g. `baby.careTimer.v1` or versioned breast key) with sides `breast_l|breast_r|pump_l|pump_r`
  - **Example:** Same start/stop/stale helpers; quick-care `breastRunning` generalized to “timed side running” or parallel field kept compatible.
  - **Pros:** Honors skim “no second ad-hoc timer API”; one running side at a time (today’s home rule).
  - **Cons:** Touch planner, quick-care server chain, e2e that assert `BREAST` / `breastRunning`.
- **Option 2 — Separate `baby.pumpTimer.v1` beside breast**
  - **Example:** Two localStorage keys; home picks which is active.
  - **Pros:** Smaller breast-test churn.
  - **Cons:** Dual APIs, stale/race risk, fights skim constraint #2.
- **Recommendation:** **Option 1**.

- **Approach:** Widen `BabyFeedMethod` + Zod + `friendlyFeedMethod` / Insights; extend `BabyQuickAction` (BREAST-like for pump sides or shared TIMED_SIDE); Pump amount ≈ FORMULA path writing feed `pump`+ml; keep Growth enum `pump` for **history read** only.
- **Other ways:** See Decisions 1–2.
- **Best practices:** Repo — `lib/baby-breast-timer-store.ts`, `planBabyQuickCare`, `createBabyFeed` legs; Industry — version storage keys; accept legacy `pump` on read.

#### 2. Home layout + icons + timer Tap-to-stop + Pump amount

##### What is this?
Rebuild Baby home care composition to locked rows; icons on **every** big care control; running copy **Tap to stop**; Pump amount = Bottle ml chips (not a timer).

##### Why do we need this?
Current home is breast row + Bottle|Nap|Diaper; running uses `home.tapToSave` (“Tap to save”); Bottle has no header icon; no Pump row / guidelines row. Without this, Gate A2 and night UX fail.

##### How to do this?
- **Approach:** Restructure `baby-home.tsx` (+ `BabyHomeSkeleton`) to:
  - **Row 1:** Breast L·R + Bottle (icons)
  - **Row 2:** Nap + Diaper (icons)
  - **Row 3:** Pump L·R timers + Pump amount (`BabyBottleMlChips` pattern)
  - Short muted helper under each big control; status/pending stay below (not in Row 4).
- Copy: new `home.tapToStop` (EN/VI); idle keeps Tap to start; Done only via existing ~2s done-flash after stop.
- Icons: extend `icon-baby-nav` (Bottle, Pump, Diaper aggregate, Pump amount / droplet) — Breast/Sleep/diaper-kinds already exist.
- Wire Pump L/R through quick-care like breast (duration-only stop); Pump amount through formula-like create with `method: "pump"`.
- **Other ways:** Keep current bottle|nap|diaper wide row (conflicts Gate A layout); reuse `tapToSave` string (conflicts A2 / idea metric).
- **Best practices:** Repo — `BabyQuickSimpleCard`, `IconSwap`, `baby-home-done-flash`, `BabyBottleMlChips`; DESIGN_GUIDE concentric radii + fx-hit-40; skeleton order = live order (zero CLS).

#### 3. Four collapsible guidelines (Feed / Sleep / Diaper / Pump)

##### What is this?
Row 4: four always-visible headers (chevron), **all collapsed by default**; bodies only when expanded. Pump body = postpartum estimates + caveats from idea. Feed/Sleep/Diaper bodies = short care guidance (see Blocking questions).

##### Why do we need this?
Gate A2 lock — not a single pump essay. Collapsed default keeps night chips dominant; without Row 4, caregivers lose estimates without crowding chips.

##### How to do this?

**Decision 3 — Expand behavior**

- **Option 1 — Independent** (multiple sections open)
  - **What it is:** Each header toggles only itself.
  - **Example:** Open Feed and Pump at once.
  - **Pros:** Compare topics; simple state (`Set` / four booleans).
  - **Cons:** Longer scroll on small phones if several open.
- **Option 2 — Exclusive accordion** (one open at a time)
  - **What it is:** Opening one closes others.
  - **Example:** Open Pump → Feed closes.
  - **Pros:** Shorter page; clearer focus.
  - **Cons:** Can’t compare two topics without re-tapping.
- **Settled:** **Option 2** (exclusive) — human lock 2026-09-19; do not re-open.

- **Approach:** New small home guidelines component (Card + header button + chevron); not `AboutDisclosure` (tooltip/hover — wrong for long tables). No `components/ui` accordion today — local pattern OK. i18n table + caveats for Pump; short stubs or age-guide-derived blurbs for others once copy settled. Skeleton: four collapsed header placeholders.
- **Other ways:** Always-open Pump block (rejected A2); dump full table under every chip (idea risk).
- **Best practices:** Progressive disclosure; ≥44px headers; tokens only; light+dark.

#### 4. Log-page parity (feed / sleep / diaper) + Growth pump removal

##### What is this?
`/baby/feed|sleep|diaper` match home **rules**: chip = mutate; timers show Tap to stop then Done flash; feed gains Pump L/R (+ amount secondary). Growth capture drops Pump chip (enum may remain for old rows).

##### Why do we need this?
Feed today: separate Start/Stop chips + method tap that saves immediately — not home’s start→run→stop→Done. Growth still leads with Pump. Skipping leaves two behaviors and dual pump entry.

##### How to do this?
- **Feed:** Method chips for `breast_l|breast_r|pump_l|pump_r` act like home timers (shared store or same UX contract); formula / pump-amount secondary; remove “save while timer still running feels Done” chrome; Done flash after stop; update `BabyFeedSkeleton`.
- **Sleep / diaper:** Keep one-tap mutate (already no Save); align running/end copy + Done-flash spirit with home; keep intentional sleep open-session/retry differences unless product says otherwise (see Blocking).
- **Growth:** Remove `pump` from `BABY_GROWTH_PAGE_CHIPS` / form branches; default stays weight; Insights/timeline still map legacy growth `pump` as generic “Pump” (Non-goal migrate). Do **not** drop DB enum this pass.
- **Telegram:** One-line map — keep `/feed pump` → legacy `pump`; optional later `pump_l`/`pump_r` tokens (Non-goal full bot redesign).
- **Other ways:** Pixel-clone home onto log pages (out of scope); delete growth pump rows (Non-goal).
- **Best practices:** Repo — `baby-care-one-tap.test.ts` chrome contracts; growth chips module; Insights label maps. Industry — behavior parity across surfaces; leave historical kinds readable.

## What exists today

Next.js Baby shell: home one-tap in `components/baby-home.tsx` (local breast timer + done-flash); feed/sleep/diaper chip forms with no Save; feed method `pump`; Growth kind `pump` (amount+unit) on capture chips. Timer storage `baby.breastTimer.v1` sides breast-only; quick-care actions BREAST | FORMULA | SLEEP | DIAPER. Running copy = `home.tapToSave`.

## Dependencies

- Validators + GraphQL createFeed / quick-care planner + server steps
- i18n EN/VI (Tap to stop, Pump L/R, Pump amount, four guideline sections)
- Home + feed/growth skeletons; e2e home + care (+ growth pump test update)
- Icons set; optional telegram one-line map
- Keep growth DB enum `pump` for reads; Insights label for legacy

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-home.tsx` | Care rows, breast timer UI, done-flash |
| `components/baby-page-skeleton.tsx` | Home/feed/growth skeleton parity |
| `components/baby-bottle-ml-chips.tsx` | Pump amount pattern |
| `components/baby-feed-form.tsx` (+ sleep/diaper) | Log parity + Pump L/R |
| `components/baby-growth-page.tsx` + `lib/baby-growth-page-chips.ts` | Remove Pump capture |
| `lib/baby-breast-timer-store.ts` + `lib/baby-quick-care-plan.ts` | Timer + quick-care |
| `lib/validators/baby.ts` + `lib/baby-feed-session.ts` | Methods / legs |
| `features/baby/server/quick-care.ts` + `care-events.ts` | Writes |
| `messages/baby/{en,vi}.ts` | Copy |
| `components/icons/icon-baby-nav.tsx` | Home icons |
| `lib/baby-telegram/commands.ts` | `/feed …pump` map |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Breast timer + done-flash | `baby-breast-timer-store` / `baby-home-done-flash` / home cards | Pump L/R same start→stop→Done |
| Bottle ml chips | `baby-bottle-ml-chips.tsx` | Pump amount secondary |
| Quick-care plan + localAfter | `baby-quick-care-plan.ts` / `quick-care.ts` | Duration-only stop writes |
| One-tap chrome tests | `baby-care-one-tap.test.ts` | Guard log pages stay Save-free |
| Growth page chips list | `baby-growth-page-chips.ts` | Drop pump from capture only |
| Diaper kind icons | `icon-baby-nav` + kind control | Model for “icon on every control” |

## Constraints and risks

- **Do not fight skim:** Tap-to-stop ≠ tapToSave while running; one timer store family; feed pump ≠ Growth pump write; validators/i18n required; Gate A locks.
- Layout rewrite can break e2e home selectors / skeleton CLS if Row 3–4 omitted from skeleton.
- Quick-care BREAST-only types need a careful pump-side extension without breaking bottle/nap auto-finalize table.
- Legacy feed `pump` + growth `pump` rows must still display (generic label OK).
- Guideline copy for Feed/Sleep/Diaper not fully specified in idea (Pump is).

## Settled decisions (do not relitigate)

- Home rows 1–3 locked; Pump L/R on home **and** feed; stop = duration-only; Pump amount Bottle-like; remove Growth Pump capture.
- Gate A2: icons on all home care buttons; Row 4 = four collapsibles (Feed/Sleep/Diaper/Pump), collapsed by default.
- **Decision 3:** Exclusive accordion (one open at a time) — settled.
- UI concept IA settled — Design implements wiring around it.
- Legacy migrate of old pump rows = Non-goal / Enhancement label-only.

## Spike notes (optional)

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Timer key migrate | What: parse old `baby.breastTimer.v1` into widened side union. Why: avoid lost running breast on deploy. How: read old key once, write new key, ignore corrupt. | Feasible in store helpers; no server change. | **Keep** for Design/Build |
| Accordion a11y | What: header `aria-expanded` + panel id. Why: four sections without a ui/accordion. How: button + region pattern. | No Collapsible primitive in `components/ui`. | **Keep** — local component |
| context-mode / qan Dev | Front-end routing skill — MCP namespace unavailable this run. | N/A local HTML/CSS/JS notes. | **Discard** |

## Blocking questions

**Resolved (human 2026-09-19):**

1. **Row 4 expand:** Decision 3 → **Option 2** (exclusive — one open at a time).
2. **Feed / Sleep / Diaper guideline bodies:** Decision 4 → **Option 1** (Design drafts short EN/VI stubs; Pump body uses locked postpartum table).
3. **Sleep log vs home:** Decision 5 → **Option 2** (full behavior/pixel clone of home Nap Start/End + Tap-to-stop + Done-flash; minimize intentional differences).
4. **Pump amount method:** Decision 6 → **Option 1** (`pump_l` / `pump_r` timed; legacy `method: "pump"` + `amountMl` for amount).

## Clarity check (for human)

Resolved — proceed to Design with locks above.
