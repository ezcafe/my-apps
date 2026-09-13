# Tasks: Baby home logging detail polish

**Design:** [`03-design.md`](03-design.md) · **Option B + B1 + D-A approved (Gate 2).** Extend redesign Option B home — additive DIAPER fields, jsonb detail, `latestWeightKg`, **2×2 Kind tiles + Step 2 sheet (D2/W1/S1/D-A)** + **B1 bottle**. Do **not** reopen auto-finalize / lock / replay core or Option A.

**Rule:** failing test first, then code. Pure rules in `lib/` + `node:test`. Components wire only.

**Commands**

| Purpose | Command |
|---------|---------|
| Unit tests | `npm test` |
| One file / pattern | `npm test -- --test-name-pattern "<name>"` |
| Lint / typecheck | `npm run lint` |
| Build | `npm run build` |
| e2e home Option B | `npx playwright test e2e/baby-home-option-b.spec.ts` |

**Boundaries**

- ✅ **Always:** TDD; EN+VI same change; skeleton parity with layout tasks; home `babyQuickCare` writes `amount: "medium"` when Poop/Mixed amount skipped; `createBabyDiaper` omits amount unless sent; storage `dirty` + UI “Poop Only” / VI “Chỉ phân”; **W1** one sheet save; **S1** Wet/Dry instant + brief Done; **no diaper ↑↓**; **D-A** = **2×2 Kind** (not 1×4); **B1** bottle face (hero ml, stacked right ±, demoted Custom, ~2s Done/Logged).
- ⚠️ **Ask first:** Insights alerts; Step 2 notes; lb weight conversion; next-due **interval** band edits; any SQL migration.
- 🚫 **Never:** notes-dump for color/texture/amount; second home diaper mutation; progressive 4-phase diaper button; reopen quick-care order/lock/replay; undo; medical paging alerts.

---

## Task 1: Diaper detail enums and defaults

**Description:** Pure module for kinds (`wet|dirty|mixed|dry`), colors, textures, amounts, color red-flag set, texture caution set (`watery`/`hard`), “detail allowed?”, and default amount `medium`.

**Acceptance:**

- [x] Enums match `03-design.md`.
- [x] `babyDiaperDefaultAmount()` → `"medium"`.
- [x] `babyDiaperDetailAllowed(kind)` true only for `dirty`/`mixed`.
- [x] `babyDiaperColorIsRedFlag` true for `white_pale` and `red_bloody` only.
- [x] `babyDiaperTextureNeedsCaution` (or equivalent) true for `watery` and `hard` only.

**Tests (TDD — what turns red first):**

- [x] `lib/baby-diaper-detail.test.ts` — defaults, allow/deny, color red-flag + texture caution matrix.

**Files likely touched:** `lib/baby-diaper-detail.ts` + test  
**Scope:** S · **Dependencies:** none

---

## Task 2: Zod + TypeScript payload (`dry` + detail fields)

**Description:** Extend `BabyDiaperPayload`, `babyDiaperKindSchema`, `createBabyDiaperSchema`, `updateBabyEventDiaperPayloadSchema`, and `babyQuickCareSchema` with optional color/texture/amount. Reject detail on wet/dry.

**Acceptance:**

- [x] `dry` accepted as kind everywhere those schemas apply.
- [x] dirty/mixed may omit amount; **Task 3** defaults medium on **quick-care only** — schema may leave amount optional.
- [x] wet/dry + color|texture|amount → Zod validation → GraphQL **`BAD_REQUEST`** (ambiguous pending; not a new definite-no-commit code).
- [x] Old `{ kind: "wet" }` still parses.
- [x] `updateBabyEventDiaperPayloadSchema` follows the same wet/dry reject-detail + dirty/mixed optional-detail rules as create (no silent medium unless amount sent).

**Tests (TDD — what turns red first):**

- [x] `lib/validators/baby.test.ts` — dry ok; detail on wet fails; dirty+color ok; quick-care DIAPER requires kind.

**Files likely touched:** `db/schema/baby.ts`, `lib/validators/baby.ts` + test  
**Scope:** M · **Dependencies:** Task 1

---

## Task 3: Server write path — quick-care + createBabyDiaper

**Description:** Insert jsonb keys on DIAPER / createBabyDiaper. For **`babyQuickCare`** dirty/mixed, if amount missing, **write `medium`**. For **`createBabyDiaper`**, write `amount` **only when provided** (omit key otherwise). Do not change chain order, lock, or replay table.

