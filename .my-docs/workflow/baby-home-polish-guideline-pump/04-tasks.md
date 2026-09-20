# Tasks: Baby home polish — controls + pump enum + quiet guideline

## Task 1: GraphQL `PUMP_AMOUNT` enum

**Description:**  
Add `PUMP_AMOUNT` to `BabyQuickActionKind` in `lib/graphql/baby-typeDefs.ts` so Yoga accepts the kind Zod + `runBabyQuickCare` already handle. No resolver or DB changes.

**Acceptance:**

- [ ] Enum lists `PUMP_AMOUNT` alongside `BREAST | FORMULA | SLEEP | DIAPER`
- [ ] `babyQuickCare` with `kind: PUMP_AMOUNT` + `amountMl` no longer fails GraphQL enum validation

**Tests (TDD — what turns red first):**

- [ ] Unit / yoga: mutation with `PUMP_AMOUNT` + `amountMl` reaches handler (parity with existing diaper/kind cases in `baby-yoga.test.ts`)
- [ ] Assert invalid/missing amount still fails Zod (existing codes) after enum accepts kind

**Files likely touched:** `lib/graphql/baby-typeDefs.ts`, `lib/graphql/baby-yoga.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Height token = 2×tile + 3×border

**Description:**  
Update `BABY_HOME_BIG_CONTROL_MIN_H` / `BABY_HOME_SMALL_GRID_MIN_H` to `min-h-[calc(2*2.75rem+3px)]` and apply consistently to big cards, flush grids, and home skeleton.

**Acceptance:**

- [ ] Shared token encodes `2 * 2.75rem + 3px` (top + mid + bottom borders)
- [ ] Breast L/R, Nap, Bottle/Diaper/Pump grids, and skeleton use the same floor
- [ ] No hard-coded old `+1px` formula left on home controls

**Tests (TDD — what turns red first):**

- [ ] Unit: assert exported height token string / intent matches `2*2.75rem+3px` (extend `baby-home-control-height` tests or add focused unit)

**Files likely touched:** `lib/baby-home-control-height.ts`, consumers / `components/baby-page-skeleton.tsx` as needed

**Scope:** S

**Dependencies:** none

---

## Task 3: Done on triggered Custom (Bottle + Pump)

**Description:**  
Keep confirm-then-tap-chip. After Custom-origin save, flash Done on the Custom tile (`customSelected` / `doneFromCustom`), not the prepended ml chip. Mirror Bottle and Pump amount. Diaper N/A.

**Acceptance:**

- [ ] Custom Bottle path: Done on `data-bottle-ml="custom"` during flash
- [ ] Custom Pump path: Done on Custom pump tile during flash
- [ ] Prepended numeric chip does not show Done for that flash
- [ ] Feed-form behavior stays correct if shared helpers change

**Tests (TDD — what turns red first):** *(folded from 04a Fix ask)*

- [ ] Unit (Critical): `Done flashes on Custom only when customSelected, not on prepended ml` — props like `{ mls: [150,90,120], selectedMl: 150, doneFlash: true, doneText: "Logged", customSelected: true }` → Custom `data-bottle-flash="done"`; prepended `150` does **not**
- [ ] Unit: chip `showDone` when `isCustom && customSelected && doneFlash`; false when custom but not selected
- [ ] Unit (Major): home/helper after Custom-origin success keeps `customSelected` / `doneFromCustom` for flash window (today clears `*FromCustom` + hardcodes `customSelected={false}`)
- [ ] Unit or e2e (Major): Pump amount Custom Done parity (same assertions as Bottle — not optional)
- [ ] E2E: Custom confirm → tap Custom → Done on `data-bottle-ml="custom"` (Bottle); prefer same for Pump if cheap

**Files likely touched:** `components/baby-home.tsx`, `components/baby-bottle-ml-chips.tsx`, `components/baby-ml-chip-section.tsx`, `lib/baby-home-bottle-selection.ts`, related `*.test.ts`, e2e

**Scope:** M

**Dependencies:** none (can parallel Task 1)

---

## Task 4: Center quick-control faces (idle + Done)

**Description:**  
Audit and fix horizontal/vertical centering of title, icon, face text, and Done on home quick controls. **Locked Done approach (from design):** absolute-centered Done overlay while CLS reserved idle slots stay in the layout (no height jump).

**Acceptance:**

- [ ] Idle stacks look centered in big cards and ml/diaper tiles
- [ ] Done state: absolute-centered Done overlay; reserved idle slots (title/icon/value markers) still present; card height does not jump
- [ ] Light + dark still use tokens (no hard-coded hex)

**Tests (TDD — what turns red first):**

- [ ] Unit (red first): when `doneText` is set, assert Done overlay / face-slot markers for the locked structure (e.g. absolute-centered Done present + reserved idle slots still in DOM); assert structure that implies no height jump (slots not removed)
- [ ] Unit: idle centering classes / structure still asserted on quick faces (big card + ml/diaper tiles as covered today)
- [ ] Manual / e2e visual not required if unit covers structure; note smoke visual check at Gate C

**Files likely touched:** `components/baby-quick-value-card.tsx`, ml/diaper tile components as needed

**Scope:** S

**Dependencies:** none (pairs well after Task 2 visually)

---

## Task 5: Quiet merged guideline + VN content + skeleton

**Description:**  
Replace four-accordion tips with one muted quiet block. Ship content from `01-guideline-content.md` (updated Gate B) in `messages/baby/vi.ts`:

1. Shared **I** — room temperature / humidity / body temp / SIDS (VN)
2. **II** — five development stages with full subsections

EN: short quiet placeholder / caveat only (no full EN invent). Update `BabyHomeSkeleton` guideline row to one quiet block.

**Acceptance:**

- [ ] One low-attraction guideline surface (no four loud exclusive headers)
- [ ] Section **I** present (nhiệt độ phòng, thân nhiệt, SIDS)
- [ ] All five stages present in VN (0–1m … 12–24m) from content file
- [ ] Each stage keeps subsection structure from `01-guideline-content.md`: sleep; nutrition (bú/hút ± ăn dặm); WHO size; **y tế dự phòng** (vitamin / vaccine TCMR / vaccine dịch vụ / thuốc as in file); diaper — not stage titles only with flattened bullets
- [ ] EN is short placeholder/caveat — not a fabricated full translation
- [ ] Skeleton matches live guideline layout (zero CLS)
- [ ] Caveat tone kept unless intentionally dropped with product OK
- [ ] No invented medical claims beyond `01-guideline-content.md`

**Tests (TDD — what turns red first):** *(folded from 04a Fix ask + Gate B content update)*

- [ ] Unit: guidelines render Section I keys + five stage headings / keys — update tests that assume four accordion headers
- [ ] Unit: each stage exposes subsection keys/structure matching content file (sleep, nutrition, WHO, y tế dự phòng incl. vaccine/meds where present, diaper)
- [ ] Unit: Section I exposes room-temp / body-temp / SIDS structure
- [ ] E2E (Major, required): rewrite `e2e/baby-home-option-b.spec.ts` “Row 4 guidelines…” — one quiet guidelines surface; **no** exclusive `aria-expanded` feed/pump accordion; Section I + five stage markers as appropriate
- [ ] Unit (Major): `BabyHomeSkeleton` guideline row — one quiet block; **not** four `data-skeleton="guideline-header"` bars
- [ ] Enhancement: EN guide keys are short placeholder/caveat — not five full VN-stage bodies

**Files likely touched:** `components/baby-care-guidelines.tsx`, `messages/baby/vi.ts`, `messages/baby/en.ts`, `components/baby-page-skeleton.tsx`, related tests

**Scope:** M

**Dependencies:** none

---

## Checkpoints

After Tasks 1–2:

- [ ] Yoga/unit green for enum + height token
- [ ] Pump amount mutation no longer 400 on enum

After Tasks 3–4:

- [ ] Unit + e2e Custom Done green; centering structure OK

After Task 5:

- [ ] Guideline + skeleton parity; focused suite green
- [ ] Slice works end-to-end on baby home (pump custom + Custom Done + quiet guideline)
