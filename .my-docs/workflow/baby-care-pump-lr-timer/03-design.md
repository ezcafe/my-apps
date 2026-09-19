# Design: Pump L/R + care log parity + timer Tap-to-stop

**Mode:** full — from `00-run.md`  
**Updated:** 2026-09-19 (design-update round 2 from 03a)

## Design locks (do not re-open)

| Lock | Choice |
|------|--------|
| **Gate A** | Pump L/R on home + feed; duration-only timer stop; Pump amount Bottle-like; remove Growth Pump capture; Tap to stop while running |
| **Gate A2 / 01b** | Icons on every home care button; Row 4 = Feed/Sleep/Diaper/Pump guidelines, collapsed by default |
| **D3** | Exclusive accordion (one open at a time) |
| **D4** | Design drafts short EN/VI stubs for Feed/Sleep/Diaper; Pump = locked postpartum table from idea |
| **D5** | Sleep log fully clones home Nap behavior/pixel spirit (Start/End + Tap-to-stop + Done-flash); minimize intentional differences |
| **D6** | Timed `pump_l` / `pump_r`; Pump amount = legacy `method: "pump"` + `amountMl` |
| **Analysis D2** | One widened client timer store (not a second key) |
| **D7 packaging** | **Option 2** — Extract shared `TimedCareChip` (icon + idle/running/Done + Tap-to-stop) used by home, feed, sleep; home is layout shell |
| **Icons (Gate A2 refine)** | Home button icons match visual style in `ui-refs/02-home-timer-running-light.png` (figurative care icons: breastfeeding, breast outline, bottle, moon/zzz, diaper, pump, amount/drop — teal accent when selected/running) |

---

## Decision 1: home / care packaging

### Option 1 — Extend home in place + thin shared helpers

**What it is:**
Keep `baby-home.tsx` as the owner of the locked 4-row layout. Widen the existing breast timer store + quick-care paths for pump sides. Extract only small pure helpers (copy keys, guideline accordion state, timer side union) shared with feed/sleep/diaper. Do **not** invent a second care-chip product module this pass.

**Example:**
`BabyHome` renders Rows 1–3 + `BabyCareGuidelines` (local). Feed form adds `pump_l`/`pump_r` chips that call the same widened store + createFeed duration path. Sleep form mirrors Nap Start/End + Tap-to-stop + Done-flash via the same done-flash helper.

**Pros:**

- Matches today’s home ownership; skeleton parity stays obvious.
- Less glue; honors locked IA without a premature abstraction.
- Faster path to Gate B / Build for night UX.

**Cons:**

- Home file grows (Rows 3–4 + icons + pump amount).
- Some duplicated chrome between home and feed/sleep until a later extract.

### Option 2 — Extract shared TimedCareChip module

**What it is:**
Build a reusable timed-care chip (icon + idle/running/Done + Tap-to-stop) used by home, feed, and sleep. Home becomes a thin layout shell of shared chips + guidelines.

**Example:**
`<TimedCareChip … />` on home Row 3 and on `/baby/feed`; Nap/Sleep both mount the same **chrome** with different adapters (see Chosen design).

**Pros:**

- One chrome contract; pixel/behavior drift harder.
- Cleaner long-term if more surfaces need the same chip.

**Cons:**

- Up-front extract while layout, icons, guidelines, and Growth removal also ship — high merge risk.
- Easy to overfit abstraction before home rows stabilize.
- Skeleton wiring scatters across module + page.

## Tradeoffs

| Factor | Option 1 | Option 2 |
|--------|----------|----------|
| Cost / time | Medium extend | Higher extract + rewire |
| Complexity | One home owner + helpers | Shared module + many call sites |
| Usability | Same if locks held | Same only if extract stays pixel-true |
| Failure cases | Drift on feed/sleep chrome | Missed home-only props / CLS on extract |

## Recommendation

**Pick Option 2** (human override 2026-09-19) — shared TimedCareChip so home / feed / sleep stay pixel+behavior aligned (especially D5 sleep≈Nap). Accept extract risk this pass.

## Chosen design (user-approved)