**Acceptance:**

- [x] Quick-care wet/dry payload is kind (+ quickRequestId) only.
- [x] Quick-care dirty without amount persists `amount: "medium"`.
- [x] createBabyDiaper dirty without amount **omits** `amount` (no silent medium).
- [x] createBabyDiaper with amount / dry / detail-on-wet rules match design.
- [x] Replay still returns same steps for same `clientRequestId`.

**Tests (TDD — what turns red first):**

- [x] `features/baby/server/quick-care.test.ts` — payload shape cases incl. default medium.
- [x] `features/baby/server/care-events.test.ts` — createBabyDiaper dry + detail; omit amount when not sent; no default medium.

**Files likely touched:** `features/baby/server/quick-care.ts`, `features/baby/server/care-events.ts` + tests  
**Scope:** M · **Dependencies:** Task 2

---

### Checkpoint A (after Tasks 1–3)

- [x] `npm test` green for new diaper unit/server tests.
- [x] No change to nap lock / replay migration.
- [x] Human skim: payload examples match design.

---

## Task 4: GraphQL additive fields + yoga wiring

**Description:** Document `diaperColor` / `diaperTexture` / `diaperAmount` on `BabyQuickActionInput`; `color` / `texture` / `amount` on `CreateBabyDiaperInput`; `latestWeightKg` on `BabyHomeQuickStatus` (resolver can stub until Task 6). Wire resolvers through existing yoga tests.

**Acceptance:**

- [x] Schema compiles; yoga tests assert new input fields reach services (or null).
- [x] Existing queries without new fields still work.

**Tests (TDD — what turns red first):**

- [x] `lib/graphql/baby-yoga.test.ts` — DIAPER with detail; status field present (null ok until Task 6).

**Files likely touched:** `lib/graphql/baby-typeDefs.ts`, `lib/graphql/baby-resolvers.ts`, `lib/graphql/baby-yoga.test.ts`, `lib/baby-query-options.ts` as needed  
**Scope:** M · **Dependencies:** Task 3

---

## Task 5: Summaries and “Poop Only” display

**Description:** Map storage `dirty` → localized Poop Only in care summaries / friendly kind; include `dry`. Do not print raw `dirty` to caregivers when product copy says Poop Only. Optional: append short color/amount later — **kind label is enough this task**.

**Acceptance:**

- [x] EN summary for dirty uses “Poop Only”; VI uses **“Chỉ phân”**.
- [x] dry has a clear label (EN “Dry” / VI **“Khô”**).
- [x] Unknown kind does not throw.

**Tests (TDD — what turns red first):**

- [x] Timeline / notify summary tests for dirty→Poop Only / “Chỉ phân” and dry→“Khô”.

**Files likely touched:** `features/baby/server/timeline.ts` + tests, `messages/baby/en.ts`, `messages/baby/vi.ts`, notify tests if they assert wording  
**Scope:** S · **Dependencies:** Task 2

---

## Task 6: `latestWeightKg` on home quick status

**Description:** One growth weight SELECT in `getBabyHomeQuickStatus`; normalize kg/g; else null. Expose on GraphQL.

**Acceptance:**

- [x] Latest weight by `recordedAt` desc.
- [x] `kg` / `g` convert correctly; unknown unit → null.
- [x] No growth row → null.
- [x] Query document used by home requests `latestWeightKg`.

**Tests (TDD — what turns red first):**

- [x] `features/baby/server/home-quick-status.test.ts` — kg, g, ignore lb, empty.

**Files likely touched:** `features/baby/server/home-quick-status.ts` + test, GraphQL types if not done in Task 4, `lib/baby-query-options.ts`  
**Scope:** M · **Dependencies:** Task 4

---

### Checkpoint B (after Tasks 4–6)

- [x] Status returns `latestWeightKg` in unit tests.
- [x] GraphQL yoga green.
- [x] Summaries show Poop Only for dirty.

---

## Task 7: Retune age guide + bottle suggestion helper

**Description:** Replace/retune `FEED_GUIDE_BANDS` to design table (incl. ageDays 0–2 → 5–15 ml, concrete feedsMin/feedsMax every band). Add pure helper for suggested bottle ml using optional `weightKg` under 6 months with **`weightKg * 150 / feedsDayMid`**. **Do not** change `lib/baby-next-due.ts` interval bands.

**Acceptance:**

