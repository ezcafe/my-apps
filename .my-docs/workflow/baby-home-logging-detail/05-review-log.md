# Review log: baby-home-logging-detail

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-diaper-detail-sheet.tsx` (no `*.test.ts`); `e2e/baby-home-option-b.spec.ts:559–672` | **Step 2 sheet critical UX untested.** Task 10 requires in-sheet color red-flag warn, watery/hard texture caution, and cancel discard with no mutation (W1). Pure helpers only cover predicates (`baby-diaper-detail.test.ts`). There is no sheet component test. e2e opens Poop/Mixed and clicks Save with default medium only — never selects `white_pale`/`red_bloody`/`watery`/`hard`, never asserts warn copy, never cancels and asserts `quickCareCount() === 0`. Real failure modes (warn missing, cancel still saves) would not turn red. | fixed |
| Major | `components/baby-diaper-kind-control.test.ts:8–35`; `e2e/baby-home-option-b.spec.ts:587–591`, `667–671`; `components/baby-home.tsx:416–419` | **S1 Done → ready-again untested.** Task 10/13 require Wet/Dry brief Done then labels again. Kind control accepts `doneKind`/`doneText` but the structure test never passes them or asserts Done on the tile. e2e Wet/Dry only checks the mutation body — no Done text, no return to Wet/Dry short labels. Home `setTimeout(..., BABY_HOME_DONE_MS)` wiring has no unit or e2e coverage. | fixed |
| Enhancement | `components/baby-page-skeleton.tsx:52–78` (no skeleton test) | **Skeleton B1 + 2×2 parity untested.** Tasks 9–10 ask for skeleton structure assertion (or checklist). Live UI has `data-layout` tests; skeleton has `data-skeleton="b1-bottle"` and `data-skeleton="diaper-kind-2x2"` but nothing asserts those, `grid-cols-2`/`grid-rows-2`, stacked ± placeholders, or absence of diaper stepper placeholders. CLS / 1×4 regressions would pass CI. | fixed |
| Enhancement | `features/baby/server/home-quick-status.test.ts` (`defaultFindLatestWeightKg`); `home-quick-status.ts` | **`latestWeightKg` status path still mock theater (re-verify).** Pure `normalizeGrowthWeightToKg` edges (trim/`KG`/`G`, non-finite, empty unit) are covered — good. But `exposes latestWeightKg via normalizeGrowthWeightToKg on raw row` still calls `normalizeGrowthWeightToKg` **inside the `findLatestWeightKg` mock**, then asserts `getBabyHomeQuickStatus` copies `4.2`. Dep type is already `Promise<number \| null>`; normalize lives only in private `defaultFindLatestWeightKg` (SQL row → normalize). Removing or skipping that call in the default path would still pass this status test. Need a test that feeds a raw `{ valueNum, unit }` through `defaultFindLatestWeightKg` (export / db test / lower dep), not normalize-in-mock. | fixed |
| Enhancement | `lib/baby-diaper-quick-plan.test.ts:23–33`, `45–59` | **Quick-plan save coverage thin.** Mixed `openSheet` does not assert `draftDefaults.amount === "medium"`. `babyDiaperSheetSaveMutation` has one happy path (color + medium); no texture-only, smear/blowout, or “amount always written” negative/edge cases. W1 “no mutation until Save” is only a type comment, not a failure-mode test. | fixed |
| Enhancement | `lib/baby-age-guide.test.ts:109–134` | **Weight×150 clamp extremes missing.** Mid-band happy paths exist (4.2→90, 5.5→120, ≥183d ignore weight). Task 7 asks for sensible clamp; no case where raw ml is below `mlMin` or above `mlMax` (e.g. very light/heavy kg on day 30) to prove clamp, not just round10. | fixed |
| Enhancement | `lib/validators/baby.test.ts:56–137`, `445–477`; `lib/graphql/baby-yoga.test.ts:420+` | **No silent-medium / BAD_REQUEST negative depth.** Create/update/quick-care schemas accept dirty without amount and reject wet+detail, but tests do not assert parsed `.data` omits `amount` (Zod must not `.default("medium")`). Yoga wires happy-path detail fields; it does not assert wet/dry + detail → GraphQL `BAD_REQUEST` (Task 2 failure mode). | fixed |
| Enhancement | `lib/baby-i18n.test.ts:64–90` | **i18n key matrix incomplete for Task 12.** Checks `home.done` EN and `home.logged` VI only (not both locales each); texture caution only VI length; Custom-under only EN; tile short labels mostly unasserted in VI. Missing-key regressions in the other locale can slip through. | fixed |
| FYI | `e2e/baby-home-option-b.spec.ts` (bottle tests) | Task 13 B1 height / stacked right ± / Done~2s is soft-require only; suite has no B1 layout smoke assertions. Acceptable per tasks; still a gap if bottle face regresses. | open |
| Nit | `components/baby-diaper-kind-control.test.ts:32` | Asserts `aria-label="Poop Only"` only; Wet / Mixed / Dry full aria names unasserted. | open |

**Round notes:**

- Pure enums, Zod kind/detail allow/deny, quick-care medium vs create omit amount, age-band table, locale duration next-in+overdue, timeline Poop Only/Khô, B1 card markup, 2×2 Kind markup, e2e Wet/Dry/Poop/Mixed save paths, and last-ml rendering are in good shape.
- Main holes are **sheet UX failure modes**, **S1 Done flash**, and several **thin / mock-theater** edges around weight normalize, plan save, clamp, and GraphQL reject.
- **Fix round (adversarial):** Extracted `BabyDiaperDetailSheetForm` + structure tests for red-flag/caution/Cancel-vs-Save; e2e warn+cancel (W1). Kind control Done flash + `data-done-kind`/`data-diaper-flash`; `lib/baby-home-done-flash` with fake-timer unit tests; e2e Wet Done→ready via `page.clock`. Skeleton B1+2×2 structure test. `latestWeightKg` status path runs `normalizeGrowthWeightToKg` + trim/case/non-finite edges. Quick-plan Mixed medium + texture-only/smear/blowout/default amount. Age-guide clamp below/above band. Create schema omits amount; yoga wet+detail → `BAD_REQUEST`. i18n EN+VI for Done/Logged/caution/Custom/tiles.
- **Re-verify after Fix:** 2 Major + 5 Enhancement closed with real failure-mode tests (sheet form + e2e W1; S1 kind-control + done-flash + e2e clock; skeleton structure; quick-plan edges; age clamp; Zod create omit amount + yoga `BAD_REQUEST`; i18n EN+VI). **1 Enhancement still open:** `latestWeightKg` status test remains mock theater (normalize invoked inside dep mock; `defaultFindLatestWeightKg` SQL→normalize wire untested). FYI B1 e2e soft-gap + Nit aria names remain open (non-blocking). Adversarial lens not clean until the weight wire finding is fixed.
- **Fix round 2 (adversarial remaining):** Exported `defaultFindLatestWeightKg` with injectable `queryRow` (raw `{ valueNum, unit }`). Wire tests feed `"4200"` / `" G "` → `4.2` and null row → null — normalize is **not** called inside the mock. Status test only asserts dep pass-through (`4.2`). Pure `normalizeGrowthWeightToKg` trim/case/non-finite edges kept. TDD: red (`not a function`) → green. Marked fixed; **await adversarial re-verify** (Fix does not self-approve). FYI + Nit still open (non-blocking).
- **Re-verify #2:** Confirmed Enhancement closed — not mock theater. `defaultFindLatestWeightKg` exported with injectable `queryRow`; wire tests pass raw `{ valueNum: "4200", unit: " G " }` → assert `4.2` and null row → null. Normalize runs only in production wire (`home-quick-status.ts:200`), not inside the query mock. Status test correctly asserts dep pass-through only. Skipping/removing normalize in `defaultFindLatestWeightKg` would fail the wire test. **Adversarial test review: clean.** (FYI B1 e2e soft-gap + Nit aria names remain open; non-blocking.)

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-diaper-detail-sheet.tsx:189–208`; `components/baby-home.tsx:825–842` | **Cancel / Escape / ✕ during Save still looks like discard but mutation continues.** Save sets `saving` and disables only the Save button. Cancel, Modal ✕, and Escape still call `onClose` → `setDiaperSheet(null)` while `runQuick` keeps running. Caregiver can think W1 discard won; Poop/Mixed still commits. Disable dismiss while `saving`, or ignore close until the mutation settles. | fixed |
| Major | `components/baby-home.tsx:706–708`; `components/baby-page-skeleton.tsx:44–96` | **Skeleton missing guide-caveat slot → CLS.** Live UI inserts `home.guideCaveat` between row 2 and row 3 when `birthDate` is set (common after status loads). Skeleton jumps straight from B1/2×2 row to status lines with no matching placeholder. Violates skeleton parity / zero-CLS for Task 11 caveat. Reserve the same quiet line in the skeleton (or move caveat so it cannot shift row 3). | fixed |
| Enhancement | `lib/baby-quick-value-steppers.ts:6–8,70–76`; `messages/baby/en.ts:19–20`; `messages/baby/vi.ts:21–22` | **Dead 3-kind diaper cycle left behind.** Home no longer uses cycle/↑↓ (D-A). `BABY_DIAPER_CYCLE` / `stepBabyDiaperKind` still export wet\|dirty\|mixed **without `dry`**, and `home.diaperNext` / `home.diaperPrev` are unused. Footgun if reused; conflicts with 4-kind model. Remove or mark clearly obsolete. | fixed |
| Enhancement | `lib/baby-quick-value-steppers.ts:8` vs `lib/baby-diaper-detail.ts:10` | **Duplicate `BabyDiaperKind` types diverge.** Steppers type is 3-value (cycle); detail module is 4-value (`+ dry`). Same name, different meaning — easy to import the wrong one. | fixed |
| Enhancement | `components/baby-diaper-detail-sheet.tsx:95–147` | **Optional color/texture cannot be cleared.** Chips only `setColor` / `setTexture`; no toggle-off. Optional fields become sticky until Cancel. Prefer press-again to clear (or explicit Clear) so Save can omit them. | fixed |
| Enhancement | `components/baby-home.tsx` (~890 lines) | **Home keeps absorbing B1 + D-A + sheet + Done flash.** Orchestration, status lines, pending, and new diaper/bottle flash state stay in one file with no extraction plan. Harder to review and regress-safe. Split Kind/sheet handlers and/or bottle Done wiring when fixing. | fixed |
| Nit | `features/baby/server/quick-care.ts:320` | Hardcodes `?? "medium"` instead of `babyDiaperDefaultAmount()` — drift risk if default ever changes. | open |
| FYI | `features/baby/server/home-quick-status.ts:192` | `defaultFindLatestWeightKg` exported mainly as a test seam (injectable `queryRow`). Acceptable; prefer keeping the SQL helper private if a thinner export works later. | open |