**Decision 1 → Option 2** — Extract shared TimedCareChip module; home is thin layout shell (Rows 1–4 + exclusive guidelines).

**Icons:** Match `ui-refs/02-home-timer-running-light.png` for care button iconography (not text-only chips).

### TimedCareChip contract (chrome only)

**File path:** `components/baby-timed-care-chip.tsx` (new; name may match repo naming when Build lands).

**Chrome only — what the chip owns:**

| Prop / chrome | Behavior |
|---------------|----------|
| `icon` | Figurative care icon (ui-ref 02 spirit) |
| Idle | Label + Tap to start |
| Running | Elapsed + **Tap to stop** (never Done while running) |
| Done | ~2s done-flash after stop, then idle |
| Layout chrome | `min-h-14` / `fx-hit-40`; concentric radii; selected/running teal |

**Adapters (wire behavior — not inside the chip):**

| Adapter | Surfaces | State / mutate path |
|---------|----------|---------------------|
| **(1) Care-timer sides** | Home Breast L/R, Pump L/R; feed Breast/Pump L/R | Widened client care-timer store (`breast_l\|breast_r\|pump_l\|pump_r`) + quick-care timed-side stop / `createBabyFeed` duration |
| **(2) Nap / Sleep open session** | Home Nap; `/baby/sleep` | **Server open-session** start/end (home `SLEEP` quick-care; sleep form Start/End mutations) — **not** the care-timer store |

**Out of TimedCareChip (separate controls):**

- Bottle (`FORMULA` + ml chips)
- Diaper (kind chips)
- Pump amount (`PUMP_AMOUNT` + ml chips — Bottle-like)

**D5:** Sleep ≈ Nap via **shared chrome** + adapter (2). Do **not** stuff Nap/Sleep into `careTimer`. Do **not** fork three unrelated chip UIs.

---

## Sequence diagram

```mermaid
sequenceDiagram
  participant UI as BabyHomeOrFeedOrSleep
  participant Chip as TimedCareChip
  participant Store as CareTimerStore
  participant GQL as POST /api/graphql/baby
  participant QC as features/baby/server/quick-care
  participant Care as features/baby/server/care-events
  participant DB as Postgres

  Note over Chip,UI: Chrome only — adapters choose Store vs SLEEP session

  alt adapter (1) care-timer side start
    UI->>Chip: idle → tap
    UI->>Store: start(side breast_*|pump_*)
    Note over UI,Chip: elapsed + Tap to stop (never Done)
  else adapter (2) Nap/Sleep start
    UI->>Chip: idle → tap
    UI->>GQL: babyQuickCare SLEEP start (or sleep form Start)
    GQL->>QC: open sleep session
    QC->>DB: INSERT/UPDATE sleep open
    Note over UI,Chip: running chrome via open session — not careTimer
  end

  alt adapter (1) care-timer side stop
    UI->>Store: stop(side) → durationSec
    Store-->>UI: clear running
    UI->>Chip: Done flash ~2s
    UI->>GQL: babyQuickCare kind BREAST + side pump_l|pump_r|breast_* + breastRunning duration
    GQL->>QC: plan + steps (duration-only)
    QC->>Care: createFeed method = side + durationSec
    Care->>DB: INSERT baby_feed_event / legs
  else adapter (2) Nap/Sleep end
    UI->>GQL: babyQuickCare SLEEP end (or sleep form End)
    GQL->>QC: close sleep session
    QC->>DB: UPDATE sleep end
    UI->>Chip: Done flash ~2s
  else feed form one-tap (timed side)
    UI->>GQL: createBabyFeed method pump_l|pump_r + durationSec
    GQL->>Care: Zod + workspace scope
    Care->>DB: INSERT
  else Pump amount idle (no breastRunning)
    UI->>GQL: babyQuickCare kind PUMP_AMOUNT + amountMl, breastRunning null
    GQL->>QC: createPumpAmount only
    QC->>Care: createFeed method pump + amountMl
    Care->>DB: INSERT amount only
  else Pump amount with running timed side (FORMULA parity)
    Note over UI,Store: Client sends breastRunning + clears timer (localAfter)
    UI->>GQL: PUMP_AMOUNT + amountMl + breastRunning side/duration
    GQL->>QC: saveBreast (or timed-side save) then createPumpAmount
    Note over QC: writesFeed includes PUMP_AMOUNT (like FORMULA); feedSession merge
    QC->>Care: duration leg then method pump + amountMl
    Care->>DB: INSERT duration + amount legs
  else validation fail
    UI->>GQL: bad method/side/amount (e.g. unknown side)
    GQL-->>UI: BAD_USER_INPUT (Zod) — no DB write
  end

  Note over UI: Growth capture has no pump chip (history read OK)
  Note over UI,GQL: Auth/ownership failures stay NOT_FOUND (workspace scope)
```

