# Tasks: Baby care pages control parity

## Task 0: Extract reusable care section components

**Description:**
Pull Breast L/R pair, Pump L/R pair, and ml-chip section wiring out of `baby-home.tsx` into reusable components. Refactor Home to use them (behavior unchanged). Capture pages in later tasks must import these — not copy Home JSX.

**Acceptance:**

- [ ] `BabyBreastSidePair` (or equivalent name) used by Home breast row
- [ ] `BabyPumpSidePair` used by Home pump row
- [ ] Shared ml section uses `BabyBottleMlChips` + props for custom (Home bottle + pump amount)
- [ ] Home visual/behavior unchanged (existing home tests still pass)
- [ ] No capture-page-only fork of these controls

**Tests (TDD — what turns red first):**

- [ ] Unit: BreastSidePair renders L/R and calls onPress with side
- [ ] Unit: PumpSidePair same for pump sides
- [ ] Existing `baby-home` tests still green after refactor

**Files likely touched:**
`components/baby-breast-side-pair.tsx` (new), `components/baby-pump-side-pair.tsx` (new), maybe `components/baby-ml-chip-section.tsx`, `components/baby-home.tsx`, home tests

**Scope:** M

**Dependencies:** none

---

## Task 0b: Extract reusable money Amount + Category fields

**Description:**
Pull Amount (`Field` + `InputGroup` leading/trailing) and Category field chrome (`MoneyUsageQuickPick` + Field/legend) out of `money-transaction-form.tsx` into reusable components. Refactor money/new to use them (behavior unchanged). Growth (Task 4) must import these — not copy money JSX. Also add a multi-select wrapper for Symptoms that reuses the same Category chip chrome.

**Acceptance:**

- [ ] `MoneyAmountField` (or equivalent) used by money/new Amount row
- [ ] `MoneyCategoryField` (or Field + `MoneyUsageQuickPick` wrapper) used by money/new Category
- [ ] Props allow optional leading/trailing addons (currency **or** plain unit / empty for Growth)
- [ ] Optional recent-amounts slot still works on money/new
- [ ] Multi-select Category chrome helper exists for Growth Symptoms (`selectedIds[]`)
- [ ] Existing money form tests / behavior unchanged
- [ ] No Growth-only fork of Amount/Category markup

**Tests (TDD — what turns red first):**

- [ ] Unit: MoneyAmountField renders leading/trailing addons from props
- [ ] Unit: MoneyCategoryField single-select calls onSelect
- [ ] Unit: multi wrapper toggles two ids independently
- [ ] Money transaction form still saves Amount/Category (existing tests green)

**Files likely touched:**
`components/money-amount-field.tsx` (new), `components/money-category-field.tsx` (new), maybe `components/money-multi-usage-quick-pick.tsx`, `components/money-transaction-form.tsx`, money form tests

**Scope:** M

**Dependencies:** none (parallel with Task 0)

---

## Task 1: Feed form = shared breast + formula components

**Description:**
Rewrite `BabyFeedForm` to mount **shared** `BabyBreastSidePair` + ml section (`BabyBottleMlChips` / `BabyMlChipSection` + `BabyCustomMlModal`). Dual-slot breast timer only. Remove Pump timed sides, Formula/Pump amount method chips, and Amount (ml) Field.

**Acceptance:**

- [ ] Feed imports shared components (same as Home) — no duplicated chip markup
- [ ] Feed shows Breast L/R + Formula ml/Custom only
- [ ] No Pump controls; no Formula/Pump amount chips; no Amount field
- [ ] Formula save uses `createBabyFeed` method `formula`
- [ ] Breast start/stop uses breast slot; compatible with Home timer store
- [ ] `BabyFeedSkeleton` matches (2 timed chips + ml grid; no amount field)

**Tests (TDD — what turns red first):**

- [ ] Unit/component: Feed does not render pump sides or amount Field; renders bottle ml chips
- [ ] Unit: breast stop builds expected feed input
- [ ] Unit: breast slot write leaves pump slot intact
- [ ] Update any Feed e2e that expected old pump/amount UI

**Files likely touched:**
`components/baby-feed-form.tsx`, `components/baby-page-skeleton.tsx`, feed tests/e2e, messages if needed

**Scope:** M

**Dependencies:** Task 0

---

## Task 2: Add `/baby/pump` using shared pump + ml components

**Description:**
Add pump route/form that mounts **shared** `BabyPumpSidePair` + ml section (same as Home pump). Loading skeleton, section nav, app header, i18n, icon mapping.

**Acceptance:**

