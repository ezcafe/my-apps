# Tasks: Baby log forms + vaccines on Growth

## Task 1: Growth chips — order + UI sentinel vaccine

**Description:**
Update `BABY_GROWTH_PAGE_CHIPS` to Gate A2 order with UI-only `vaccine`. Split DB kinds so `vaccine` is a chip but not a `baby_growth` kind. Keep Insights growth chips unchanged.

**Acceptance:**

- [ ] Chip order: Pump → Vaccine → Vitamin → Medication → Temperature → Weight → Height → Head
- [ ] `isBabyGrowthPageChip("vaccine")` true; `isBabyGrowthPageDbKind("vaccine")` false
- [ ] Insights/Activities growth filter chips still exclude vaccine
- [ ] Comment/docs no longer say vaccines live only on `/baby/vaccines`

**Tests (TDD — what turns red first):**

- [ ] Unit: chip array order includes `vaccine` at index 1
- [ ] Unit: db-kind helpers reject `vaccine`
- [ ] Unit: Insights growth chips unchanged (exclude vaccine)

**Files likely touched:** `lib/baby-growth-page-chips.ts`, `lib/baby-growth-page-chips.test.ts` (+ insights chip tests if separate)

**Scope:** S

**Dependencies:** none

**Security / UI:** N/A beyond clear sentinel typing (A04).

---

## Task 2: Growth page — Vaccine fields + save branch

**Description:**
On `BabyGrowthPage`, honor `?kind=vaccine`; show name + First/Second dose when Vaccine selected; Save branches to `createBabyVaccine` via `growthVaccine*`. Default selection remains Weight. Lift dose UI from current vaccines page (then Task 4 deletes that page).

**Acceptance:**

- [ ] `/baby/growth?kind=vaccine` opens with Vaccine chip selected and dose-first fields
- [ ] Default open (no query) still Weight
- [ ] Vaccine Save blocked until name + dose valid; success invalidates vaccines scope + toast; **stays on Growth**; resets to Weight
- [ ] Growth kind Save: invalidate growth + toast; **stays on Growth**; resets to Weight
- [ ] After any Growth/vaccine save: **no** navigate home (`router.push("/baby")`); use `afterSave: "stay"` (or Growth stay constant) — **not** `BABY_CARE_AFTER_SAVE.diaper`
- [ ] Growth kinds still use `createBabyGrowth` + growth invalidate
- [ ] Labels use plain Vaccine (`growth.vaccine`); money/new chrome (chips → fields → Save)

**Tests (TDD — what turns red first):**

- [ ] Unit: `growthVaccineCreateInput` / save-blocked still gate empty name/dose (existing or extend)
- [ ] Unit/component: `kind=vaccine` selects vaccine chip; unknown kind falls back to Weight
- [ ] Unit: save path chooses vaccine mutation when chip is vaccine
- [ ] Unit (red first, 04a): Growth/vaccine post-save uses `afterSave: "stay"` (Growth stay constant on `BABY_CARE_AFTER_SAVE` preferred); assert **not** `BABY_CARE_AFTER_SAVE.diaper`; on success mock — `router.push` never called with `/baby`
- [ ] Unit (red first, 04a): vaccine save invalidates vaccines scope; growth-kind save invalidates growth scope; both reset selection to Weight
- [ ] Optional e2e smoke later (Task 7): stay + reset visible after save

**Files likely touched:** `components/baby-growth-page.tsx`, `lib/baby-growth-recent.ts` (if needed), messages if missing keys

**Scope:** M

**Dependencies:** Task 1

**Security / UI:** Workspace-scoped mutations only; ≥44px chips/Save; field errors + toast; light/dark tokens.

---

## Task 3: Redirect + nav + header (drop Log vaccines)

**Description:**
Add permanent redirect `/baby/vaccines` (+ path*) → `/baby/growth?kind=vaccine` in `next.config.ts` (same style as measure→growth). Remove section-nav “Log vaccines”. Adjust baby app header so vaccines path is not a live capture title (redirect wins).

**Acceptance:**

- [ ] `/baby/vaccines` permanently lands on Growth with Vaccine preselected
- [ ] Capture nav has no vaccines item; Growth remains
- [ ] Header/title tests updated; no “Log vaccines” as current capture destination

**Tests (TDD — what turns red first):**

- [ ] Unit: `app-section-nav` baby items exclude `/baby/vaccines`
- [ ] Unit: header resolve for `/baby/vaccines` does not treat it as active vaccines page (or matches redirect target convention used in repo)
- [ ] Unit (red first, 04a Critical): `lib/baby-growth-redirects.test.ts` — permanent redirect `/baby/vaccines` (+ `/:path*` if added) → `/baby/growth?kind=vaccine` (same style as measure→growth); do not wait only for e2e
- [ ] E2E later (Task 7) for redirect behavior in browser

**Files likely touched:** `next.config.ts`, `lib/app-section-nav.ts`, `lib/app-section-nav.test.ts`, `lib/baby-app-header.ts`, `lib/baby-app-header.test.ts`, icon map if tied to nav

**Scope:** M

**Dependencies:** Task 2 (redirect target must work)