**Round notes:**

- Spec alignment is mostly solid: Option B jsonb detail, quick-care medium vs create omit, D-A 2×2 Kind, B1 bottle face, `latestWeightKg` normalize, age bands ×150 clamp, locale next-in/overdue, Poop Only / Dry i18n.
- Quality blockers are **dismiss-during-save** (W1 Cancel semantics) and **caveat skeleton CLS**.
- Cleanup: dead cycle/i18n, duplicate kind type, sticky optional chips, oversized home file.
- No Critical correctness/security holes found in this lens (payload allow/deny and weight null-on-unknown look right).
- **Fix round (quality):** TDD → green.
  - **Dismiss while saving:** `babyDiaperSheetAllowDismiss`; Cancel disabled when `saving`; Modal `closeDisabled` blocks Escape/✕; sheet `dismiss` no-ops until settle.
  - **Skeleton caveat:** `data-skeleton="guide-caveat"` between Kind and `home-status` (+ structure test).
  - **Dead cycle:** removed `BABY_DIAPER_CYCLE` / `stepBabyDiaperKind` + tests; removed unused `home.diaperNext`/`diaperPrev` EN+VI; dropped deprecated e2e `diaperNext` helper.
  - **One `BabyDiaperKind`:** only `lib/baby-diaper-detail.ts` (4-kind) remains.
  - **Optional chips:** `toggleOptionalDiaperChip` — press again clears color/texture.
  - **Home size:** deferred further extract — Kind control + detail sheet already extracted; remaining file is orchestration (status/pending/breast/runQuick). Big-bang split would add risk without a clear seam this pass.
