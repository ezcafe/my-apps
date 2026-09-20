# Review log: baby-home-polish-guideline-pump

## Adversarial test review

**Result:** clean

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-bottle-ml-chips.test.ts` (Custom Done cases) | **Task 4 Done overlay / CLS structure missing on ml tiles.** Chip tests assert Custom vs prepended `data-bottle-flash="done"` (Task 3) and `data-face-slot="done"` text, but never pin the locked Done approach: `absolute inset-0` centered overlay + reserved idle `data-face-slot="value"` still in DOM with `invisible`. A swap-to-Done-only face (remove value slot / no overlay) still passes Task 3 — false green for height jump. `BabyQuickSimpleCard` already asserts this contract; bottle/pump ml tiles do not. | fixed |
| Major | `lib/baby-home-control-height.test.ts` vs home/skeleton consumers | **Task 2 acceptance untested on consumers.** Unit only equals the exported token string. No test that breast/nap big cards, bottle/diaper/pump grids, or `BabyHomeSkeleton` markup include `min-h-[calc(2*2.75rem+3px)]`, or that home/skeleton control surfaces no longer hard-code the old `+1px` formula. Token can stay correct while a consumer reverts — false green for “same floor” + “no old +1px left”. | fixed |
| Enhancement | `components/baby-diaper-kind-control.test.ts` (Done flash) | **Diaper Done omits absolute-center contract.** Idle slot + `invisible` is asserted; `absolute inset-0` / `items-center justify-center` on the Done overlay is not (unlike SimpleCard). Partial Task 4 coverage. | fixed |
| Enhancement | `components/baby-feed-form.test.ts` / `baby-pump-form.test.ts` | **Care-page Custom Done wiring untested.** Task 3 lists feed-form and wants Feed behavior correct if helpers change. Forms use `babyHomeKeepFromCustomAfterAmountSuccess` + `customSelected`, but tests are source chrome only (no keepFromCustom / customSelected Done assert). Home helpers + home e2e cover home; feed/pump pages can drift. | fixed |
| Enhancement | `components/baby-care-guidelines.test.ts` / model builder | **Task 5 medical subsection content markers thin.** Structure (5 stages × 5 subsection ids + health title) is strong; no assert that VI health bodies still carry Vitamin / TCMR / vaccine (or service meds) markers from `01-guideline-content.md`. Empty or flattened “y tế” lines with titles only could still pass. | fixed |
| Nit | `components/baby-home.test.ts` (“keeps customSelected…”) | Source-scan for helper names + `customSelected={…}` — source theater. Real coverage is helpers + Bottle/Pump Custom e2e; prefer keep e2e/helpers, shrink or drop scrape. | open |
| Nit | `lib/graphql/baby-yoga.test.ts` (PUMP_AMOUNT without amountMl) | Asserts errors + `ranPastParse === false` but not `extensions.code` (e.g. `BAD_REQUEST`) unlike nearby wet+detail case. Task 1 said “existing codes”. | open |

**Round notes:**

- **Covered well (do not re-litigate):** Task 1 yoga `PUMP_AMOUNT` + `amountMl` reaches handler + missing amount fails before parse; Task 2 token string encodes `2*2.75rem+3px`; Task 3 chip Custom-only Done + negative when `customSelected: false`; selection helpers `resolveBabyHomeCustomSelected` / `babyHomeKeepFromCustomAfterAmountSuccess`; e2e Bottle + Pump Custom confirm → Done on `data-bottle-ml="custom"` not prepended ml; Task 4 SimpleCard absolute Done + reserved icon/title/value/subtitle; Task 5 quiet guideline unit (Section I + five stages, no accordion) + EN placeholder + skeleton one `guideline-quiet-block` / zero `guideline-header` + e2e Row 4 quiet guidelines.
- **Round 1 Fix ask (adversarial-tests — tests only; no product code):**
  1. **Major — bottle/pump ml Done overlay:** In `baby-bottle-ml-chips.test.ts`, when `doneFlash` + `doneText` (Custom and/or numeric), assert Done overlay has `absolute inset-0` + center classes, and `data-face-slot="value"` remains with `invisible` (idle label still in DOM).
  2. **Major — height token consumers:** Assert live/skeleton home control surfaces include `min-h-[calc(2*2.75rem+3px)]` (e.g. render `BabyHomeSkeleton` + bottle chips / quick simple card / diaper grid, or focused markup contract) and do not hard-code old `+1px` on those floors.
  3. **Enhancement — diaper Done overlay:** Mirror SimpleCard: assert absolute-centered Done on diaper flash tile.
  4. **Enhancement — feed/pump form Custom flash:** Source or small unit: forms pass `customSelected` from keep-from-custom helper (not hard-coded `false`) after Custom-origin success path.
  5. **Enhancement — guideline health content:** VI model/message assert at least one stage health body matches Vitamin / TCMR|vaccine markers (smoke vs empty structure).

**Fix round (adversarial-tests, tests only):**
- Custom + numeric ml Done: assert `absolute inset-0` + `items-center justify-center` and reserved `data-face-slot="value"` + `invisible`.
- Height consumers: render bottle chips, SimpleCard, diaper grid, `BabyHomeSkeleton` — assert `min-h-[calc(2*2.75rem+3px)]`, no old `+1px`.
- Diaper Done: absolute-center overlay assert.
- Feed/Pump forms: source asserts `keepFromCustom` helper → `customSelected={…CustomSelected}` (not `{false}`).
- VI guideline model: health bodies match Vitamin + TCMR|vaccine markers.
- Focused unit: 24 pass. Nits left open (out of Fix ask).

**Round 2 re-check (verifier):**
- Verified all 5 Fix-ask items present in draft tests; Majors + Enhancements remain **fixed**.
- No new Critical / Major / Enhancement. Two Nits still open (do not block).
- **Verdict:** clean — zero open Critical/Major/Enhancement.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-page-skeleton.tsx` (`home-row-guidelines`) | **Guideline skeleton height ≠ live always-expanded guide (CLS).** Live VI guideline is one quiet card with Section I + five full stages (tall). Skeleton is a single `h-24` bar in a matching outer shell. Task 5 / project skeleton-parity require zero CLS; collapsing accordion → always-on full copy makes this jump worse than before. Outer “one quiet block” is correct; inner height does not mirror live content. | fixed |
| Enhancement | `components/baby-home.tsx` (`runQuick` FORMULA / PUMP_AMOUNT success) | **Custom-origin flag read after `await` from render closure.** Feed/pump forms pass `fromCustom` into the save call at tap time; home reads `formulaFromCustom` / `pumpAmountFromCustom` after the mutation resolves. Happy path works (tap-time closure), but weaker than the form pattern for Retry / mid-flight state changes. Prefer capture-at-call like feed/pump. | fixed |
| Nit | `messages/baby/en.ts` + `buildBabyCareGuidelineModel` | **EN keeps ~55 empty stage/section keys** so `BabyMessageKey` stays shared, while UI only shows `enPlaceholder`. Intentional for this pass (design: EN short placeholder, no full invent). Empty keys + `mode: "placeholder"` are the shared-key pattern; UI never renders stage bodies in placeholder mode. Thinning EN keys / skipping stage build later is optional cleanup, not a defect. Downgraded from Enhancement (Round 2). | open |