- [ ] Pump page uses same shared components as Home pump row (no fork)
- [ ] `/baby/pump` reachable from Baby section nav near Feed
- [ ] Pump L/R timers use pump slot; amount chips save `method: "pump"`
- [ ] Custom ml modal works like Home
- [ ] Skeleton parity for pump page
- [ ] Header title correct for `/baby/pump`

**Tests (TDD — what turns red first):**

- [ ] `app-section-nav` includes `/baby/pump` icon/href
- [ ] `baby-app-header` returns pump title for path
- [ ] Pump form unit: L/R + ml chips present; no breast chips
- [ ] Custom ml confirm → pump amount save path
- [ ] Smoke/e2e: open pump page (or unit-level route smoke)

**Files likely touched:**
`app/(shell)/baby/pump/page.tsx`, `loading.tsx`, `components/baby-pump-form.tsx` (new), `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, `components/money-section-tabs.tsx`, `messages/baby/*`, skeleton

**Scope:** M

**Dependencies:** Task 0

---

## Task 3: Diaper page = shared Home kind + sheet

**Description:**
Replace diaper quick chips with **existing shared** `BabyDiaperKindControl` + `BabyDiaperDetailSheet` (same as Home — no page-local kind buttons). Update skeleton to 2×2 kind grid.

**Acceptance:**

- [ ] Wet/dirty/mixed/dry match Home control
- [ ] Dirty/mixed open detail sheet before save
- [ ] Sheet save sends color/texture/amount when set
- [ ] Done flash + navigate parity with existing care save helper
- [ ] Skeleton shows 2×2, not 3 loose chips

**Tests (TDD — what turns red first):**

- [ ] Diaper form: dirty tap opens sheet (does not immediately mutate)
- [ ] Wet/dry plan saves without sheet when Home plan says so
- [ ] Update diaper e2e/unit for new control testids

**Files likely touched:**
`components/baby-diaper-form.tsx`, `baby-page-skeleton.tsx`, diaper tests/e2e

**Scope:** M

**Dependencies:** none

---

## Task 4: Growth form uses extracted money Amount + Category fields

**Description:**
Restyle Growth: one field per line. Mount **extracted** `MoneyAmountField` for Value/Amount (trailing unit, **no** `$`). Mount **extracted** `MoneyCategoryField` for Unit; multi Category chrome for Symptoms. Update `BabyGrowthPageSkeleton`.

**Acceptance:**

- [ ] Growth imports money extracts — no local InputGroup/Category fork
- [ ] Fields stack one line each (no side-by-side Value/Unit grid)
- [ ] Value/Amount use `MoneyAmountField` without currency `$`
- [ ] Unit uses `MoneyCategoryField` (single `selectedId`)
- [ ] Symptoms use multi wrapper on same Category chrome (`selectedIds` toggle, not checkboxes)
- [ ] Kind chips + Save behavior unchanged functionally
- [ ] Skeleton matches stacked fields

**Tests (TDD — what turns red first):**

- [ ] Growth page test: uses MoneyAmountField / MoneyCategoryField (or testids from those)
- [ ] Unit/Symptoms not free-text Input / not checkbox list
- [ ] Symptoms: selecting two ids keeps both selected; notes/save still encode symptoms
- [ ] Value field has InputGroup structure (no `$` addon)
- [ ] Existing save validators still pass

**Files likely touched:**
`components/baby-growth-page.tsx`, skeleton, growth tests

**Scope:** M

**Dependencies:** Task 0b

---

## Task 5: Cross-page regression + skeleton tests

**Description:**
Update `baby-page-skeleton.test.ts` and related page tests/e2e for new layouts; verify light/dark token usage (no new hex).

**Acceptance:**

- [ ] Skeleton tests assert new Feed/Pump/Diaper/Growth markers
- [ ] Affected unit + e2e green
- [ ] No hard-coded hex in touched UI

**Tests (TDD — what turns red first):**

- [ ] Skeleton test failures for old feed 4-chip / diaper 3-chip shapes — then fix skeletons
- [ ] Nav/header tests for pump

**Files likely touched:**
tests under `components/`, `lib/`, `e2e/` as needed

**Scope:** S

**Dependencies:** Tasks 1–4

---

## Security checks (all tasks)

- [ ] No new public API; keep existing auth on mutations
- [ ] Diaper sheet cannot be bypassed for dirty/mixed on the page

## UI / mobile checks (all tasks)

- [ ] ≥44 hit targets on chips
- [ ] Skeleton parity zero CLS intent
- [ ] Light + dark via tokens