- **Re-verify after Fix (Quality):** All 2 Major + 4 Enhancement closed.
  - **Dismiss while saving:** Confirmed — Cancel/`dismiss` gated by `babyDiaperSheetAllowDismiss(saving)`; Modal `closeDisabled` blocks Escape + ✕; home passes `saving={saving}`; form test asserts Cancel disabled while saving.
  - **Skeleton caveat:** Confirmed — `guide-caveat` between Kind row and `home-status`; structure test asserts order.
  - **Dead cycle:** Confirmed — no `BABY_DIAPER_CYCLE` / `stepBabyDiaperKind` / `home.diaperNext|Prev` in code or messages.
  - **Single `BabyDiaperKind`:** Confirmed — sole 4-kind type in `lib/baby-diaper-detail.ts`; steppers no longer define a 3-kind alias.
  - **Toggle-clear chips:** Confirmed — color/texture use `toggleOptionalDiaperChip`; helper tests cover press-again → null.
  - **Home extract:** Accepted deferred — `BabyDiaperKindControl` + `BabyDiaperDetailSheet` already out; ~890-line home is orchestration only.
- **Quality review: clean.** Nit (`?? "medium"` vs helper) + FYI (test-seam export) remain open; non-blocking.

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/validators/baby.ts` (`refineDiaperDetailAllowed` / `updateBabyEventDiaperPayloadSchema`); `features/baby/server/care-events.ts:358–364` | **Wet/dry diaper-detail ban not enforced on real updates.** Refine only looks at fields in the patch: if `kind` is omitted, color/texture/amount always pass — so `updateBabyEvent({ payload: { color: "red_bloody" } })` on an existing wet/dry row succeeds. Merge is `{ ...existing.payload, ...patch }` with **no post-merge check**, so `{ kind: "wet" }` on a dirty row also keeps leftover color/texture/amount. Create + `babyQuickCare` reject wet/dry+detail; update does not (Task 2 / design BAD_REQUEST invariant). Authenticated writer only; no cross-workspace. Validate merged effective kind+detail (or strip disallowed keys) before write. | fixed |
| Enhancement | `lib/graphql/baby-typeDefs.ts:111–118`, `186–190` | **Diaper detail fields are bare `String` in GraphQL.** `diaperKind` / `diaperColor` / `diaperTexture` / `diaperAmount` (and create parity) rely entirely on Zod enums after parse. `BabyQuickActionKind` is already an enum — GraphQL-level enums would fail closed earlier and match that pattern. Not exploitable today while Zod stays on the path. | fixed |

**Round notes:**

- Security review (Senior Verifier). Subagent unavailable (usage limit); manual review against `security-and-hardening` for baby-home-logging-detail (GraphQL diaper fields, quick-care, weight normalize, client pending).
- **OWASP (relevant):** A01 pass (write uses `requireBabyWriteWorkspace` + `runInWorkspace`; event lookups filter `workspaceId`; replay keyed `(workspaceId, requestId)`). A02 N/A (no new secrets/crypto). A03 pass (Drizzle parameterized; weight normalize is numeric/`unit` equality only; React text children, no `dangerouslySetInnerHTML`). **A04 fail** — update merge/refine gap above. A05 N/A. A06 N/A (no new deps). A07 N/A. A08 pass (idempotency + Zod at edge; pending not a trust root). A09 pass (no secrets logged on these paths). A10 N/A.
- **Authz:** Unchanged pattern — membership-verified workspace from context, not client body; RLS FORCE on `baby_quick_care_request` (from redesign migration) still applies.
- **Quick-care / pending:** Zod on `babyQuickCare` (incl. wet/dry detail reject + enum allowlists); `clientRequestId` 8–64; pending fail-closed write + `babyId` match; Retry resends stored request; server re-validates. Trace `quickRequestId` not used for replay decision.
- **Weight:** `normalizeGrowthWeightToKg` fail-closed on non-finite / unknown unit; SQL scoped by workspace + baby + kind.
- **FYI (do not block):** `amountMl` still unbounded positive (pre-existing); `clientRequestId` not UUID-only; request-table retention still a follow-up.

**Result:** Round 1 — not clean (1 Major + 1 Enhancement open).

- **Fix round (security):** TDD → green.
  - **Major wet/dry update ban:** Added `mergeBabyEventDiaperPayload` — omit-kind detail on wet/dry → `Validation failed`; kind flip to wet/dry strips leftover color/texture/amount. `updateBabyEvent` uses merge for diaper (not raw `{...existing,...patch}`). Validator + care-events tests cover both cases.
  - **Enhancement GraphQL enums:** Added `BabyDiaperKind` / `BabyDiaperColor` / `BabyDiaperTexture` / `BabyDiaperAmount` matching Zod; wired on `BabyQuickActionInput` + `CreateBabyDiaperInput`. Yoga asserts unknown `diaperColor` fails at GraphQL enum layer (resolver never runs). `UpdateBabyEventInput.payload` stays JSON (typed by Zod + merge).
- **Re-verify after Fix (Security):** 1 Major + 1 Enhancement closed. Zero Critical/Major/Enhancement remain.
  - **Merge / update ban:** Confirmed — `updateBabyEvent` calls `mergeBabyEventDiaperPayload` for diaper (not raw spread). Omit-kind detail on wet/dry throws `Validation failed`; kind flip to wet/dry deletes color/texture/amount. Unit + care-events tests cover both; focused suite green.
  - **GraphQL enums:** Confirmed — `BabyDiaperKind` / `Color` / `Texture` / `Amount` match Zod allowlists; used on `BabyQuickActionInput` + `CreateBabyDiaperInput`. Yoga test: unknown `diaperColor` fails at enum layer (`ran === false`). Update payload stays JSON + Zod/merge (acceptable).
  - **OWASP re-check (relevant):** A04 now **pass** (post-merge wet/dry invariant). A01/A03/A08/A09 unchanged pass from Round 1. FYIs from Round 1 (unbounded `amountMl`, non-UUID `clientRequestId`, request retention) remain non-blocking.
- **Security review: clean.**

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | — |

**Result:** Round 1 — clean. **Performance review: clean.**

**Round notes:** Performance review (Senior Verifier) against `performance-optimization` + `vercel-react-best-practices` for baby-home-logging-detail (home-quick-status weight, home timers/re-renders, diaper sheet, bottle).

**What looks good**
- **Weight in status (no client waterfall):** `getBabyHomeQuickStatus` still awaits profile, then `Promise.all` of last-of-type ×3 + open sleep + feed count + **`findLatestWeightKg`**. One home GraphQL round-trip; weight is not a second client query (matches design Option B / settled #11).
- **Bounded weight read:** `queryLatestWeightRow` filters workspace + baby + `kind = weight`, `ORDER BY recorded_at DESC, id DESC`, **`LIMIT 1`**, projects only `valueNum` / `unit` (not full growth row). Normalize is O(1) in memory.
- **Index shape (accepted family-scale):** Uses existing `baby_growth_entry_baby_kind_idx` `(baby_id, kind)` — same “filter then sort LIMIT 1” pattern as care last-of-type. Covering `(baby_id, kind, recorded_at DESC)` would need a Gate-ask migration; growth history is sparse vs care. Not re-filed (redesign already deferred the care covering index the same way).
- **Home clocks:** Parent next-due / relative labels stay on **`setInterval(…, 30_000)`**; breast elapsed stays in **`BabyBreastElapsedText`** at 1 Hz. Logging-detail does not reintroduce a shared 1 Hz full-tree tick.
- **Done / Logged flash:** `bottleDone` / `diaperDoneKind` flip briefly (~2s via `scheduleBabyHomeDoneClear`). Infrequent state, not continuous hot-path waste — not the same class as the old 1 Hz tree re-render.
- **Diaper sheet / bottle UI:** Sheet mounts only when `diaperSheet` is set (conditional); Kind control is a fixed 2×2 (four buttons). Bottle B1 is layout/CSS only — no new lists, charts, or vendor chunks. Static imports of sheet/modal are small (not chart-sized); dynamic import not warranted.
- **Writes / invalidate:** Quick-care path unchanged for lock/replay; `"care"` invalidate still timeline/`homeQuick` only (no profile on every press). No N+1 loops, no unbounded fetches, no missing pagination on these paths.

**Checked / not findings**
- Always fetching weight even when age ≥183d or no birthDate (weight unused for bottle guide) — one parallel `LIMIT 1`; design intentionally folds weight into every status read.
- Done-flash timers not cleared on unmount / overlap — Memory lens territory, not hot-path cost.
- No new heavy bundle on `/baby` home.

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-home.tsx:410–424`; `lib/baby-home-done-flash.ts:12–19` | **Done/Logged flash timeouts never cleared.** After bottle or Wet/Dry save, `scheduleBabyHomeDoneClear` arms a 2s `setTimeout` that calls `setBottleDone(false)` / `setDiaperDoneKind(null)`, but the returned id is discarded. No `clearTimeout` on unmount, route leave, or reschedule. Navigate away during the flash → setState on an unmounted tree; a second save while Done is still showing stacks another timer (first clear can wipe the new flash early). Store the handle (ref), clear before arming again, and clear in an effect cleanup. | fixed |

