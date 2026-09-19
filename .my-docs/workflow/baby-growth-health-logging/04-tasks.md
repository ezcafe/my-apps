# Tasks: Baby Growth + health logging

**Depends on:** Gate B approval of `03-design.md` (**Decision 1 Option 1** locked).  
**Locks:** D2–D7 Option 1; Gate A2 Insights bar styles unchanged (chips removed only); last-used med/vitamin UI **deferred** this pass.

---

## Task 1: Reclaim `/baby/growth` route + redirects

**Description:**
Remove permanent `/baby/growth` → Insights redirects in `next.config.ts`. Move `app/(shell)/baby/measure` → `growth` (page + loading). Add permanent `/baby/measure` → `/baby/growth`. Point nav, headers, Insights CTA, and tests at Growth URL/labels.

**Acceptance:**

- [ ] `/baby/growth` serves capture (not Insights redirect)
- [ ] `/baby/measure` permanently redirects to `/baby/growth`
- [ ] Nav + header + user-facing copy say **Growth** (EN+VI); no Measure label on this path
- [ ] Unit/nav tests updated for href `/baby/growth`

**Tests (TDD — what turns red first):**

- [ ] Unit: `app-section-nav` / `baby-app-header` expect Growth label + `/baby/growth`
- [ ] Unit or config assertion: measure→growth redirect present; growth→insights redirect gone
- [ ] E2E: open `/baby/growth` shows Growth capture; `/baby/measure` lands on Growth