---

## Contracts

### API contracts

No new GraphQL **operation** names required. Extend feed method union + quick-care action kinds/sides.

| Item | Detail |
|------|--------|
| Method + path (or name) | Existing Baby GraphQL: `createBabyFeed` / update feed; `babyQuickCare` (or today’s quick-care mutation) |
| Auth / who can call | Authenticated user + Baby workspace cookie; server scopes by workspace/baby |
| Timed pump create | `method` ∈ `pump_l` \| `pump_r`; `durationSec` required on stop; **no** amount required |
| Pump amount create | `method: "pump"` + `amountMl` (same Bottle/formula amount spirit); not a timer |
| Breast / formula / sleep / diaper | Unchanged shapes; sleep log matches home Nap start/end rules |

#### Quick-care timed-side schema (locked — no “or”)

| Field | Locked shape |
|-------|--------------|
| Timed tap action | Keep `action.kind: "BREAST"` for **all** timed L/R taps (breast **and** pump). Do **not** rename to `TIMED_SIDE` this pass. |
| `action.side` | Widen app/Zod (+ GraphQL input) union to `breast_l \| breast_r \| pump_l \| pump_r` |
| `breastRunning` | Keep field name for compat; `side` uses the **same** widened union; `durationSec` positive int on stop |
| Server map | `side` → feed `method` 1:1; duration-only create (no amount) |
| Example stop Pump L | `{ action: { kind: "BREAST", side: "pump_l" }, breastRunning: { side: "pump_l", durationSec: 420 }, clientRequestId }` |

#### Pump amount quick-care wire (locked — not FORMULA)

| Field | Locked shape |
|-------|--------------|
| Home path | **New** quick-care `action.kind: "PUMP_AMOUNT"` + required `amountMl` (Zod) |
| Server step name | **`createPumpAmount`** — writes feed `method: "pump"` + `amountMl` (sibling of `createFormula` → `formula`) |
| Do **not** | Send `FORMULA` and hope for `method: "pump"`; do **not** overload FORMULA |
| Feed log path | May use `createBabyFeed` with `method: "pump"` + `amountMl` directly (same payload; no auto-finalize table) |

Bottle stays `FORMULA` → `method: "formula"`. Pump amount is a **sibling** amount action, not a formula override.

#### `PUMP_AMOUNT` ≡ FORMULA for auto-finalize / planner (locked)

Night parity with Bottle: `PUMP_AMOUNT` joins the same auto-finalize family as `FORMULA` in `BABY_AUTO_FINALIZE_TABLE` + `planBabyQuickCare` / `requestWritesFeed` / server chain. Do **not** invent an “amount-only, never finalize” path.

| Rule | Locked behavior |
|------|-----------------|
| `writesFeed` | Include `PUMP_AMOUNT` the same way as `FORMULA` (today: `Boolean(breastRunning) \|\| action.kind === "FORMULA"` → also `\|\| action.kind === "PUMP_AMOUNT"`) so feedSession merge runs when amount or timed side writes feed |
| Idle (no timed side) | `breastRunning: null` → server steps = **`createPumpAmount` only** (amount write) |
| Running timed side | Client sends `breastRunning` (widened side + `durationSec`) → **save timed side duration** (existing `saveBreast` / duration step) **then** **`createPumpAmount`**; **clear** care-timer (`localAfter.clearBreastTimer` / stop session) like Bottle |
| Nap open | Same order as Bottle row: save timed side (if any) → `endNap` if nap open → `createPumpAmount` |
| Adopt session | Treat `createPumpAmount` like `createFormula` in `adoptFeedSessionAfterQuickCare` feed-step filter |
| Notify / messages | New step message key for `createPumpAmount` (mirror formula step copy spirit) |