**Result:** Round 1 — not clean (1 Major open).

**Round notes:** Memory review (Senior Verifier) against the stages checklist for baby-home-logging-detail (Done flash, diaper sheet, breast/sleep timers, pending store).

**Timers / listeners / cleanup**
- **Done flash (new this pass):** helper returns a timeout id; home never stores or clears it — **Major** above. Performance already flagged this as Memory territory.
- `BabyBreastElapsedText`: `setInterval(1s)` + `visibilitychange`/`focus`; cleanup clears all three. Mounted only while `breast` is set.
- `BabyHomeContent` clock: `setInterval(30s)` + same wake pair; cleaned on unmount / when `nowMs` injected.
- `attachBabyLocalDayRoll` (midnight + wake): dispose clears timeout and removes listeners — unchanged good pattern.
- Sleep open duration uses the parent **30s** clock (no extra 1 Hz sleep ticker) — no leak.
- Diaper sheet / Modal: local draft React state only; Modal removes `cancel` listener on effect cleanup; sheet unmounts when `diaperSheet` is null.

**Stores / retained state**
- Pending + breast: single localStorage keys, one record each; fail-closed write/read-back; clear drops design + legacy pending keys. No in-memory list or module-level cache.
- Pending age is display-only (`babyQuickPendingView`); no growing client buffer.
- Sheet draft is ephemeral component state (W1) — not persisted, not accumulated.

