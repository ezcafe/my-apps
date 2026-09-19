# Tasks: Pump L/R + care log parity + timer Tap-to-stop

**Depends on:** Gate B approval of `03-design.md` (**Decision 1 Option 2** — TimedCareChip extract; icons from `ui-refs/02-home-timer-running-light.png`).  
**Locks:** Gate A/A2; D3 exclusive accordion; D4 stub guidelines + locked Pump table; D5 sleep≈Nap via shared chrome + adapters; D6 `pump_l`/`pump_r` + legacy `pump`+ml; one widened timer store (adapter 1 only); D7 Option 2 packaging; quick-care `PUMP_AMOUNT` + widened BREAST side union.

---

## Task 1: Feed methods + validators + labels + rollup/timeline

**Description:**
Add `pump_l` / `pump_r` to feed method Zod/types and friendly/Insights/i18n maps. Keep legacy `pump` for amount-only (+ old rows). Update `mergeFeedLegs` / `feedSessionSummaryParts` / `rollUpFeedPayload` / timeline labels per `03-design.md` Contracts (duration for `pump_l`/`pump_r`; amount for `pump` like formula). Do not remove growth enum `pump` (history read). Telegram: keep `/feed pump` → legacy `pump` (one-line map OK). No Postgres feed-method enum migration.

**Acceptance:**

- [ ] `createBabyFeed` accepts `pump_l` / `pump_r` with duration; accepts `pump` + `amountMl`
- [ ] Timed pump does **not** require amount; Pump amount does **not** require a side
- [ ] `feedSessionSummaryParts` keeps `pump`+ml like formula; `pump_l`/`pump_r` like breast duration
- [ ] `rollUpFeedPayload` sums ml from `formula` **and** `pump`; sums duration from breast + `pump_l`/`pump_r`
- [ ] EN/VI labels for Pump L / Pump R / Pump / Pump amount
- [ ] Insights/timeline can label new methods (duration vs ml); legacy `pump` / growth pump stay generic “Pump” where appropriate

**Tests (TDD — what turns red first):**

- [ ] Unit: Zod accepts `pump_l`/`pump_r` + duration; rejects unknown method
- [ ] Unit: `pump` + amountMl ok; timed side without inventing amount ok
- [ ] Unit: `createBabyFeedSchema` — `method: "pump_l"` / `"pump_r"` without `durationSec` → fail; `method: "pump"` without `amountMl` → fail (keep accept cases above)
- [ ] Unit: `feedSessionSummaryParts` / `rollUpFeedPayload` — `pump`+ml included; `pump_l` duration included; multi-leg mix
- [ ] Unit: friendlyFeedMethod / Insights / timeline label keys for `pump_l`/`pump_r` (+ ml path for `pump`)

**Files likely touched:** `lib/validators/baby.ts`, `lib/baby-feed-session.ts`, Insights/timeline label maps, `messages/baby/{en,vi}.ts`, `lib/baby-telegram/commands.ts` (map only), `*.test.ts`

**Scope:** M

**Dependencies:** none

**Security:** Server Zod at edge (A01/A03/A04). No PII in new logs.

---

## Task 2: Widen client timer store + quick-care (timed side + PUMP_AMOUNT)

**Description:**
One store family (adapter 1): widen sides to `breast_l|breast_r|pump_l|pump_r`; bump key (e.g. `baby.careTimer.v1`) with one-time migrate from `baby.breastTimer.v1`. Lock quick-care schema: keep `action.kind: "BREAST"` for timed L/R; widen `action.side` + `breastRunning.side` to include `pump_l`/`pump_r`; stop = duration-only createFeed (`method` = side). Add `action.kind: "PUMP_AMOUNT"` + required `amountMl` → server step **`createPumpAmount`** writes `method: "pump"` + ml (not FORMULA). **`PUMP_AMOUNT` ≡ FORMULA for auto-finalize:** if `breastRunning` present, save timed side + clear timer + feedSession merge (`writesFeed` includes `PUMP_AMOUNT`); then `createPumpAmount`. Idle = amount only. Extend `BABY_AUTO_FINALIZE_TABLE` (+ planner/server tests) with fixture rows. No second timer API. Nap/Sleep stay SLEEP open-session (adapter 2) — not this store.