**Round notes:**

- **Axes:** Correctness (Tasks 1–5 vs idea/design), architecture, readability, performance skim. API contract deep-review deferred to API lens. Has DB = no.
- **Checklist:** Context understood; Correctness + tests adequate for happy paths; Security (static i18n, additive enum — no new abuse surface spotted); Architecture mostly fits; Readability OK; Performance N/A for hot path; Deps untouched.
- **Verified against specs (do not re-litigate as gaps):** `PUMP_AMOUNT` in enum; height token `2*2.75rem+3px` on big/small/skeleton controls; Custom Done helpers + chip `customSelected` + absolute Done overlay + reserved idle slots; quiet guideline model with Section I + five stages/subsections; VI content markers match `01-guideline-content.md` (spot-check phrases present); EN placeholder mode (empty stage bodies, short placeholder); e2e Custom Bottle+Pump Done + quiet Row 4.
- **Verdict (Round 1):** Request changes — 1 Major open (skeleton CLS). No Critical.

**Fix ask (quality — Fix agent):**
1. **Major — guideline skeleton CLS:** Replace single `h-24` quiet bar with structure that mirrors live always-expanded guide: Section I + five stages (+ caveat), same outer quiet card / concentric radii. Update skeleton tests.
2. **Enhancement — capture fromCustom at call:** In `runQuick`, snapshot `formulaFromCustom` / `pumpAmountFromCustom` before first `await`; use snapshots for keepFromCustom after FORMULA / PUMP_AMOUNT success.
3. **EN empty keys:** leave (deferred).

**Fix round (quality):**
- `BabyHomeSkeleton` guideline row: one `guideline-quiet-block` with `space-y-4` card chrome; `guideline-section-i` + `guideline-section-ii` with five `guideline-stage` blocks (from `BABY_CARE_GUIDE_STAGE_IDS`) + `guide-caveat`; no `h-24` / no `guideline-header`.
- `runQuick`: `formulaFromCustomAtCall` / `pumpAmountFromCustomAtCall` captured before await; keepFromCustom uses snapshots.
- EN empty keys left open (deferred).
- Tests: skeleton parity assert Section I + five stages; home source assert capture-before-await. Focused unit green (`baby-page-skeleton`, `baby-home`, `baby-home-control-height`).

**Round 2 re-check (verifier):**
- **Major skeleton CLS:** Confirmed in draft — `BabyHomeSkeleton` mirrors Section I + five `guideline-stage`s + caveat; no `h-24` quiet bar; tests pin structure. Status remains **fixed**.
- **Enhancement fromCustom-at-call:** Confirmed — snapshots before first `await`; FORMULA / PUMP_AMOUNT keepFromCustom uses `*AtCall`. Status remains **fixed**.
- **EN empty keys:** Downgraded to **Nit**. Placeholder mode is spec-intentional (`03-design` / Task 5); empty EN keys keep shared `BabyMessageKey`; `BabyCareGuidelines` renders only title + `enPlaceholder` + caveat when `mode === "placeholder"`. Not a blocking Enhancement; no Fix ask.
- **FYI (not a finding):** Locale-agnostic tall skeleton vs short EN live copy can still shift on EN; design targets VI always-expanded parity — accepted for this pass.
- No new Critical / Major / Enhancement.
- **Verdict:** clean — zero open Critical/Major/Enhancement.

---

## Merged SPM (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

Filled by parent (single lens — no Merge Task). Lens raw: `05-lens-api.md`.

**Round:** 1
**Result:** clean

### Winners (Fix these)

| Severity | Sources (api/db/security/perf/memory) | Finding | Decision |
|----------|---------------------------------------|---------|----------|
| — | — | None | API lens clean; no Fix ask |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| — | — | N/A (one lens) |

### Fix ask (for Fix agent)

None.

**Round notes:**

- SPM plan = `api` only. Parent copied `05-lens-api.md` Result **clean** into Merged SPM.
- Adversarial + Quality already clean. Review profile lite → next: lite test (targeted e2e).

---

## Fix notes (TDD skipped)

List any docs-only items where TDD was skipped:

- EN empty keys: deferred in Fix Round 1; Quality Round 2 downgraded to Nit (intentional placeholder + shared keys) — no code change.