**Files likely touched:** `next.config.ts`, `app/(shell)/baby/measure/*` → `growth/*`, `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, `messages/baby/{en,vi}.ts`, related `*.test.ts`, `e2e/baby-care.spec.ts`

**Scope:** M

**Dependencies:** none

**Security / UI:** No auth change. Skeleton rename with page (Task 5 can finish parity). Mobile: nav still reachable.

---

## Task 2: Extend growth kind enum + Zod field rules

**Description:**
Add `vitamin` and `pump` to `baby_growth_kind` (schema + migration). Extend Zod: med/vitamin require `valueText` name; pump requires `valueNum`+`unit`; **temperature** requires at least one of non-null `valueNum` **or** non-empty allowlisted symptoms in `notes` (reject empty temperature rows). Temperature `notes` = symptoms JSON only (`v:1`, fixed ids) — no parallel free-text. Keep Feed pump unrelated.

**Acceptance:**

- [ ] DB enum includes `vitamin`, `pump`
- [ ] `createBabyGrowth` / update reject medication/vitamin without non-empty `valueText`
- [ ] Pump requires numeric amount + unit
- [ ] Temperature with neither `valueNum` nor symptoms rejected; temp-only, symptoms-only, and both accepted
- [ ] Unknown symptom ids rejected; known ids accepted in notes JSON
- [ ] Encode/decode helpers: round-trip valid JSON; invalid/legacy notes → empty symptoms + field-error path (no silent wipe of free-text without explicit edit)

**Tests (TDD — what turns red first):**

- [ ] Unit: `createBabyGrowthSchema` / growth server — med without name fails; vitamin+name ok; pump amount ok
- [ ] Unit: `createBabyGrowthSchema` — `kind: pump` with `valueNum` but missing/empty `unit` → fail; `medication` / `vitamin` with `valueText: "   "` → fail after trim
- [ ] Unit: temperature empty (no valueNum + empty symptoms) **fails**; temp-only ok; symptoms-only ok; both ok
- [ ] Unit: bad symptom id fails; encode/decode round-trip; invalid JSON decode → safe empty + error signal
- [ ] Unit: reject unknown symptom ids on encode path
- [ ] Unit on encode/update path: after invalid/legacy notes decode (error signal set, symptoms empty), Save/update that would re-encode without an explicit re-pick → reject / keep blocked; after user checks a symptom (or clears via UI state), valid `v:1` allowlisted JSON is allowed

**Files likely touched:** `db/schema/baby.ts`, migration, `lib/validators/baby.ts`, `features/baby/server/growth.ts`, `lib/baby-growth-symptoms.ts` (new helper), `*.test.ts`

**Scope:** M

**Dependencies:** none (can parallel Task 1)

**Security:** Server-side Zod + allowlist (OWASP A01/A03/A04). No logging of notes bodies in new tests/helpers.

---

## Task 3a: Growth page — kinds, forms, Recent merge + vaccine Save

**Description:**
Rename Measure page → Growth (Option 1 packaging). Own a **Growth-only** chip catalog (see `03-design.md`): `weight`, `height`, `head`, `medication`, `vitamin`, `vaccine` (UI-only), `pump`, `temperature` (one Temp±symptoms chip). Do **not** extend `BABY_INSIGHTS_GROWTH_CHIPS` / Activities chip lists for vitamin/pump/vaccine. Wire Save: growth mutations for measures/med/vitamin/pump/temp±symptoms; vaccine mutations for vaccine (name + first/second + time). Merge vaccine rows into Recent (fetch N=50 each, merge, take top 50). Edit/Delete route by source — **Growth Recent owns vaccine edit/delete** (Vaccines page has no write UI; Task 3b). Deep link `?kind=vaccine` preselects vaccine chip. **Defer** last-used med/vitamin chips — typed name required only.

**Acceptance:**

- [ ] User can add/edit/delete: weight/height/head, medication, vitamin, pump (amount+time), temperature±symptoms, vaccine dose (first/second required)
- [ ] Growth chip ids match catalog above; Insights/Activities growth chips unchanged (today’s five)
- [ ] Med/vitamin Save blocked without typed name (UI + server); no last-used chips this pass
- [ ] Symptoms work with or without temp; empty temperature row blocked; one temp±symptoms kind
- [ ] Recent shows growth + vaccine rows sorted by time (N=50 merge rule)

**Tests (TDD — what turns red first):**

- [ ] Unit: Growth chip catalog ids (incl. vaccine UI-only; single `temperature`; no silent Insights chip extension)
- [ ] Unit: Recent merge — fetch/limit N=50 each, merge, top 50 by time
- [ ] Unit: vaccine Save maps to `createBabyVaccine` input (name, dose, administeredAt)
- [ ] Component/unit: med name required disables/errors Save
- [ ] Unit/component: vaccine kind Save disabled or field error when name blank or dose unset (pairs with existing `createBabyVaccineSchema`)
- [ ] E2E: Growth log med + temp with symptom + pump; vaccine dose create + edit/delete from Growth Recent

**Files likely touched:** `components/baby-measure-page.tsx` → growth, chip catalog helper, GraphQL client usage, i18n, `e2e/baby-care.spec.ts`, merge helper tests

**Scope:** M

**Dependencies:** Task 1 (route), Task 2 (kinds/validators)

**Security / UI:** ≥44px chips/Save; field errors for name / empty temp; pump copy ≠ Feed. Light+dark tokens only.

---

## Task 3b: Vaccines page read-only + deep link

**Description:**
Make Vaccines page **schedule/read only** — remove **all** dose write UI (no create, no update, no delete). Keep schedule/list for reading. Add “Log a dose on Growth” deep link → `/baby/growth?kind=vaccine`. Vaccine edit/delete lives only on Growth Recent (Task 3a). Do not leave a second write home on Vaccines.

**Acceptance:**

- [ ] Vaccines page has **no** dose write controls (create, edit, or delete)
- [ ] Deep link opens Growth with vaccine kind preselected
- [ ] Creating, updating, and deleting doses only possible from Growth (Task 3a)

**Tests (TDD — what turns red first):**

- [ ] E2E: Vaccines has deep link and **no** write controls; link lands on Growth vaccine kind
- [ ] Unit/component (as fits): Vaccines page does not render create, edit, or delete controls
- [ ] E2E rewrite (do not delete without replacement): move `vaccine create shows in list` off Vaccines write UI — create via Growth vaccine kind → row in Growth Recent and/or Vaccines read list; Vaccines e2e asserts no create form

**Files likely touched:** `components/baby-vaccines-page.tsx`, i18n, `e2e/baby-care.spec.ts`

**Scope:** S

**Dependencies:** Task 1 (Growth URL), Task 3a (vaccine kind + Recent edit/delete on Growth)

**Security / UI:** No dual vaccine write — create/update/delete only on Growth (OWASP A04). Quiet deep-link cue per `01b`.

---

## Task 4: Insights date-only filter chrome
**Description:**
On Insights only: omit care/growth `multiSelectFilters`; force empty chip state (= all). Keep `InsightsDateRangeFiltersBar` + period chip styles as today (Gate A2). Update empty/error copy to date range only. Do **not** trim Activities chips.

**Acceptance:**

- [ ] Insights shows no care-type / growth-kind filter chrome
- [ ] Date/period Apply/Reset still work; default period unchanged
- [ ] Empty copy never tells users to use care/kind filters
- [ ] Activities filter chips unchanged

**Tests (TDD — what turns red first):**

- [ ] Unit/component: Insights renders without care/growth FilterMenu triggers
- [ ] Unit: empty care/growth arrays still mean “show all” in insights helpers
- [ ] E2E: Insights can set date range; no care/growth chip controls visible
- [ ] Unit (i18n / empty helper) or e2e: empty Insights range → copy mentions date range only; assert string does **not** match care/growth filter advice

**Files likely touched:** `components/baby-insights-dashboard.tsx`, empty-copy i18n, insights filter tests, `e2e/baby-care.spec.ts`

**Scope:** S

**Dependencies:** none (parallel after Task 1 copy if CTA rename needed)

**UI:** Skeleton `triggerCount` 1 (Task 5). Do not restyle date bar.

---

## Task 5: Skeletons + Home/Activities Growth copy coherence

**Description:**
Update Growth loading skeleton to match live kind→form→Recent order. Insights skeleton drops care/growth chip placeholders. Rename remaining Measure cues on Home/Activities to Growth (no Activities chip redesign).

**Acceptance:**

- [ ] Growth `loading.tsx` / skeleton mirrors live hierarchy (zero CLS intent)
- [ ] Insights skeleton matches date-only chrome
- [ ] Home/Activities user-facing Measure strings for this path say Growth
- [ ] Light + dark still use semantic tokens

**Tests (TDD — what turns red first):**

- [ ] Unit: skeleton tests assert Growth structure / Insights triggerCount 1
- [ ] Unit: i18n / home cue strings no longer say Measure for this path

**Files likely touched:** `components/baby-page-skeleton.tsx`, `app/(shell)/baby/growth/loading.tsx`, `components/baby-home.tsx`, `components/baby-activities-page.tsx` (copy only), `messages/baby/*`, skeleton tests

**Scope:** S

**Dependencies:** Task 3a (final Growth layout), Task 4 (Insights chrome)

**UI / mobile:** Concentric radii; ≥44px hits unchanged; no hover-only Edit.

---

## Checkpoints

After Tasks 1–2:

- [ ] Redirects + enum/Zod unit tests green (incl. empty temperature reject + notes encode/decode)
- [ ] Manual: `/baby/growth` loads (even if forms still Measure-shaped)

After Tasks 3a–4:

- [ ] E2E happy path: Growth log med + temp±symptom + pump + vaccine; Insights date-only
- [ ] Vaccines has no write controls (create/edit/delete); deep link works (Task 3b)
- [ ] Focused unit suites green (chip catalog + Recent N=50 merge)

After Task 5:

- [ ] Skeleton tests green; quick light/dark glance on Growth + Insights
- [ ] Slice matches success criteria in `01-idea.md`
