# TDD test-case review: baby-home-polish-guideline-pump

**Result:** needs more tests (Fix ask folded into `04-tasks.md` Task 3/5 — Build must implement those tests)
**Round:** 1
**Updated:** 2026-09-20
**Parent note:** 2026-09-20 — Gate B ready; Fix ask items 1–5 folded into Task 3/5 TDD bullets.

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Yoga: `babyQuickCare` with `PUMP_AMOUNT` + `amountMl` reaches handler (parity with DIAPER/FORMULA in `baby-yoga.test.ts`) | partial — planned; not present today |
| 1 | edge | Invalid/missing `amountMl` still fails Zod after enum accepts kind | yes — already in `lib/validators/baby.test.ts` (PUMP_AMOUNT without amount); yoga Task should not re-invent, only keep green |
| 2 | real | Unit: height token string encodes `2*2.75rem+3px` | yes — planned; strong enough for token intent |
| 3 | real | Chip `showDone` when `isCustom && customSelected && doneFlash` | partial — planned positive only |
| 3 | edge / bug regression | Prepended numeric chip does **not** get Done when custom-origin flash (`customSelected` + matching `selectedMl`) | **no** — acceptance says it; TDD bullets omit explicit negative assert |
| 3 | real | Home success keeps custom Done target for flash window (`doneFromCustom` / keep `*FromCustom`) | partial — planned but vague; must name helper/home assertion |
| 3 | real | E2E Bottle: confirm → tap Custom → Done on `data-bottle-ml="custom"` | partial — planned; existing e2e taps prepended ml chip instead |
| 3 | real | Pump custom Done (mirror Bottle) | partial — “if covered”; need unit parity at minimum |
| 4 | real | Done: absolute-centered overlay + reserved idle slots still in DOM | yes — planned; strengthens today’s slot tests in `baby-quick-value-card.test.ts` |
| 4 | real | Idle centering classes / structure on quick faces | yes — planned |
| 5 | real | Five stage headings/keys (replace four accordion assumptions) | yes — planned unit |
| 5 | real | Per-stage subsection structure (sleep, milk/pump, WHO, vitamins, diaper notes) | yes — planned unit |
| 5 | real / edge | Existing e2e exclusive accordion (`baby-guideline-feed` / `pump`) rewritten for one quiet block | **no** — Task says “only if”; file already asserts accordion — must update |
| 5 | real | Skeleton one quiet guideline row (not four `guideline-header`) | **no** — acceptance only; no TDD |
| 5 | edge | EN short placeholder/caveat — not full five-stage invent | partial — acceptance only; no assert |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Critical | 3 | Bug regression: Done on wrong (prepended) chip while Custom-origin flash | `BabyBottleMlChips` unit: props `{ mls: [150,90,120], selectedMl: 150, doneFlash: true, doneText: "Logged", customSelected: true }` → assert `data-bottle-ml="custom"` has `data-bottle-flash="done"` / shows Logged; assert `data-bottle-ml="150"` does **not** have `data-bottle-flash="done"` |
| Major | 3 | Home clears `*FromCustom` on success today → flash target lost | Unit on home/helper: after Custom-origin success seed, flash window still passes `customSelected` / `doneFromCustom` so Custom stays Done target (extend `baby-home.test.ts` or selection/done-flash helper) |
| Major | 3 | Pump amount Custom Done parity | Same chip unit with pump section wiring, **or** e2e pump custom confirm → Done on Custom; do not leave Pump as optional if Bottle-only |
| Major | 5 | Live e2e still asserts four exclusive accordion headers | Replace/rewrite `e2e/baby-home-option-b.spec.ts` “Row 4 guidelines…” — assert one quiet guidelines surface; **no** `aria-expanded` exclusive feed/pump accordion; optionally five stage markers visible |
| Major | 5 | Skeleton CLS parity untested | Unit/render: `BabyHomeSkeleton` guideline row — one quiet block marker; **zero** (or not four) `data-skeleton="guideline-header"` bars; height consumers use `+3px` token where Task 2 applies |
| Enhancement | 5 | EN must stay short placeholder | Unit/message check: EN guide keys are caveat/placeholder length — not five full VN-stage bodies |
| Enhancement | 1 | Idempotency already documented for pump | Optional yoga replay for `PUMP_AMOUNT` only if easy mirror of FORMULA replay; not required for clean if FORMULA replay stays |

## Real scenarios checked

- Happy path: Pump enum reaches handler (Task 1); Custom Bottle Done on Custom (Task 3); height token (Task 2); Done overlay structure (Task 4); five-stage quiet guideline (Task 5).
- User-visible failures: Missing `amountMl` Zod (existing); Task 3 mutation-failure → no Done flash left as design nit (ok to skip).
- Empty / loading / permission: N/A for enum; skeleton parity is the loading stand-in — **under-planned**.

## Edge scenarios checked

- Boundaries / invalid input: Zod missing amount for `PUMP_AMOUNT` (existing); chip `customSelected=false` → Custom does not show Done (planned).
- Concurrency / double-submit / idempotency: Design documents `clientRequestId` replay; not required as new Task 1 must-have (FORMULA yoga already covers replay shape).
- Offline / partial data / race (if relevant): Custom-origin flash vs prepended ml is the important race/state edge — **must strengthen**.

## Fix ask for Build

Concrete tests to add or strengthen (fold into `04-tasks.md` Task 3 / 5 TDD):

1. **Task 3 — chip regression (Critical):** `it("Done flashes on Custom only when customSelected, not on prepended ml")` — assert Custom `data-bottle-flash="done"` and prepended ml chip has no done flash / no Logged text as sole Done target.
2. **Task 3 — home flash window (Major):** Assert Custom-origin success keeps `customSelected` / `doneFromCustom` for the Done-flash window (today home clears `*FromCustom` and hardcodes `customSelected={false}`).
3. **Task 3 — Pump parity (Major):** Same assertions for Pump amount Custom path (unit minimum; e2e preferred if cheap beside Bottle).
4. **Task 5 — e2e rewrite (Major):** Update existing accordion e2e to one quiet block (five stages / no exclusive `baby-guideline-feed|pump` expand). Do not treat as optional.
5. **Task 5 — skeleton (Major):** Assert skeleton guideline row matches one quiet block (not four `guideline-header`s).

Keep Task 1 yoga reach + Task 2 token + Task 4 overlay + Task 5 five-stage/subsection units as planned. Prefer reuse of existing Zod amount tests over duplicate Task 1 Zod work.

## Round notes

- Design-review clean (round 2); this review is planned-tests only — no product code.
- Existing coverage skimmed: `baby-yoga.test.ts` (no `PUMP_AMOUNT`), `baby-bottle-ml-chips.test.ts` (Done on numeric only; `!isCustom` gate), `baby-home-bottle-selection.test.ts`, `baby-quick-value-card.test.ts` (reserved slots, not absolute Done overlay), `baby-care-guidelines.test.ts` + e2e accordion, `baby-page-skeleton.tsx` four guideline headers, `lib/validators/baby.test.ts` already covers PUMP amount required.
- Prefer few strong tests: the Critical chip negative + home flash-window + Task 5 e2e/skeleton updates are the ones that turn today’s bugs red; avoid a long weak list.
`)