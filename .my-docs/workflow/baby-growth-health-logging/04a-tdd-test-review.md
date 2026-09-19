# TDD test-case review: baby-growth-health-logging

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-18

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Unit: nav / header Growth label + `/baby/growth` | yes |
| 1 | real | Unit/config: measure→growth redirect; growth→insights gone | yes |
| 1 | real | E2E: `/baby/growth` capture; `/baby/measure` lands on Growth | yes |
| 2 | real / edge | Zod: med without name fails; vitamin+name ok; pump amount ok | partial |
| 2 | edge | Temperature empty fails; temp-only / symptoms-only / both ok | yes |
| 2 | edge | Bad symptom id fails; encode/decode round-trip; invalid JSON → empty + error | partial |
| 2 | edge | Reject unknown symptom ids on encode | yes |
| 3a | real | Unit: Growth-only chip catalog (UI-only `vaccine`; one `temperature`; Insights chips unchanged) | yes |
| 3a | edge | Unit: Recent merge N=50 each → top 50 by time | yes |
| 3a | real | Unit: vaccine Save maps to `createBabyVaccine` (name, dose, administeredAt) | yes |
| 3a | real | Component/unit: med name required blocks/errors Save | yes |
| 3a | real | E2E: log med + temp±symptom + pump; vaccine create + edit/delete from Growth Recent | yes |
| 3a | real | Vaccine Save UI failure (missing name or dose) | no |
| 3a | real | Empty Recent quiet copy | no |
| 3b | real | E2E: Vaccines no write controls + deep link → Growth `?kind=vaccine` | yes |
| 3b | real | Unit/component: Vaccines does not render create/edit/delete | yes |
| 3b | real | Existing Vaccines create e2e rewritten (not deleted) | partial |
| 4 | real | Unit/component: Insights without care/growth FilterMenu | yes |
| 4 | real | Unit: empty care/growth arrays = show all | yes |
| 4 | real | E2E: Insights date range; no care/growth chips | yes |
| 4 | real | Insights empty copy is date-range only (no filter advice) | no |
| 5 | real | Unit: Growth skeleton order; Insights `triggerCount` 1 | yes |
| 5 | real | Unit: Home/Activities Measure → Growth copy | yes |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 2 | Pump needs **unit** as well as amount; whitespace-only med/vitamin name | Unit on `createBabyGrowthSchema`: `kind: pump` with `valueNum` but missing/empty `unit` → fail; `medication` / `vitamin` with `valueText: "   "` → fail after trim. |
| Major | 2 | Invalid / legacy temperature `notes`: decode empty + error is planned, but design also **blocks Save/update until user re-picks** | Unit on encode/update path: after invalid decode (error signal set, symptoms empty), Save/update that would re-encode without an explicit re-pick → reject / keep blocked; after user checks a symptom (or clears via UI state), valid `v:1` JSON is allowed. |
| Major | 3a | Growth vaccine form: missing **name** or **dose** (first/second) — user-visible failure | Unit/component: vaccine kind Save disabled or field error when name blank or dose unset; pair with existing `createBabyVaccineSchema` (already rejects empty name / bad dose). |
| Major | 4 | Insights **empty copy** must not tell users to use care/kind filters (acceptance) | Unit (i18n / empty helper) or e2e: empty Insights range → copy mentions date range only; assert string does **not** match care/growth filter advice. |
| Major | 3b | Today’s e2e `vaccine create shows in list` writes on Vaccines — must **move**, not drop | Rewrite that case onto Growth (create via Growth vaccine kind → row in Growth Recent and/or Vaccines read list); Vaccines e2e asserts no create form. |
| Enhancement | 3a | Empty Recent quiet state | Unit/component or short e2e: both lists empty → muted “No entries yet…” (or i18n key); no error Alert. |
| Enhancement | 3a | One list fails, other succeeds (partial Recent) | Only if Build keeps independent fetches: assert growth rows still show when vaccines query errors (or shared load-error if that is the chosen UX). Skip inventing if UI uses one combined error. |

## Real scenarios checked

- Happy path: Route reclaim; Growth log med / temp±symptoms / pump / vaccine; Recent edit/delete for doses; Insights date-only; Vaccines deep link — **planned and strong**.
- User-visible failures: Med name + empty temperature — **planned**. Vaccine missing name/dose on Growth UI — **missing**. Insights empty copy — **missing** (filters gone, but copy untested).
- Empty / loading / permission: Skeletons — **planned**. Empty Recent — **not planned** (Enhancement). Auth/workspace — reuse existing Baby gate; no new permission cases needed.

## Edge scenarios checked

- Boundaries / invalid input: Temperature empty / temp-only / symptoms-only / both; bad symptom ids; encode/decode — **mostly planned**. Pump **unit** + whitespace name — **gap**. Invalid notes **re-pick before Save** — **gap**.
- Concurrency / double-submit / idempotency: Not implied by design this pass — **OK to skip** (no Fix ask).
- Offline / partial data / race: Recent dual-fetch partial fail — **optional Enhancement** only if Build keeps independent queries.

## Fix ask for Build

Concrete tests to add or strengthen (few strong ones):

1. **Task 2 — `createBabyGrowthSchema pump requires unit; med/vitamin trim name`:** Pump with amount but no unit fails; `"   "` name fails for medication and vitamin.
2. **Task 2 — `temperature notes invalid decode blocks Save until re-pick`:** Invalid/legacy notes → safe empty + error signal; update/Save rejected until UI has explicit symptom (or clear) state; then encodes `v:1` allowlisted JSON only.
3. **Task 3a — `growth vaccine Save needs name and dose`:** Vaccine chip form: blank name or unset dose → field error / Save blocked (maps to existing Zod).
4. **Task 4 — `insights empty copy is date-only`:** Empty Insights state copy mentions date range only; does not mention care or growth kind filters.
5. **Task 3b — rewrite Vaccines create e2e onto Growth:** Replace `vaccine create shows in list` write-on-Vaccines with Growth create + Vaccines read-only asserts; keep coverage, do not delete without replacement.

Fold items 1–5 into `04-tasks.md` TDD bullets (Tasks 2, 3a, 3b, 4) before Gate B when practical. Items under Enhancement are optional.

## Round notes

- `03a-design-review-log.md` Result **clean** (round 3); locks honored: D2–D7, empty temperature, symptoms JSON-only, Growth-only chips, Vaccines fully read-only, Recent N=50, last-used deferred, Insights bar styles kept.
- Skimmed existing suites: `lib/validators/baby.test.ts` (growth Zod thin today; vaccine name/dose already covered), `features/baby/server/growth.test.ts` / `vaccines.test.ts`, `lib/baby-growth-kind-chips.test.ts` (five Insights kinds), `lib/baby-insights-filters.test.ts` (empty = all), `components/baby-page-skeleton.test.ts`, `e2e/baby-care.spec.ts` (measure page + **Vaccines create** still write-home on Vaccines).
- Planned happy paths and core Zod temperature cases are good. Gaps are **boundary Zod (pump unit / trim name)**, **invalid-notes re-pick**, **Growth vaccine UI failures**, **Insights empty copy**, and **hard rewrite** of the existing Vaccines create e2e.
- Result stays **needs more tests** until Fix ask 1–5 are in tasks (or equivalent red-first cases).
- **2026-09-18:** Fix ask items 1–5 folded into `04-tasks.md` TDD notes (Tasks 2, 3a, 3b, 4). Enhancements left optional / not required for Gate B.