**Security:** Fixed redirect destination only (no open redirect).

---

## Task 4: Delete vaccines route/page (D4 Option 1)

**Description:**
After redirect works, delete `app/(shell)/baby/vaccines/*`, `components/baby-vaccines-page.tsx`, and unused vaccines loading/skeleton pieces. Keep `features/baby/server/vaccines.ts` + GraphQL/client vaccine APIs.

**Acceptance:**

- [ ] No vaccines app route/page component remains
- [ ] Vaccine create/list GraphQL still available for Growth + Insights/Activities
- [ ] Build/typecheck has no imports of deleted page

**Tests (TDD — what turns red first):**

- [ ] Update/remove unit tests that mount `BabyVaccinesPage`
- [ ] Keep server/validator vaccine tests green

**Files likely touched:** `app/(shell)/baby/vaccines/**`, `components/baby-vaccines-page.tsx`, `components/baby-vaccines-page.test.ts` (if any), skeleton refs

**Scope:** S

**Dependencies:** Task 3

**Security / UI:** Confirm redirect still covers bookmarks after delete.

---

## Task 5: Feed / sleep / diaper chrome (no extra steps)

**Description:**
Restyle feed/sleep/diaper controls to money/new chip look (`quickPickChipCls`, spacing, radii, auto-fit grids) without adding a required Save on one-tap paths.

**Acceptance:**

- [ ] Method/kind (and sleep start/end) remain the primary one-tap / few-field actions
- [ ] Visual chrome matches Growth chips (tokens, radii, hit area)
- [ ] No new multi-step Save forced on feed/diaper/sleep one-tap

**Tests (TDD — what turns red first):**

- [ ] Unit (red first): feed method tap and diaper kind tap still create on that primary action — assert no new required primary Save control on those one-tap paths after chrome restyle
- [ ] Unit (red first): sleep primary (start/end or equivalent) still saves without a new required Save step
- [ ] Optional: assert `quickPickChipCls` / group wiring if helpers already under test; Task 7 e2e may still smoke feed/diaper

**Files likely touched:** `components/baby-feed-form.tsx`, `components/baby-sleep-form.tsx`, `components/baby-diaper-form.tsx`, matching skeletons + form unit tests

**Scope:** M

**Dependencies:** none (can parallel Task 1–2)

**UI/mobile:** ≥44px hits; skeleton parity with restyled controls; light/dark.

---

## Task 6: Skeletons + loading parity

**Description:**
One **static** Growth skeleton: 8 chips in Gate A2 order + one field block sized for name + dose chips + primary Save (covers Weight and Vaccine). Do **not** branch on `?kind=` in `loading.tsx` (App Router loading usually cannot read searchParams). Remove vaccines loading with route delete. Align feed/sleep/diaper loading with chrome restyle.

**Acceptance:**

- [ ] Growth loading = static 8-chip row (Gate A2 order) + one vaccine-sized field/Save block; no `?kind=` / kind-conditional loading
- [ ] Chip count/order matches live UI (zero CLS)
- [ ] No orphan vaccines loading UI
- [ ] Feed/sleep/diaper loading mirrors restyled controls

**Tests (TDD — what turns red first):**

- [ ] Unit: `baby-page-skeleton` growth asserts 8 chips + static field/Save structure (no kind param)

**Files likely touched:** `components/baby-page-skeleton.tsx`, `components/baby-page-skeleton.test.ts`, `app/(shell)/baby/*/loading.tsx`

**Scope:** S

**Dependencies:** Task 2, Task 4, Task 5

---

## Task 7: Activities / Insights copy + links (D3 Option 2) + e2e

**Description:**
Update Activities/Insights labels and links that imply a separate Vaccines capture page so they point at Growth (`?kind=vaccine` when “log vaccine”) or use neutral copy. Update e2e that navigates to `/baby/vaccines` or asserts “Log vaccines” nav.

**Acceptance:**

- [ ] No user-facing “go to Log vaccines page” capture CTA left pointing at deleted route
- [ ] Filter/source labels may still say vaccine as a **data type**; capture CTAs go to Growth
- [ ] E2E: Growth vaccine chip + save path; redirect from `/baby/vaccines`; hamburger has no Log vaccines; feed/diaper one-tap not regressed in existing care specs

**Tests (TDD — what turns red first):**

- [ ] Unit: i18n / link helpers if copy keys change
- [ ] E2E: replace vaccines page flows with Growth `?kind=vaccine` / chip select
- [ ] E2E: nav assertion updates (`e2e/baby-care.spec.ts` hamburger)

**Files likely touched:** Insights/Activities components + messages (`messages/baby/*`), `e2e/baby-care.spec.ts`, related unit tests (`lib/baby-i18n.test.ts`, etc.)

**Scope:** M

**Dependencies:** Task 3, Task 4

**Security / UI:** Links only to in-app Growth; no external URL injection.

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused unit tests pass
- [ ] Growth vaccine create works end-to-end (manual or e2e when Task 7 lands)
- [ ] `/baby/vaccines` redirect + no Capture nav item
- [ ] Feed/diaper one-tap still same step count
- [ ] Skeletons match live UI; light/dark spot-check