- [x] Band edges match design day cuts (document in test table); every band has numeric `feedsMin`/`feedsMax` (incl. 0–2 and 3–7).
- [x] No weight → mid-band default as today pattern.
- [x] With weight + age &lt; 183d → **`kg × 150 ÷ feedsDayMid`**, rounded to 10, sensible clamp (not 150–160 range).
- [x] Post-12mo bands remain usable (no newborn regression).

**Tests (TDD — what turns red first):**

- [x] `lib/baby-age-guide.test.ts` — rewrite band edge cases + assert feedsMin/feedsMax per band + weight helper with multiplier 150.

**Files likely touched:** `lib/baby-age-guide.ts` + test  
**Scope:** M · **Dependencies:** none (can parallel after Checkpoint A)

---

## Task 8: Locale-aware next-due duration

**Description:** Locale-aware duration for EN `5 min` / VI `5 phút` (and hour forms) used by **both** `home.nextIn` and `home.overdue`. Keep compact `5m` for timeline if still needed via separate helper or flag. Wire `formatBabyNextDueLabel` (next-in **and** overdue paths) to the locale-aware formatter. Align VI `home.nextIn` string.

**Acceptance:**

- [x] EN next-in **and** overdue minutes use `min` with space.
- [x] VI next-in uses `phút` and sentence “lần tiếp theo trong {duration}” (or agreed equivalent).
- [x] VI overdue uses the **same** duration helper (`phút`), not compact `5m`.
- [x] Timeline compact format unchanged **or** explicitly dual-API tested.

**Tests (TDD — what turns red first):**

- [x] `lib/baby-format-duration.test.ts` and/or `lib/baby-next-due.test.ts` — EN/VI samples for **next-in and overdue**.
- [x] `lib/baby-i18n.test.ts` if message keys change.

**Files likely touched:** `lib/baby-format-duration.ts`, `lib/baby-next-due.ts`, `messages/baby/en.ts`, `messages/baby/vi.ts` + tests  
**Scope:** M · **Dependencies:** none

---

### Checkpoint C (after Tasks 7–8)

- [x] Age band unit tests match design table (feedsMin/feedsMax + ×150).
- [x] VI/EN next-in **and** overdue unit strings look right in tests.
- [x] No accidental edits to next-due **interval** tables.

---

## Task 9: Quick-value card layout (B1 bottle + nap height)

**Description:** Restyle `BabyQuickValueCard` for **bottle (B1)** so the tall centre log matches Start nap height; **+/− stacked on the RIGHT** at **50%** height each. **Hero = ml amount**; **subtitle quieter** (prefer **next-due** / overdue over age-band on the face). **Custom demoted** to text under the card — **not** a fourth primary. Support brief **Done/Logged ~2s** flash after successful save (wire-ready; home may complete flash in Task 11). **Diaper is not a QuickValueCard** this pass (**2×2 Kind** is Tasks 10–11). Preserve a11y labels and ≥44 px targets without overlapping hit areas. Update `BabyHomeSkeleton` **bottle/nap B1** structure in **same** task (not Kind tiles yet).

**Acceptance:**

- [x] Bottle **B1** layout contracts met: height vs nap; **stacked** right ± at 50% each; hero ml; quiet next-due subtitle (band not loud on face).
- [x] **Custom** is under-card text (or equivalent demoted control) — **not** a fourth primary beside log/±.
- [x] Control/plan supports brief **Done/Logged ~2s** after successful save (or documents hook for Task 11).
- [x] No diaper ↑/↓ / arrow variant on this card (diaper leaves this component).
- [x] `BabyHomeSkeleton` mirrors bottle/nap **B1** structure (tall log + stacked right ± + under-card Custom slot; **2×2 Kind** parity is Task 10).

**Tests (TDD — what turns red first):**

- [x] `components/baby-quick-value-card.test.ts` — structure / aria for **stacked** right ±; hero ml; Custom not primary peer.
- [x] Skeleton smoke or structure test for bottle/nap **B1** if present; else manual checklist in verification.

**Files likely touched:** `components/baby-quick-value-card.tsx` + test, `components/baby-page-skeleton.tsx`  
**Scope:** M · **Dependencies:** none

---

## Task 10: Diaper 2×2 Kind tiles + Step 2 sheet (pure plan + UI)