**Acceptance:**

- [ ] Start/stop/stale helpers work for breast and pump sides; one running side at a time
- [ ] Old breast key migrates without losing an in-flight session
- [ ] Home/quick-care stop of Pump L/R writes duration-only feed event (`BREAST` + `side: pump_l|pump_r`)
- [ ] Home Pump amount uses `PUMP_AMOUNT` → step `createPumpAmount` → feed `pump`+ml (not `FORMULA`→formula)
- [ ] Zod requires `amountMl` on `PUMP_AMOUNT` (reject missing/invalid → `BAD_USER_INPUT`)
- [ ] Auto-finalize parity with FORMULA: running timed side → save duration + clear timer + feedSession merge, then amount; idle → amount only; nap-open rows match Bottle order when needed
- [ ] Corrupt/stale store ignored safely; Zod rejects bad side/amount with `BAD_USER_INPUT`

**Tests (TDD — what turns red first):**

- [ ] Unit: store start/stop for `pump_l`; migrate from v1 breast key
- [ ] Unit: care-timer one running side — start `pump_l` while `breast_r` (or other side) running → only the new side is active
- [ ] Unit: Zod + planBabyQuickCare accept `BREAST` + `side: "pump_l"` stop duration; map to createFeed `pump_l`
- [ ] Unit: Zod rejects `PUMP_AMOUNT` without `amountMl`
- [ ] Unit: `PUMP_AMOUNT` + amountMl idle → plans/writes `createPumpAmount` / `method: "pump"` (not formula)
- [ ] Unit: auto-finalize fixture rows — `PUMP_AMOUNT` idle; `PUMP_AMOUNT` + running timed side (e.g. `pump_r` or `breast_*`); nap-open variant if Bottle has one — expect steps `saveBreast` (+ `endNap` if open) + `createPumpAmount`; `writesFeed` / feedSession merge like FORMULA
- [ ] Unit: stale clear still applies
- [ ] Unit: corrupt / unknown side after widen — bad JSON or `side: "nope"` → null (keep existing breast corrupt cases)

**Files likely touched:** `lib/baby-breast-timer-store.ts` (rename/widen OK), `lib/baby-quick-care-plan.ts`, `lib/baby-quick-care-order-fixture.ts`, `lib/validators/baby.ts`, GraphQL baby types if needed, `features/baby/server/quick-care.ts`, related tests/e2e that assert `BREAST` / `breastRunning` / `FORMULA`

**Scope:** M

**Dependencies:** Task 1

**Security:** Client-only storage; server still validates duration/method/side/amount.

---

## Task 3: TimedCareChip extract + home mount + icons + Tap-to-stop + Pump amount + home skeleton

**Description:**
Extract shared **TimedCareChip** chrome (`components/baby-timed-care-chip.tsx`: icon + idle/running/Done + Tap-to-stop + elapsed). **Mount on home only this task** (feed/sleep mount = Task 5). Wire **adapter (1)** care-timer sides on home Breast/Pump L/R; **adapter (2)** for **home Nap** via SLEEP open-session (not careTimer). Bottle / Diaper / Pump amount stay **outside** the chip. Rebuild Baby home as layout shell: Row 1 Breast L·R + Bottle; Row 2 Nap + Diaper; Row 3 Pump L·R + Pump amount (Bottle ml pattern). **Icons** match figurative style in `ui-refs/02-home-timer-running-light.png`. Running copy `home.tapToStop` (EN/VI); Done only via done-flash after stop. Short muted helpers under big chips. **Same change:** update `BabyHomeSkeleton` / home loading to mirror Rows 1–3 (+ Row 4 placeholder if Task 4 not same PR — prefer same PR as Task 4).

**Acceptance:**