**Examples:**

```text
# Idle Pump amount (amount only)
{ action: { kind: "PUMP_AMOUNT", amountMl: 90 }, breastRunning: null, clientRequestId }
# expectServerSteps: ["createPumpAmount"]

# Pump amount while Pump R (or any timed side) running — FORMULA parity
{ action: { kind: "PUMP_AMOUNT", amountMl: 90 },
  breastRunning: { side: "pump_r", durationSec: 90 }, clientRequestId }
# localAfter: clearBreastTimer true; stopBreastSession true
# expectServerSteps (nap closed): ["saveBreast", "createPumpAmount"]
# expectServerSteps (nap open):  ["saveBreast", "endNap", "createPumpAmount"]
```

#### Feed session rollup / summary / timeline (locked)

Update `lib/baby-feed-session.ts` (+ timeline label helpers) so amount-bearing `pump` and duration-bearing `pump_l`/`pump_r` behave correctly:

| Helper | Rule |
|--------|------|
| `mergeFeedLegs` | Unchanged spirit — key by `method`; sum `durationSec` and/or `amountMl` per method |
| `feedSessionSummaryParts` | `formula` **and** `pump` (amount): keep leg if `amountMl > 0`. `breast_*` / `pump_l` / `pump_r`: keep if `durationSec > 0`. Do **not** treat `pump` as duration-only |
| `rollUpFeedPayload` | Sum `durationSec` from duration legs (`breast_*`, `pump_l`, `pump_r`, and any legacy duration on other methods). Sum `amountMl` from **`formula` and `pump`**. Primary `method`: last non-amount-only preference — prefer last duration side when present; if session is amount-only (`formula`/`pump`), use that amount method. Legacy “skip `pump` for primary when treating it as duration-ish” no longer applies to amount-bearing `pump` |
| Timeline / Insights labels | `pump_l` / `pump_r` → Pump L / Pump R (duration style like breast). `pump` + ml → amount style like formula (ml template). Growth kind `pump` stays generic “Pump” |

#### Errors / other

| Item | Detail |
|------|--------|
| Success | Existing feed/care row types |
| Errors | `BAD_USER_INPUT` on Zod fail (unknown method/side, missing amount on `PUMP_AMOUNT`/`FORMULA`, etc.); `NOT_FOUND` on cross-workspace |
| Telegram | Keep `/feed pump` → legacy `pump`; optional later `pump_l`/`pump_r` tokens (Non-goal full bot redesign) |
| Growth | **No** create/update UI for growth kind `pump`; DB enum may remain for history reads |

**Events / other module APIs:** Insights/timeline label maps for `pump_l`/`pump_r` + generic “Pump” for legacy feed `pump` / growth pump rows.

### Database contracts

| Table / collection | Purpose | Key fields | Indexes / uniques | Write owner | Read owners |
|--------------------|---------|------------|-------------------|-------------|-------------|
| Feed events / legs (existing) | Care feed payloads | **App/Zod method union** adds `pump_l`, `pump_r`; keep `pump` — methods live in JSON/`BabyFeedPayload`, **not** a Postgres enum migration | existing | care-events / quick-care | Home, feed, Insights |
| `baby_growth_entry.kind` | Growth history | keep `pump` for **reads**; no new Growth write UI | existing | unchanged this pass | Insights / Growth list |
| Client timer localStorage | One running timed side | key bumped (e.g. `baby.careTimer.v1`); sides `breast_l\|breast_r\|pump_l\|pump_r`; migrate from `baby.breastTimer.v1` | n/a | client only | home + feed (adapter 1 only — **not** Nap/Sleep) |

**Data ownership notes:**