**Description:** Pure helper: Kind tap → `instantSave` vs `openSheet` (**S1**). New **one** home Kind control as a **2×2 tile grid** (Wet | Poop / Mixed | Dry) matching Start nap / bottle **height** — replaces diaper value card; **remove diaper ↑↓ / ± entirely** (**D2** / **D-A**). **Reject 1×4 horizontal strip.** Icons + short labels OK; **full names in `aria-label`**. New sheet UI (color swatches, texture chips, amount smear→medium→blowout, **color red-flag warn** + **watery/hard texture caution** copy, no notes) with **local draft only until Save** (**W1**); **Step 2 sheet unchanged** from prior product lock. Default amount medium on home save plan. Reuse home Modal patterns (`baby-custom-ml-modal` style). Update **`BabyHomeSkeleton` 2×2 Kind parity in the same change** (order, height, radii vs nap/bottle row; **not** 1×4) — CLS.

**Acceptance:**

- [x] Control is **one** Kind UI with **exactly four tiles in a 2×2 grid** (e.g. Wet | Poop / Mixed | Dry); height matches Start nap / bottle contract.
- [x] **Not** a 1×4 horizontal strip in live UI or skeleton.
- [x] **No** diaper side steppers / ↑↓ / value-cycle affordance in live UI or skeleton.
- [x] Icons + short labels OK; each tile has **full name** in `aria-label` (e.g. “Poop Only”).
- [x] Wet/Dry → instant save plan with kind only (**S1**); plan/UI supports brief Done then ready-again.
- [x] Poop/Mixed → open sheet; edits stay **local** until Save (**W1**); save plan includes color/texture/amount (default medium for home); cancel discards draft with no mutation; sheet fields/flow unchanged.
- [x] Red-flag colors (`white_pale` / `red_bloody`) show warn copy in sheet; value still selectable / stored.
- [x] Caution textures (`watery` / `hard`) show in-sheet caution copy (warn labels); value still selectable / stored — same spirit as color red-flags; **no Insights alerts**.
- [x] `BabyHomeSkeleton` mirrors **2×2 Kind** geometry in the **same** change as the live control (not deferred to Task 11).

**Tests (TDD — what turns red first):**

- [x] Pure plan tests (new `lib/baby-diaper-quick-plan.ts` or similar) — Wet/Dry instant vs Poop/Mixed openSheet; W1 “no mutation until save” documented in plan shape.
- [x] Component/structure test for **2×2 tiles** (not 1×4) + height contract vs nap/bottle if project pattern allows.
- [x] Sheet component test for default amount + color red-flag + texture caution visibility if project pattern allows; else pure + e2e later.
- [x] Skeleton structure assertion or checklist for **2×2 Kind** vs bottle/nap row (no stepper placeholders; no 1×4 strip).

**Files likely touched:** new lib + test, `components/baby-diaper-kind-control.tsx` / `baby-diaper-detail-sheet.tsx` (names as fit), messages, `components/baby-page-skeleton.tsx`  
**Scope:** M · **Dependencies:** Task 1, Task 9

---

## Task 11: Wire Baby home — 2×2 Kind, sheet, last ml, B1 bottle guide

**Description:** Replace diaper cycle / ↑↓ with **2×2 Kind + sheet** → `babyQuickCare` only (**W1** one save for sheet path; **S1** Wet/Dry instant + brief Done). Bottle uses retuned guide + `latestWeightKg` with **B1** face (hero ml, quiet next-due, stacked ±, demoted Custom, **Done/Logged ~2s** after success). Row 3 shows last `amountMl` when present. Keep pending fail-closed path.

**Acceptance:**

- [x] Wet/Dry one tap saves kind only and shows brief Done then ready again.
- [x] Poop/Mixed opens sheet; no `babyQuickCare` until Save; then one mutation with jsonb fields.
- [x] Last feed line shows ml when payload has `amountMl`.
- [x] Bottle suggested ml uses Task 7 helper; breast unchanged; bottle keeps **B1** stacked right ±; band not loud on face; Custom under card.
- [x] Successful bottle save shows **Done/Logged ~2s** then ready.
- [x] Guideline / caveat copy visible where design requires (not competing as bottle hero).

**Tests (TDD — what turns red first):**

- [x] Extend `components/baby-home.test.ts` for last-ml rendering and kind→plan wiring where pure.
- [x] Rely on e2e Task 13 for full sheet + Done flow if component tests stay thin.

**Files likely touched:** `components/baby-home.tsx` + test, query options, messages  
**Scope:** M · **Dependencies:** Tasks 3–10