- [ ] Shared TimedCareChip chrome extracted and mounted on **home** (Breast/Pump L/R + Nap adapter 2) — **not** required on feed/sleep yet (Task 5)
- [ ] Layout matches Gate A rows; icons on all big home care controls match ui-ref 02 spirit
- [ ] Running chip shows elapsed + Tap to stop — never Done while running
- [ ] Pump L/R timer stop = duration-only + brief Done
- [ ] Pump amount logs via `PUMP_AMOUNT` → `createPumpAmount` → `method: "pump"` + ml (not a timer; not FORMULA); auto-finalize when a timed side is running (Task 2)
- [ ] Home skeleton element order/gaps/radii match live Rows 1–3 (and Row 4 if shipped here) — zero CLS

**Tests (TDD — what turns red first):**

- [ ] Unit/component: TimedCareChip running state uses tapToStop (not tapToSave / Done)
- [ ] Unit: done-flash only after stop
- [ ] Unit: home Pump amount maps to `PUMP_AMOUNT` / pump+ml path
- [ ] Unit (home / quick-care press): `PUMP_AMOUNT` while care-timer `pump_r` (or `breast_*`) running → `breastRunning.side/durationSec` set + clear/stop `localAfter` like FORMULA; idle → amount only
- [ ] Unit: home Nap (adapter 2) mutates SLEEP / open-session only — no care-timer `start(side)` / no `BREAST` timed-side write for Nap
- [ ] Unit/markup: home renders icon slots for each care control (or snapshot of icon keys)
- [ ] Unit: home skeleton structure matches live row order (Rows 1–3 minimum)
- [ ] E2E note: home Pump L start → Tap to stop → Done → idle; Pump amount picks ml

**Files likely touched:** `components/baby-timed-care-chip.tsx` (new), `components/baby-home.tsx`, `components/baby-page-skeleton.tsx`, `app/(shell)/baby/**/loading.tsx` (home), `baby-quick-value-card.tsx`, `baby-bottle-ml-chips.tsx`, `icon-baby-nav.tsx`, `messages/baby/{en,vi}.ts`, home tests / `e2e/baby-home-option-b.spec.ts`

**Scope:** M

**Dependencies:** Task 2

**UI/mobile:** ≥44px hits; light+dark tokens; concentric radii; skeleton parity mandatory same ship.

---

## Task 4: Exclusive guidelines (Row 4) + stub copy + guideline skeleton

**Description:**
Add four collapsible guideline sections (Feed / Sleep / Diaper / Pump), **collapsed by default**, **exclusive** (one open). Pump body = locked postpartum table + caveats. Feed/Sleep/Diaper = short EN/VI stubs from `03-design.md`. Local accordion (aria-expanded); not AboutDisclosure. **Same change:** home skeleton includes **four collapsed guideline header** placeholders (if not already in Task 3 PR — must ship with this layout).

**Acceptance:**

- [ ] Four headers always visible; bodies hidden until expand
- [ ] Opening one closes others
- [ ] Pump table content matches idea locks; stubs present EN+VI
- [ ] Under-chip helpers stay short (not full table)
- [ ] Home skeleton Row 4 = four collapsed guideline headers — same PR as live Row 4 (zero CLS)

**Tests (TDD — what turns red first):**

- [ ] Unit/component: default all collapsed; exclusive open behavior
- [ ] Unit: i18n keys exist for four sections + Pump table rows
- [ ] Unit: home skeleton includes four guideline header placeholders

**Files likely touched:** new home guidelines component (or section in `baby-home.tsx`), `components/baby-page-skeleton.tsx`, `messages/baby/{en,vi}.ts`, tests

**Scope:** M

**Dependencies:** Task 3 (layout shell) — can stub UI after Row 4 placeholder exists

**UI/a11y:** Header ≥44px; `aria-expanded` + panel id; tokens only; skeleton parity same ship.

---

## Task 5: Feed / sleep mount + diaper / Growth parity

