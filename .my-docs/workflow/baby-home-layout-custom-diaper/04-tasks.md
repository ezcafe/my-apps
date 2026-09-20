# Tasks: Baby care layout — custom time, Diaper row, timer copy

## Task 1: Additive quick-care occurredAt / endedAt

**Description:** Extend GraphQL `BabyQuickCareInput` + Zod `babyQuickCareSchema` with optional `occurredAt` and `endedAt` (ISO offset). Pass through `runBabyQuickCare` into existing sleep start/end and diaper create helpers. No DB migration.

**Acceptance:**

- [ ] Schema/types document optional strings; omit = server now
- [ ] DIAPER + `occurredAt` and SLEEP start/end with times persist correctly (truth table in `03-design.md`)
- [ ] Unused time fields **IGNORE** this pass: wrong field on SLEEP/DIAPER path; both fields on BREAST/FORMULA/PUMP_AMOUNT (do not apply to those inserts)
- [ ] Open nap + SLEEP + only `occurredAt` → nap `endedAt` is server now (`occurredAt` ignored for the end write)
- [ ] Open nap + SLEEP + `endedAt` → nap ends at that `endedAt`
- [ ] Auto-endNap clock (**non-SLEEP** kinds only): `endedAt` if set else `occurredAt` if set else server now
- [ ] Invalid datetime rejected at Zod edge (including present fields later IGNORE-applied); auth/workspace unchanged
- [ ] Same `clientRequestId` → stored replay only (no body-hash); client must not reuse id with different times

**Tests (TDD — what turns red first):**

- [ ] Unit: Zod accepts valid ISO; rejects garbage (`babyQuickCareSchema`)
- [ ] Yoga/unit: DIAPER with `occurredAt` reaches handler; SLEEP end with `endedAt` reaches handler
- [ ] Unit/Yoga: **SLEEP start** (no open nap) + `occurredAt` → inserted sleep `occurredAt` matches input (not server now) — from `04a`
- [ ] Unit: DIAPER (no open nap) + only `endedAt` → diaper insert uses server now; `endedAt` IGNORE — from `04a`
- [ ] Unit: BREAST/FORMULA/PUMP_AMOUNT with `occurredAt`/`endedAt` → times ignored (insert uses server now)
- [ ] Unit: open nap + SLEEP + only `occurredAt` → nap `endedAt` is server now (not `occurredAt`)
- [ ] Unit: open nap + SLEEP + `endedAt` → nap ends at that end time
- [ ] Unit: open nap + DIAPER (or feed) with times → auto-endNap uses `endedAt` else `occurredAt` else now
- [ ] Unit: same `clientRequestId` + different times → `replayed: true` + first write’s times
- [ ] Negative: bad datetime → BAD_REQUEST

**Files likely touched:** `lib/graphql/baby-typeDefs.ts`, `lib/validators/baby.ts`, `features/baby/server/quick-care*`, `lib/graphql/baby-yoga.test.ts`, `lib/validators/baby.test.ts`

**Scope:** M

**Dependencies:** none

**Security check:** Validate datetime at edge only; never take workspace id from body.

---

## Task 2: Custom time modal + Nap/Diaper Custom (clock)

**Description:** Shared Custom **time** modal (Insights-style datetime). Nap and Diaper Custom open it; pending ISO feeds home quick-care and log sleep/diaper forms. Diaper kinds stay on 2×2. Distinct from Custom **ml**.

**Acceptance:**

- [ ] Nap Custom and Diaper Custom set/change/clear custom clock time
- [ ] Home saves use Task 1 fields; log uses existing `occurredAt` / `endedAt` on creates/end
- [ ] **Pending clock field map:** Nap idle → `occurredAt`; Nap running (end) → `endedAt`; Diaper → `occurredAt` (Auto-endNap on that Diaper request uses truth table — do not send `endedAt` alone for Diaper)
- [ ] Diaper kind tiles still selectable; Custom does not replace a kind
- [ ] EN/VI labels distinguish time Custom vs ml Custom