- Timed pump = **feed** methods, not growth kinds.
- Do **not** drop growth enum `pump` this pass (Non-goal migrate).
- One client timer store family (Analysis D2 locked) for adapter (1) only.
- Do **not** invent a PG feed-method enum migration for `pump_l`/`pump_r`.

### Example queries

```sql
-- Example 1: insert timed Pump L (duration only)
INSERT INTO baby_feed_event (/* workspace, baby, method, duration_sec, … */)
VALUES ($workspace, $baby, 'pump_l', 420, /* … */);
-- (Use repo’s real feed/legs tables via care-events — placeholders OK.)
```

```sql
-- Example 2: insert Pump amount (legacy method + ml)
INSERT INTO baby_feed_event (/* … */, method, amount_ml)
VALUES (/* … */, 'pump', 90);
```

```sql
-- Example 3: Insights still reads legacy growth pump rows (no new writes)
SELECT id, kind, value_num, unit, recorded_at
FROM baby_growth_entry
WHERE workspace_id = $workspace AND baby_id = $baby AND kind = 'pump'
ORDER BY recorded_at DESC;
```

---

## Patterns to reuse

| Pattern | Why it fits | Reference |
|---------|-------------|-----------|
| Breast timer + done-flash | Pump L/R same start→stop→Done (adapter 1) | `lib/baby-breast-timer-store.ts`, `lib/baby-home-done-flash.ts`, home cards |
| Bottle ml chips | Pump amount secondary | `components/baby-bottle-ml-chips.tsx` |
| Quick-care plan + localAfter | Duration-only stop + `PUMP_AMOUNT` ≡ FORMULA auto-finalize (`createPumpAmount`) | `lib/baby-quick-care-plan.ts`, `lib/baby-quick-care-order-fixture.ts`, `features/baby/server/quick-care.ts` |
| One-tap chrome tests | Log pages stay Save-free | `components/baby-care-one-tap.test.ts` |
| Growth page chips list | Drop pump from capture only | `lib/baby-growth-page-chips.ts` |
| Exclusive accordion (local) | D3 one-open; no ui/accordion | Card + header button + `aria-expanded` |
| Icons on controls | Gate A2 | `components/icons/icon-baby-nav.tsx` |
| Skeleton parity | Zero CLS for 4 rows — **same PR as layout** | `components/baby-page-skeleton.tsx` |
| Sleep open session | Nap/Sleep adapter (2) — not careTimer | Home `SLEEP` quick-care; `baby-sleep-form` Start/End |

---

## Guideline copy outline (D4)

**Under-chip helpers (short, muted — not full bodies):**
- Breast L/R: session side hint
- Bottle / Pump amount: volume when needed
- Nap: start/end nap
- Diaper: kind cue
- Pump L/R: timed side; amount via Pump amount

**Row 4 — Feed (stub EN → mirror VI):**
- Offer when baby shows hunger cues; paced bottle if using bottles.
- Track wet diapers and weight with your clinician — not one feed alone.
- When unsure, prefer fewer long sessions over forcing volume.

**Row 4 — Sleep (stub):**
- Safe sleep: back, firm surface, clear crib.
- Short naps between feeds are normal; follow sleepy cues.
- Dark, quiet room helps; seek care for unusual breathing or limpness.

**Row 4 — Diaper (stub):**
- Change when wet/soiled; clean gently; air dry when possible.
- Rash that worsens or blisters → clinician.
- Count wet diapers over 24h as a rough intake signal.

**Row 4 — Pump (locked from idea — do not shorten table):**
- Approximate **total from both breasts per session:** Days 1–3 → 1–15 mL; Days 4–7 → 15–60 mL; Week 2 → 30–90 mL; Weeks 3–6 → 60–120 mL; After 1–6 months → 90–180 mL.
- Broad estimates—not targets. After breastfeeding may be only a few mL; instead of a full feed may be much more.
- Under 60 mL can still be adequate; over 180 mL happens too.
- Exclusive pumping: often ~8–10×/day early; later fewer as supply settles.
- Judge supply over 24h + wet diapers + weight gain—not one session.
- Sudden drop, pain, or poor weight gain → lactation consultant / pediatrician.

---

## UI / UX / mobile