---

### Checkpoint D (after Tasks 9–11)

- [x] `npm test` + `npm run lint` green.
- [x] Manual or story: **2×2 Kind** + sheet in light/dark; Wet/Dry Done flash; **B1** bottle (hero ml, stacked ±, Custom under, ~2s Logged); no diaper steppers; not 1×4.
- [x] Skeleton matches live home row 2 (**B1** bottle ± + **2×2 Kind**).

---

## Task 12: i18n completeness pass

**Description:** Audit all new Kind / Step 2 / warn / texture-caution / last-ml / guide / Done-Logged / demoted-Custom keys in EN and VI. Ensure Poop Only / “Chỉ phân” and Dry / “Khô” strings exist (full aria + any short tile labels). Include color red-flag warn keys and watery/hard caution keys (settled #6 / #6b).

**Acceptance:**

- [x] No missing-key fallbacks for new UI in either locale.
- [x] VI next-due sentence uses phút duration from Task 8 (next-in **and** overdue keys consistent).
- [x] Color red-flag warn + texture caution (`watery`/`hard`) keys present in EN and VI.
- [x] Done/Logged (~2s) and under-card Custom strings present in EN and VI.

**Tests (TDD — what turns red first):**

- [x] `lib/baby-i18n.test.ts` key presence checks for new keys.

**Files likely touched:** `messages/baby/en.ts`, `messages/baby/vi.ts`, i18n tests  
**Scope:** S · **Dependencies:** Tasks 5, 8, 10, 11

---

## Task 13: e2e Option B rewrite (diaper + B1 layout smoke)

**Description:** Replace wet→dirty→mixed ± / ↑↓ cycle assertions. Cover Wet instant save (+ Done ready-again), Dry instant save, Poop → sheet → **one** save, **Mixed → sheet → one save**, assert **2×2 Kind tiles** (not 1×4) when selectors allow, bottle **B1** height / stacked right ± / Done~2s smoke if stable selectors exist, last ml when seeded feed has amountMl, and **VI next-due** copy when locale is VI.

**Acceptance:**

- [x] Old cycle / diaper stepper / 1×4 Kind tests removed or rewritten.
- [x] Wet/Dry/Poop/**Mixed** paths pass against local app (**W1** = no mid-sheet save required).
- [x] No reliance on vertical +/− or ↑/↓ diaper value controls; assert **four Kind tiles in 2×2** when selectors allow.
- [x] **Last ml** visible on row 3 when seeded last feed has `amountMl` (match idea success + `03` e2e strategy).
- [x] When locale is VI, next-due assertion contains `lần tiếp theo trong` and `phút` (or agreed string from Task 8).
- [x] *(Optional smoke)* Bottle **B1**: log height vs nap, stacked right ±, and/or Done/Logged flash when selectors are stable — soft-require only; do not fail the suite if selectors are flaky.

**Tests (TDD — what turns red first):**

- [x] `e2e/baby-home-option-b.spec.ts` (and helpers) fail on old selectors first, then pass.

**Files likely touched:** `e2e/baby-home-option-b.spec.ts`, `e2e/helpers/baby-home-graphql.ts`, related care e2e if needed  
**Scope:** M · **Dependencies:** Task 11

---

### Checkpoint E (after Tasks 12–13)

- [x] `npm test && npm run lint && npm run build` green.
- [x] Playwright option-b green.
- [x] Ready for design-review re-run → Gate 2 when clean.

---

## Task index

| # | Title | Scope | Depends |
|---|-------|-------|---------|
| 1 | Diaper detail enums | S | — |
| 2 | Zod + payload types | M | 1 |
| 3 | Server write path | M | 2 |
| 4 | GraphQL additive | M | 3 |
| 5 | Summaries Poop Only | S | 2 |
| 6 | latestWeightKg status | M | 4 |
| 7 | Age guide retune | M | — |
| 8 | Next-due duration locale | M | — |
| 9 | Quick-value card (B1 bottle) | M | — |
| 10 | 2×2 Kind tiles + Step 2 sheet | M | 1, 9 |
| 11 | Wire baby home | M | 3–10 |
| 12 | i18n pass | S | 5, 8, 10, 11 |
| 13 | e2e rewrite | M | 11 |

**Parallel-friendly after Checkpoint A:** Tasks 5, 7, 8, 9 can proceed beside 4→6 if contracts are stable.
