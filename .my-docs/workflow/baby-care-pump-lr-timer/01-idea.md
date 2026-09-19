# Idea: Pump L/R + care log parity + timer Done fix

## Problem

Three related pains for caregivers logging baby care:

1. **Pump is one blob.** Feed logging has a single **Pump** method; Growth also has a **Pumping** chip. Caregivers who pump left and right (like breast L/R) cannot record sides clearly, and pump lives in the wrong place (Growth).
2. **Log pages do not match home.** Baby home uses one-tap / timer / brief Done-flash rules. `/baby/feed`, `/baby/sleep`, and `/baby/diaper` still feel like separate forms (different timer chrome, validation, and feedback), so the same action feels different by surface.
3. **Done shows too early.** After starting a timer (home and log pages), the UI can show **Done** while the session is still running. Caregivers need a clear **Tap to stop** instruction until they actually stop; **Done** only after stop (success flash).

## User / audience

**Primary:** tired caregiver logging one-handed at night (EN or VI) on Baby home and care log pages.

**Secondary:** co-caregiver reading last activity / timeline and expecting L vs R pump (and consistent feed/sleep/diaper behavior).

## Outcome

What “done” looks like:

- **Locked — Pump L / Pump R surfaces:** Pump L and Pump R appear on **Baby home** (beside breast) **and** on `/baby/feed`, with clear side labels (same mental model as breast L/R).
- **Locked — Baby home layout (care composition):**
  - **Row 1:** Breast L + Breast R + Bottle
  - **Row 2:** Nap + Diaper
  - **Row 3:** Pump L + Pump R + **Pump amount** (amount entry chip/control — same UI pattern as Bottle; **not** a timer)
  - **Row 4:** information area (guidelines / educational content)
  - **Under each big care chip:** short helper / guideline text (readable, not a long essay on every chip)
- **Locked — happy-path pump stop:** stop → brief **Done** saves **duration only** (one-tap). Amount/unit is **secondary** via the **Pump amount** control (Bottle-like) — never forced on timer stop.
- **Pump guidelines content** (Row 4 / under-chip helpers — product content requirement; keep short on chip, fuller in Row 4): amount depends on days/months postpartum, how often you pump, whether baby also breastfeeds, and pump fit/settings. Approximate **total from both breasts per session:** Days 1–3 → 1–15 mL; Days 4–7 → 15–60 mL; Week 2 → 30–90 mL; Weeks 3–6 → 60–120 mL; After 1–6 months → 90–180 mL. These are broad estimates—not targets. After breastfeeding may be only a few mL; instead of a full feed may be much more. Under 60 mL can still be adequate supply; over 180 mL happens too. Exclusive pumping: often ~8–10×/day early; later fewer as supply settles. Judge supply over 24h + wet diapers + weight gain—not one session. Sudden drop, pain, or poor weight gain → lactation consultant / pediatrician.
- **Pump is gone from Growth** — no Pump chip/button on `/baby/growth`; pump is not a growth health kind in that capture UI.
- **Feed / sleep / diaper log pages** follow the **same** one-tap / timer / Done-flash rules and validation as Baby home (no extra Save step; same start → run → stop → brief Done).
- **While a timer is running** (home and logs): show instruction **Tap to stop** (or locale equivalent) — **not** Done. **Done** appears only after the user stops the timer (then brief flash as today).
- **Legacy rows (optional Enhancement):** Existing generic `pump` / growth pump rows may label as generic **“Pump”** in Insights/timeline; full migrate later is a Non-goal.

## Metric

Night check: start a breast (or pump) timer on home **and** on the matching log page → chip shows running time + **Tap to stop**, never Done until stop; after stop, brief Done then idle (duration saved; no amount form). Baby home shows Pump L, Pump R, and Pump amount (Bottle-like). Growth has no Pump chip. Caregiver can log Pump L and Pump R as distinct sides on home and `/baby/feed`.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes — reuse home breast L/R + care chip patterns; mainly home row layout, Pump amount (Bottle-like), timer copy, guidelines strip, Growth chip removal (1 primary surface + light ref is enough).
- **Copy/token-only?** no — new Pump L/R + Pump amount controls, home layout, Growth chip removal, and log-page behavior parity (not copy alone).

## 80/20 UI (day-to-day)

### Main user goals

- Start / stop a timed side session without false “Done”.
- Log pump left vs right the same way as breast L/R (home **and** feed).
- Enter pump amount when needed via **Pump amount** (like Bottle) — not on every timer stop.
- Use feed / sleep / diaper log pages with the same one-tap rules as home.
- Keep Growth for growth/health only (no pump there).
- See short pump guidelines near care chips / Row 4 when useful.

### Vital few (high-impact ~20%)