- **UI concept (01b):** Follow locked 4 rows + `ui-refs/` (prefer 01 composition, 02 Tap to stop + icons, 03 Pump amount). Do not invent a second IA. Build follows **01b + Gate A2**; ignore incidental mock chrome drift.
- **80/20 (aligned, not re-argued):** #1 care chips (start/stop / amount); #2 Tap to stop + Done flash + Row 4 headers. Secondary = Custom ml, notes, Growth (no pump).
- **Layout:** Row 1 Breast L·R + Bottle; Row 2 Nap + Diaper; Row 3 Pump L·R + Pump amount; Row 4 four exclusive collapsibles (collapsed default). Icons on every big control.
- **Loading / empty / error / success:** Idle Tap to start; running elapsed + Tap to stop; stop → ~2s Done; amount chips Done like Bottle; errors via existing pending/retry + `BAD_USER_INPUT`; sleep fail-closed as home.
- **Skeleton parity (zero CLS):** Update home (+ feed if chip order changes) skeleton **in the same change** as layout Tasks 3–4. Four rows — (1) three chips, (2) two chips, (3) two timers + amount-style block, (4) **four collapsed guideline header** placeholders. Same gaps/radii (`--radius-md` outer / `--radius-sm` nested).
- **Mobile:** `min-h-14` / `fx-hit-40`; no hover-only stop; thumb stack.
- **Accessibility:** Selected = teal + text; guideline headers `aria-expanded` + panel ids; light + dark tokens; EN/VI L/R + Tap to stop / Done.
- **Day-to-day:** One-tap duration save; Pump amount only when needed; guidelines stay out of the way until expanded.
- **Feed / sleep / diaper:** Behavior parity with home; **sleep** = D5 full Nap clone spirit via TimedCareChip + adapter (2). Feed gains Pump L/R (+ amount secondary).

---

## Security design review (OWASP)

Trust boundaries:

- Browser → GraphQL Baby API (session + workspace cookie).
- Client timer localStorage (device-local; not auth) — adapter (1) only.
- Feed/quick-care payloads (method, side, duration, amount, `PUMP_AMOUNT`) → Zod at server.

Abuse cases:

- Cross-workspace feed idOR → keep `NOT_FOUND`.
- Client invents unknown method/side → Zod `BAD_USER_INPUT`.
- Oversized `amountMl` / duration → existing max rules.
- Dual pump entry if Growth pump chip left → remove capture chip.
- Guideline copy is static i18n (no user HTML) — XSS N/A if React text.

| OWASP | Status | Note |
|-------|--------|------|
| A01 Broken Access Control | pass | Keep workspace-scoped care writes |
| A02 Cryptographic Failures | N/A | No new secrets; timer is local only |
| A03 Injection | pass | Drizzle/parameterized; React escape for copy |
| A04 Insecure Design | pass | Server Zod for methods/sides; duration-only vs amount paths (`PUMP_AMOUNT` ≠ FORMULA) explicit |
| A05 Security Misconfiguration | N/A | No new CORS/headers |
| A06 Vulnerable Components | N/A | No new deps planned |
| A07 Auth Failures | pass | Reuse Baby workspace auth |
| A08 Software / Data Integrity | pass | Versioned timer key migrate; reject corrupt store |
| A09 Logging / Monitoring Failures | pass | Do not log care payloads/PII in new paths |
| A10 SSRF | N/A | No user URL fetch |

Source: https://owasp.org/Top10/

---

## Challenges answered

- **Do we need this?** Yes — dual pump homes, false Done while running, and log/home drift block the night metric.
- **What fails?** UI-only L/R (Zod/Insights/telegram break); second timer key (lost session); stuffing Nap into careTimer (D5/adapters fail); leaving Growth pump (dual entry); skeleton without Row 3–4 in same PR (CLS); sleep half-parity (D5 fails).
- **Is this overspecified?** Packaging = **Option 2** (TimedCareChip chrome + adapters) per human. Rejected: force amount on stop, independent multi-open guidelines, second timer store, Growth pump write UI, packaging Option 1, FORMULA-as-pump, PG feed-method enum.