**Description:**
**Mount the same TimedCareChip** (from Task 3) on log pages: Feed Pump L/R as home-like timers (shared store + adapter 1); formula/Pump amount secondary; Tap-to-stop + Done-flash; no Save chrome. Sleep: **D5** clone home Nap via TimedCareChip + adapter 2 (SLEEP open-session Start/End + Tap-to-stop + Done-flash; minimize intentional diffs). Diaper: one-tap + Done-flash spirit (not TimedCareChip). Growth: remove `pump` from page chips/form; default stays weight; Insights still map legacy growth pump. Update feed/sleep/diaper/growth skeletons if chip order changed (**same change** as those UI edits).

**Acceptance:**

- [ ] Same TimedCareChip mounted on `/baby/feed` (adapter 1) and `/baby/sleep` (adapter 2) — ownership of log mounts is **this task**, not Task 3
- [ ] `/baby/feed` can log Pump L/R duration-only and Pump amount
- [ ] Running timers on feed/sleep show Tap to stop, not Done
- [ ] `/baby/sleep` matches home Nap behavior/pixel spirit (adapter 2 — not careTimer)
- [ ] `/baby/growth` has no Pump chip/button
- [ ] Affected log/growth skeletons match live chip order (same PR)

**Tests (TDD — what turns red first):**

- [ ] Unit: `BABY_GROWTH_PAGE_CHIPS` excludes `pump`
- [ ] Extend `baby-care-one-tap.test.ts` for feed/sleep/diaper chrome contracts
- [ ] Unit/component: feed pump_l timer stop → duration payload
- [ ] Unit: sleep Start→End (adapter 2) uses SLEEP / sleep form only — no care-timer `start(side)` / no `BREAST` timed-side write (pair with TimedCareChip chrome shared)
- [ ] Unit: feed/sleep (and growth if chips change) skeleton markers match live chip order — extend `baby-page-skeleton.test.ts` patterns
- [ ] E2E notes: feed Pump L path; growth has no Pump; sleep start/stop Done flash

**Files likely touched:** `baby-feed-form.tsx`, `baby-sleep-form.tsx`, `baby-diaper-form.tsx`, `baby-growth-page.tsx`, `lib/baby-growth-page-chips.ts`, skeletons, e2e care specs

**Scope:** M

**Dependencies:** Task 1–2; Task 3 for TimedCareChip extract + home chrome contracts

**Security / UI:** No Growth pump write UI (A04 dual entry). Light+dark; ≥44px chips; skeleton parity with UI edits.

---

## Task 6: i18n sweep + e2e polish

**Description:**
Finish EN/VI for Tap to stop, Pump L/R, Pump amount, guidelines (any leftover strings). Align e2e selectors with new home rows. **Not** the first place for home skeleton work — skeleton parity already shipped in Tasks 3–4 (and 5 if log skeletons changed). This task is polish only.

**Acceptance:**

- [ ] EN+VI complete for new strings
- [ ] E2E home/care updated for Pump L/R + Tap to stop; Growth pump assertions removed/rewritten
- [ ] Spot-check: home loading still mirrors live Rows 1–4 (regression only — fix in Task 3–4 if drift)

**Tests (TDD — what turns red first):**

- [ ] Unit: i18n keys present (en + vi) for any remaining strings
- [ ] E2E: smoke paths in Task 3/5 notes pass

**Files likely touched:** `messages/baby/{en,vi}.ts`, `e2e/baby-care.spec.ts`, `e2e/baby-home-option-b.spec.ts` (skeleton only if regression fix needed)

**Scope:** S–M

**Dependencies:** Tasks 3–5

**UI:** Polish / e2e; do not defer first skeleton ship here.

---

## Checkpoints

After Tasks 1–2:

- [ ] Validators + timer/quick-care + rollup unit tests green
- [ ] Can create timed pump + amount pump in isolation (API/unit); `PUMP_AMOUNT` ≠ FORMULA; auto-finalize fixture rows green (`createPumpAmount` ± running timed side)

After Tasks 3–4:

- [ ] Home idle/running/guidelines match Gate A2 locks manually once
- [ ] Home skeleton Rows 1–4 (incl. four guideline headers) ship with layout — zero CLS

After Tasks 5–6:

- [ ] Feed/sleep/diaper + Growth removal + e2e green
- [ ] Light + dark spot-check Tap to stop / icons / collapsed guidelines