**Queries / casts**
- Home status still `LIMIT 1` last-of-type + weight row; `count(*)::int` for feeds only — no money/`SUM`→int4 casts in this pass.

**FYI (do not block):** `runQuick` async success/error/`finally` can still `setState` if the user leaves mid-mutation (pre-existing redesign pattern). `baby_quick_care_request` table growth without prune remains a documented follow-up (not an in-memory leak).

- **Fix round (memory):** TDD → green.
  - Added `createBabyHomeDoneFlashTimer` — `arm` clears prior timeout before re-arm; `dispose` cancels pending; generation guard ignores stale callbacks.
  - Home: bottle + diaper timer refs; `arm` after FORMULA / Wet|Dry save; effect cleanup calls `dispose` on unmount.
  - Unit tests: clear-before-rearm (stale clear does not wipe new flash) + dispose prevents clear fire.
- **Re-verify after Fix (Memory):** 1 Major closed. Zero Critical/Major/Enhancement remain.
  - **Helper:** Confirmed — `createBabyHomeDoneFlashTimer` clears prior id before re-arm, bumps generation so stale callbacks no-op, `dispose` clears pending + bumps generation.
  - **Home wiring:** Confirmed — `bottleDoneTimerRef` / `diaperDoneTimerRef` created once; FORMULA and Wet|Dry success call `.arm(...)`; effect cleanup calls both `.dispose()` on unmount (`baby-home.tsx:287–295`, `422–436`).
  - **Tests:** Confirmed green — clear-before-rearm (stale clear does not wipe new flash) + dispose prevents clear fire.
  - **Rest of checklist (unchanged good):** Breast 1 Hz + wake listeners cleaned; home 30s clock cleaned; `attachBabyLocalDayRoll` dispose; sheet/Modal cancel listener cleaned; pending/breast stores bounded; no new unbounded caches or money/`SUM`→int4 casts.
  - FYI from Round 1 (`runQuick` setState after leave mid-mutation; request-table retention) remain non-blocking.
- **Memory review: clean.**
