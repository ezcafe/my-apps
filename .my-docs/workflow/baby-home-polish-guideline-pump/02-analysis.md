# Analysis: Baby home polish — controls + pump enum + quiet guideline

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows.
**Mode:** simple (no skim / 01b — outcome locked in `01-idea.md` + `01-guideline-content.md`).
**Result:** done

## Deep dive (required)

### Overall

#### What is this?
Five small fixes on Baby home: (1) center quick-button faces idle + Done, (2) match Breast L/R / Nap height to the Bottle 2-row stack + borders, (3) show Done on the Custom control that was used (Bottle / Pump; Diaper already kind-keyed), (4) accept GraphQL `PUMP_AMOUNT` on `BabyQuickActionKind`, (5) replace the loud 4-accordion guideline with one quiet merged block using the five VN age stages in `01-guideline-content.md`.

#### Why do we need this?
- **Done on wrong tile** trains caregivers to distrust feedback.
- **Pump custom 400** blocks a night-critical path already implemented in Zod + `runBabyQuickCare` + e2e.
- **Height / centering** make the grid feel uneven and hard to scan.
- **Loud outdated tips** compete with log actions (Gate A 80/20: guideline is secondary).

#### How to do this?
- Stay on existing Option B home: `babyQuickCare`, Done-flash helpers, flush 2×2 chips, `BabyTimedCareChip` / `BabyQuickSimpleCard`.
- Fix GraphQL enum only (no new mutation, no schema migration).
- Replace guideline UI + i18n content; update skeleton in the same change.
- **Other ways:** (a) measure Bottle stack with ResizeObserver for Breast/Nap height — more accurate, more JS; prefer shared CSS min-height token once formula is locked; (b) map custom Done by inventing a fourth “virtual” ml chip — worse than flashing the Custom tile.
- **Best practices:** Repo — `lib/baby-home-done-flash.ts`, `lib/baby-home-control-height.ts`, feed-form `customSelected` wiring; DESIGN_GUIDE concentric radii + skeleton parity; GraphQL enum must match Zod allowlist.

### Solution pieces

#### 1. Button centering (idle + Done)

##### What is this?
Visual centering of title / icon / face text / Done on home quick controls (`BabyQuickSimpleCard`, ml chips, diaper tiles).

##### Why do we need this?
Idle stacks icon + label + value + subtitle; Done keeps **invisible** reserved slots (`min-h-6` icon/value, `min-h-4` subtitle) so the card does not shrink — Done text sits in the **label** slot and can look high / off-center vs true middle.

##### How to do this?
- **Approach:** Keep CLS-safe reserved heights, but center the **visible Done string** optically (e.g. absolute-centered Done overlay while slots stay for size, or collapse non-Done slots only when `prefers-reduced-motion` allows — Design picks one that keeps zero CLS). Audit ml / diaper tiles for `items-center justify-center` + `text-center` consistency.
- **Other ways:** Drop reserved slots on Done (simpler copy center, risks height jump); leave as-is (fails metric).
- **Best practices:** Repo already uses invisible icon on Done for height; DESIGN_GUIDE — no layout jump on state change.

#### 2. Breast / Nap height = Bottle stack + borders

##### What is this?
Big timed cards (`BABY_HOME_BIG_CONTROL_MIN_H`) must match the Bottle (and Diaper / Pump-amount) flush grid outer height.

##### Why do we need this?
Today `lib/baby-home-control-height.ts` uses `min-h-[calc(2*2.75rem+1px)]` (2 × `min-h-11` + **one** 1px divider). Bottle/diaper grids also have **outer** `border` (top + bottom). User formula: **100 height + 200 height + top border + bottom border + border between** → `2 × tile + 3 × border`.

##### How to do this?
- **Approach:** Update shared token(s) so big cards and small grids share one formula (likely `2*2.75rem+3px` if borders are 1px, or `2*2.75rem+3*1px` explicit). Apply to `BabyQuickSimpleCard` + small grids + `BabyHomeSkeleton` in one change.
- **Other ways:** JS measure Bottle column — overkill for fixed tile mins; per-row `items-stretch` alone does not fix min-height mismatch when columns wrap.
- **Best practices:** One constant in `lib/baby-home-control-height.ts`; unit assert string / computed intent; skeleton parity.

#### 3. Done on triggered Custom (Bottle / Pump)

##### What is this?
After a Custom ml path succeeds, Done/Logged must paint on the **Custom** tile, not the first ml chip.

##### Why do we need this?
Root cause (client, confirmed):
1. `BabyBottleMlChips` — `showDone = doneFlash && selected && !isCustom` → Custom **never** shows Done.
2. Home hardcodes `customSelected={false}` (feed form correctly passes `formulaFromCustom && formulaOverride != null`).
3. On success, home clears `formulaFromCustom` / `pumpAmountFromCustom` and sets `bottleDoneMl` / `pumpAmountDoneMl`.
4. `ensureMlInBottleChips` **prepends** unknown ml → custom amount becomes **first** chip → Done lands on first button.