- Timer running copy: **Tap to stop** until stop; **Done** only after stop (home + logs).
- Pump **L** and Pump **R** as first-class sides on **Baby home and `/baby/feed`** (not one Pump; not Growth).
- **Pump amount** as secondary Bottle-like control (not a timer; not forced on stop).
- Align feed / sleep / diaper logs with home one-tap / validation / Done-flash.
- Remove Pump from Growth capture.

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Baby home care rows — Row 1 Breast L·R + Bottle; Row 2 Nap + Diaper; Row 3 Pump L·R + **Pump amount**; each big chip with short guideline text under it. Same Pump L/R on `/baby/feed`. Clear idle vs running on timed chips.
- **Important info / action #2 (always visible):** While running — elapsed time + **Tap to stop**; after stop — brief **Done** flash (duration saved). Row 4 guidelines / educational area (pump estimates table + caveats; not dumped under every chip).
- **Core action placement:** Large night-friendly chips (min-h-14 / fx-hit-40); one tap starts or stops timed care; no extra Save for the happy path.
- **Secondary actions:** **Pump amount** (and Bottle amount) as dedicated amount controls; optional duration fields, Custom bottle, diaper detail, notes — expand / less prominent / after primary chips.

### Top user journey to optimize

Open **Baby home** → tap **Pump L** (or Breast L) → timer runs with **Tap to stop** → tap again to stop → brief **Done** (duration only) → idle. Optional: use **Pump amount** (like Bottle) when recording volume. Same Pump L/R + timer rules on `/baby/feed`. Guidelines visible under chips / Row 4 without blocking the tap.

### Sensible defaults

- Idle chips show **Tap to start** (or current home idle copy).
- Running chips show elapsed + **Tap to stop** (never Done while running).
- **Locked — pump stop:** duration-only → Done; amount/unit via **Pump amount** (secondary), never required on stop.
- Default Growth chip stays weight (or current non-pump default) after Pump is removed.
- Prefer matching home validation (fail-closed sleep retry; feed/diaper still save when status errors, if that is home rule today).

### Biggest usability risks to fix first

- Showing **Done** while the timer is still running (false completion).
- Leaving a single Pump + Growth pump so sides and placement stay confusing.
- Forcing amount/unit on every pump stop (breaks one-tap).
- Log pages that still feel like forms (extra Save / different timer rules) after home was fixed.
- Guidelines so long they crowd the night chips (keep under-chip short; fuller text in Row 4).

## Non-goals

- Redesign Insights timeline, charts, or Activities filters beyond what pump L/R display needs.
- Full migrate of legacy generic `pump` / growth pump rows (label as generic “Pump” is enough this pass).
- Solids / other new feed methods.
- Undo after quick save.
- Telegram / bot command redesign (unless a one-line map is required for pump L/R).
- Full Growth health redesign beyond removing Pump from that page.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Pump L/R are **feed** methods (like breast L/R), not growth kinds — on **home + `/baby/feed`** | **Locked yes** | Gate A re-open if caregivers insist feed-only | Drop home Pump L/R; journey changes |
| Happy-path pump stop is **duration-only**; amount via Pump amount (Bottle-like) | **Locked yes** | Abandoned stops / night feedback | Require amount on stop (rejected for one-tap) |
| Timer Done-vs-Tap-to-stop applies to **breast (and pump) timers** on home **and** log pages | Yes | Tap home breast + feed page timer once each | Narrow to home-only or feed-only if logs already differ by design |
| Removing Growth Pump does **not** require deleting historical growth pump rows in this pass | Prefer yes | Check Insights/Growth list for old pump rows | Add migrate/hide/edit story |
| Feed/sleep/diaper “same rules as home” means behavior parity, not pixel-identical layout | Prefer yes | Compare home vs three forms once | Larger UI rewrite if pixel match is required |

## What we should not build

- New standalone Pump app section or separate timer product.
- Dual entry: pump on Growth **and** Pump L/R on feed (Growth pump goes away).
- Extra confirm modals on every stop.
- Amount form forced after every pump timer stop.

## Success criteria

- [ ] Caregiver can log **Pump L** and **Pump R** on **Baby home and `/baby/feed`** (distinct sides), analogous to breast L/R.
- [ ] Baby home shows locked rows: Breast L·R + Bottle; Nap + Diaper; Pump L·R + **Pump amount**; Row 4 guidelines; short helpers under big chips.
- [ ] Pump timer stop is **duration-only** one-tap (Done after stop); amount via **Pump amount** (Bottle-like), not forced on stop.
- [ ] `/baby/growth` has **no** Pump chip/button; pump capture is not offered there.
- [ ] `/baby/feed`, `/baby/sleep`, `/baby/diaper` use the same one-tap / timer / Done-flash rules and validation spirit as Baby home.
- [ ] On home and log pages: while timer runs, UI shows **Tap to stop** (locale copy) — **not** Done; Done only after stop.
- [ ] Light + dark, EN + VI labels remain clear for L/R, Pump amount, and Tap to stop / Done.

## Open questions

- Exact EN/VI string: keep **Tap to stop** vs reuse/adapt `home.tapToSave` — product preference? (fine at UI concept)
- Sleep on home vs `/baby/sleep`: any intentional differences to keep (e.g. open-session banner) while still matching one-tap Start/End + Done rules?
- How much of the pump guidelines table lives under each chip vs only in Row 4 — UI concept / copy length.