**Tests (TDD — what turns red first):**

- [ ] Unit: pending time state helpers (set / clear / apply to mutation vars)
- [ ] Unit: three map cases — Nap idle pending → vars include `occurredAt` (not `endedAt` alone); Nap running pending → vars include `endedAt`; Diaper pending → vars include `occurredAt`
- [ ] Form/home: Nap **running** + pending → mutation vars have **`endedAt`** (not only `occurredAt`); Diaper/`Nap idle` → `occurredAt` — from `04a`
- [ ] Component: Custom opens modal; confirm seeds pending; change existing pending time
- [ ] Form/home: sleep/diaper mutation vars include ISO when pending
- [ ] Optional: clear pending clock after successful save; kind tiles still work beside Custom

**Files likely touched:** new or shared custom-time modal, `components/baby-home.tsx`, `components/baby-sleep-form.tsx`, `components/baby-diaper-form.tsx`, `messages/baby/en.ts`, `messages/baby/vi.ts`

**Scope:** M

**Dependencies:** Task 1

**UI/mobile:** ≥44px hits; modal usable one-handed; focus trap/labels.

---

## Task 3: Diaper row above Pump + Nap-sized Custom sibling

**Description:** Home layout: Nap row (Nap + Custom time) → Diaper row (2×2 + Custom sibling **same size as Nap**) → Pump row. Update skeleton markers/order same change. Log diaper section mirrors sibling placement where applicable.

**Acceptance:**

- [ ] Diaper visually above Pump on home
- [ ] Diaper Custom sibling beside 2×2; height/width match Nap big control token
- [ ] Skeleton row order/markers match live (zero CLS)
- [ ] Existing diaper detail / Done flash still work

**Tests (TDD — what turns red first):**

- [ ] Unit/component: row order / `data-*` markers for nap, diaper, pump
- [ ] Skeleton test: same marker order as live
- [ ] Diaper Custom uses Nap control height token (`BABY_HOME_BIG_CONTROL_MIN_H` or equivalent)

**Files likely touched:** `components/baby-home.tsx`, `components/baby-page-skeleton.tsx`, `components/baby-diaper-kind-control.tsx`, `lib/baby-home-control-height.ts`

**Scope:** M

**Dependencies:** Task 2 (Custom control present)

**UI/mobile + skeleton parity:** mandatory skeleton update; container-query friendly grid; no hardcoded breakpoints.

---

## Task 4: Pump L/R width = Breast L/R

**Description:** Restructure Pump home (and pump log form if needed) to Breast-style **12rem section + nested L/R pair**, amount in sibling section. Stop sharing one 8rem 3-col `asContents` row with amount.

**Acceptance:**

- [ ] Pump L and R hit targets match Breast L/R width pattern
- [ ] Amount chips remain usable; height token alignment preserved
- [ ] Skeleton pump section mirrors new grid

**Tests (TDD — what turns red first):**

- [ ] Component/layout asserts: Pump sides not in same equal 3-col as amount (`asContents` limited)
- [ ] Skeleton parity for pump sections
- [ ] Existing pump side start/stop + amount tests still pass

**Files likely touched:** `components/baby-home.tsx`, `components/baby-pump-side-pair.tsx`, `components/baby-pump-form.tsx`, `components/baby-page-skeleton.tsx`

**Scope:** M

**Dependencies:** none (can parallel Task 2–3 after Task 1 if needed)

---

## Task 5: Merged stop title on all timed chips + Done center

**Description:** When running, chip label = `{endTitle} - {tapToStop}` for Nap, Breast L/R, Pump L/R. Remove duplicate stop subtitle. Fix Done overlay horizontal center on shared face (`justify-center` / no left-skew from reserved slots).

**Acceptance:**

- [ ] All timed chips show merged stop title while running (EN + VI)
- [ ] Elapsed stays on value line; no duplicate “Tap to stop” subtitle
- [ ] Done flash centered horizontally in the button
- [ ] Narrow wrap acceptable (short connector ` - `)