Diaper has no Custom tile; Done is already keyed by `doneKind` per tile — treat “Diaper custom” as N/A unless Design finds a separate bug.

##### How to do this?
- **Approach:** During Done flash for Custom-origin saves, keep a `doneFromCustom` (or keep `*FromCustom` true for the flash window); pass `customSelected`; allow Done on Custom (`isCustom && customSelected`); do **not** select/flash the prepended ml chip for that flash. Mirror for Pump amount. Unit + e2e: Custom confirm → save path → Done on `data-bottle-ml="custom"`.
- **Other ways:** Auto-save from Custom modal (product change; home today is confirm-then-tap-chip) — out of scope unless user asks.
- **Best practices:** Mirror `components/baby-feed-form.tsx` `customSelected` wiring; pure helpers in `lib/baby-home-bottle-selection.ts` / done-flash if needed.

#### 4. GraphQL `PUMP_AMOUNT` on `BabyQuickActionKind`

##### What is this?
Add `PUMP_AMOUNT` to the GraphQL enum in `lib/graphql/baby-typeDefs.ts` so Yoga accepts the kind the client already sends.

##### Why do we need this?
Enum today: `BREAST | FORMULA | SLEEP | DIAPER` only. Zod (`babyQuickCareSchema`), planner, `runBabyQuickCare` (`createPumpAmount`), and e2e already use `PUMP_AMOUNT`. GraphQL validates the enum **before** the resolver → **400** at the wire.

##### How to do this?
- **Approach:** Add `PUMP_AMOUNT` to `enum BabyQuickActionKind`. No DB migration — persistence already writes `method: "pump"` + `amountMl`. Add a yoga/compile test that `PUMP_AMOUNT` + `amountMl` reaches the mutation (parity with diaper enum tests).
- **Other ways:** Rename client to reuse `FORMULA` with pump method — wrong; breaks planner independence and `createPumpAmount`.
- **Best practices:** GraphQL enum ⊆ Zod allowlist; keep server handler as-is.

#### 5. Quiet merged guideline + new VN stages

##### What is this?
Replace four exclusive accordion sections (feed / sleep / diaper / pump) with **one** low-attraction block whose copy is the five age stages from `01-guideline-content.md`.

##### Why do we need this?
Current UI is a bordered card + four loud headers; copy is short generic tips + old pump table — competes with quick log. Outcome: secondary, quiet, updated clinical-ish stage guidance (VN).

##### How to do this?
- **Approach:** New or slimmed `BabyCareGuidelines` (or replace call site) — single quiet surface (`text-muted`, less chrome); structure five stages (headings + bullets from content file). Put strings in `messages/baby/vi.ts` (and EN strategy — see open questions). Update `BabyHomeSkeleton` guideline row (today four `guideline-header` skeletons). Keep caveat tone (`home.guideCaveat`) unless Design drops it.
- **Other ways:** Age-filter to **current** stage only (quieter, less complete); keep accordion with five stage panels (still more chrome than “one merged block”).
- **Best practices:** Content from `01-guideline-content.md` as source of truth; no medical claims UI beyond provided text; skeleton parity mandatory.

## What exists today

| Area | Location | Notes |
|------|----------|--------|
| Home UI | `components/baby-home.tsx` | Rows breast+bottle → nap+diaper → pump; guidelines bottom; Custom modals confirm-only |
| Big / small height | `lib/baby-home-control-height.ts` | Shared `2*2.75rem+1px` — missing outer borders vs user formula |
| Simple card / Done | `components/baby-quick-value-card.tsx` | Flex center; Done keeps invisible slots |
| Timed chips | `components/baby-timed-care-chip.tsx` | Wraps simple card |
| Bottle / pump chips | `components/baby-bottle-ml-chips.tsx` + `baby-ml-chip-section.tsx` | Done banned on Custom; home `customSelected={false}` |
| Selection helpers | `lib/baby-home-bottle-selection.ts` | Prepend ensure ml; flash clears custom flag on home success |
| Diaper Done | `components/baby-diaper-kind-control.tsx` | Done by `doneKind` — OK |
| Guidelines | `components/baby-care-guidelines.tsx` + i18n | 4 exclusive sections; skeleton 4 headers |
| GraphQL enum | `lib/graphql/baby-typeDefs.ts` | **Missing** `PUMP_AMOUNT` |
| Zod / server | `lib/validators/baby.ts`, `features/baby/server/quick-care.ts` | Already handle `PUMP_AMOUNT` → `createPumpAmount` |
| Content source | `01-guideline-content.md` | Five VN stages 0–1m … 12–24m |