**Tests (TDD — what turns red first):**

- [ ] Unit/component: running label composition helper or chip prop
- [ ] Assert no separate subtitle stop when running
- [ ] Done face slot / overlay uses horizontal center
- [ ] Update tests that expected old subtitle copy

**Files likely touched:** `components/baby-timed-care-chip.tsx`, `components/baby-quick-value-card.tsx`, `messages/baby/en.ts`, `messages/baby/vi.ts`, related `*.test.ts`

**Scope:** S

**Dependencies:** none

**UI/mobile:** readable on small viewport; contrast via tokens.

---

## Task 6: Custom ml — keep save-on-second-tap + Edit affordance

**Description:** Bottle/Pump Custom: second tap still saves pending ml. Add separate **Edit** control that opens `BabyCustomMlModal` seeded with current override. Home + feed/pump forms.

**Acceptance:**

- [ ] Second Custom tap saves (muscle memory kept)
- [ ] Edit reopens modal; change ml; Use updates pending/selection
- [ ] **Edit placement:** outside the flush ml 2×2 (not a fifth tile); flush grid unchanged
- [ ] Edit has accessible name (visible label or sr-text); ≥44px hit; no overlap with Custom hit area
- [ ] Done flash still targets Custom tile when from-custom

**Tests (TDD — what turns red first):**

- [ ] Unit: selection helpers distinguish save tap vs edit open
- [ ] Component: pending → Custom saves; Edit opens modal with `initialMl`
- [ ] Component/layout: Edit is outside the ml 2×2; Custom hit still exclusive; accessible name present
- [ ] Regression: confirm-then-chip-save still works; flush 2×2 geometry unchanged

**Files likely touched:** `components/baby-home.tsx`, `components/baby-bottle-ml-chips.tsx`, `components/baby-feed-form.tsx`, `components/baby-pump-form.tsx`, `lib/baby-home-bottle-selection.ts`, `messages/baby/*`

**Scope:** M

**Dependencies:** none (parallel with Task 5)

**UI/mobile:** Edit outside ml 2×2; ≥44px; accessible name; no overlap with Custom; flush grid intact.

---

## Task 7: E2E home + log coverage

**Description:** Playwright (or existing baby e2e helpers): home row order, Nap/Diaper Custom time happy path, Pump width/section smoke, merged stop title, Custom ml save + Edit, and at least one log route (sleep or diaper) with custom time.

**Acceptance:**

- [ ] Home e2e: Diaper above Pump; Custom time path; running title contains tap-to-stop
- [ ] Home e2e: Custom ml second-tap save + Edit reopen
- [ ] Log e2e: sleep or diaper custom time save
- [ ] Update obsolete selectors (`home-row-nap-diaper`, old subtitle asserts)

**Tests (TDD — what turns red first):**

- [ ] Failing e2e specs updated/added before UI green (reproduce → red → fix)
- [ ] GraphQL mock/helpers accept `occurredAt` / `endedAt` on quick-care when used
- [ ] E2E Custom time paths assert request body fields: Nap start → `occurredAt`; Nap end → `endedAt`; Diaper → `occurredAt` — from `04a`

**Files likely touched:** `e2e/baby-home-*.spec.ts`, `e2e/helpers/baby-home-graphql.ts`, log e2e if present

**Scope:** M

**Dependencies:** Tasks 1–6

**Security check:** e2e stays on test workspace; no real secrets.

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused unit tests pass
- [ ] Skeleton parity checked for any layout task
- [ ] Slice works on home; log smoke when forms touched
- [ ] Light + dark quick visual check for Done / stop title / Custom

## Definition notes (Build)

- **Has API:** yes — Task 1 required before home Custom time green.
- **Has DB:** no — do not add migrations.
- **Settled:** D1 clock Custom; D2 Nap-sized Diaper Custom sibling; D3 all timed chips; D4 ml save + Edit — do not relitigate.