## Dependencies

| Must change | Stay compatible |
|-------------|-----------------|
| `baby-typeDefs` enum | Zod + `runBabyQuickCare` + planner (already green) |
| Home Custom Done wiring + chip `showDone` | Pending owner / recovery; confirm-then-save modal |
| Height token + skeleton | Feed/sleep page chips that reuse token |
| Guideline component + messages + skeleton | Non-goals: no new personalization / charts |

## Reference files (for Design / Build)

| Path | Why |
|------|-----|
| `01-idea.md` / `01-guideline-content.md` | Outcomes + VN copy |
| `components/baby-home.tsx` | Wiring, `customSelected={false}`, success clears custom flags |
| `components/baby-bottle-ml-chips.tsx` | `!isCustom` Done gate |
| `components/baby-feed-form.tsx` | Correct `customSelected` reference |
| `lib/baby-home-control-height.ts` | Height formula |
| `components/baby-quick-value-card.tsx` | Centering / Done slots |
| `components/baby-care-guidelines.tsx` | Accordion to replace/simplify |
| `components/baby-page-skeleton.tsx` | Guideline + control height parity |
| `lib/graphql/baby-typeDefs.ts` | Enum fix |
| `lib/validators/baby.ts` / `features/baby/server/quick-care.ts` | Already accept `PUMP_AMOUNT` |
| `messages/baby/vi.ts` / `en.ts` | Guide strings |
| `e2e/baby-home-option-b.spec.ts` | Pump amount + home flows |
| `components/baby-bottle-ml-chips.test.ts` / `baby-home.test.ts` | Unit hooks |

## Reusable patterns

| Pattern | Where | Reuse |
|---------|-------|--------|
| Done flash timer | `lib/baby-home-done-flash.ts` | Keep ~2s arm/dispose |
| Feed-form custom selected | `baby-feed-form.tsx` | Copy to home bottle + pump |
| Shared height token | `baby-home-control-height.ts` | Fix once, all big/small |
| GraphQL enum + yoga test | `baby-yoga.test.ts` diaper enum cases | Same for `PUMP_AMOUNT` |
| Quiet muted copy | DESIGN_GUIDE secondary text | Guideline de-emphasis |
| Skeleton parity | `BabyHomeSkeleton` | Mandatory with UI |

## Constraints and risks

- **Enum-only API change** — clients already send `PUMP_AMOUNT`; adding enum is additive/safe.
- **Custom flow is still confirm-then-tap** on home — Done-on-Custom must cover the save that followed a Custom selection, not force modal auto-save.
- **Medical content** — ship user-provided VN text; do not invent dosages beyond `01-guideline-content.md`.
- **EN locale** — idea says no EN translation this pass; Design must pick EN fallback (keep old tips vs VI-only vs stub).
- **e2e / unit** that assume four guideline headers or Done on first ml chip need updates.
- **Has DB:** persistence already supports pump amount rows — no migration.

## Settled (do not relitigate)

- Fix centering, height formula as specified, Custom Done target, GraphQL enum, one quiet guideline with `01-guideline-content.md`.
- No full home IA redesign; no Money changes; VN content as provided.
- Server Zod + `createPumpAmount` path stay; only GraphQL enum was missing.

## Has API / Has DB (recommendation for `00-run.md`)

| Flag | Recommendation | Why |
|------|----------------|-----|
| **Has API** | **yes** | Public GraphQL contract: add `PUMP_AMOUNT` to `BabyQuickActionKind`. |
| **Has DB** | **no** | No schema/migration/query ownership change; pump amount already persists via existing feed/quick-care writes. |

## Open questions

1. **Guideline presentation:** Show **all five** stages in one scrollable quiet block, or **highlight current age** (from `birthDate`) with others collapsed/secondary? (Idea says “one merged block” + full five-stage text — default lean: all five, muted.)
2. **EN messages:** Keep old EN accordion copy, leave EN empty/stub, or ship VI strings under EN until translated?
3. **Diaper “custom”:** Confirm out of scope (no Custom tile; Done-by-kind already). Any separate diaper Done bug to reproduce?
4. **Custom save path:** Keep confirm-then-tap-chip, only fix Done target — or should Custom confirm also auto-run `FORMULA` / `PUMP_AMOUNT`? (Idea metric implies Done on Custom after log; does not require auto-save.)

## Clarity check

Instructions and reference files are clear enough to design. Gaps above are non-blocking if Design defaults: (1) all five stages muted, (2) EN keeps short placeholder or old quiet caveat until translate, (3) Diaper N/A, (4) no modal auto-save.

**Ask:** Are the instructions and reference files clear enough to design? Any gaps in What / Why / How?
