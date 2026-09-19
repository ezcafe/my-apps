# TDD test-case review: baby-log-money-new-form

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-19

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Chip order Pump→Vaccine→…; `vaccine` at index 1 | yes (planned; existing chips test will go red) |
| 1 | edge | `isBabyGrowthPageChip("vaccine")` true; `isBabyGrowthPageDbKind("vaccine")` false | yes (planned) |
| 1 | edge | Insights growth chips still exclude vaccine | yes (planned + existing assert) |
| 2 | real / edge | `growthVaccineCreateInput` / `SaveBlocked` empty name/dose | yes (existing `lib/baby-growth-recent.test.ts`) |
| 2 | real / edge | `?kind=vaccine` selects Vaccine; unknown kind → Weight; default Weight | yes (planned unit) |
| 2 | real | Save branch → `createBabyVaccine` vs `createBabyGrowth` | yes (planned unit) |
| 2 | real | After save: stay on Growth, reset Weight, invalidate + toast; **no** `router.push("/baby")` | partial — “Unit or e2e”; stay lock not pinned to a red-first unit |
| 3 | real | Section nav excludes `/baby/vaccines` | yes (planned; existing nav test will go red) |
| 3 | real / edge | Header no longer treats vaccines as live capture title | yes (planned) |
| 3 | real | Permanent redirect `/baby/vaccines` → Growth `?kind=vaccine` | partial — only “E2E later”; no unit though `baby-growth-redirects.test.ts` already locks measure→growth |
| 4 | real | Remove/update `BabyVaccinesPage` tests; keep vaccine server/validator green | yes (planned cleanup) |
| 5 | real | Feed method / diaper kind / sleep primary still one-tap (no new required Save) | yes (planned; needs concrete assertions in Fix ask) |
| 6 | real / empty-loading | Static Growth skeleton: 8 chips + field/Save; no `?kind=` | yes (planned; strengthen existing kinds→form check) |
| 7 | real | Copy/links + e2e: Growth vaccine path, redirect, no Log vaccines nav, feed/diaper smoke | yes (planned) |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Critical | 3 | Redirect destination wrong or missing `kind=vaccine` (design failure: vaccine “gone”) | Unit in `lib/baby-growth-redirects.test.ts`: assert `next.config.ts` permanently redirects `/baby/vaccines` (and `/:path*` if added) to `/baby/growth?kind=vaccine` — same style as measure→growth |
| Major | 2 | Growth still uses `BABY_CARE_AFTER_SAVE.diaper` → home; stay lock only optional e2e | Unit (red first): add Growth stay constant (e.g. `BABY_CARE_AFTER_SAVE.growth` = `"stay"`) + assert Growth save wiring uses it / `afterSave: "stay"`; assert **not** `diaper`/`home`; on success mock — `router.push` never called with `/baby` |
| Major | 2 | Invalidate scope easy to swap (vaccines vs growth) | In same save-path unit: vaccine success → vaccines invalidate key/scope; growth-kind success → growth scope (not the other way) |
| Enhancement | 5 | One-tap tests named but weak if only “no Save string” | Prefer: feed method / diaper kind control still call create on primary tap; assert no new required primary Save control on those one-tap paths; sleep start/end still use existing stay/home contracts |

## Real scenarios checked

- Happy path: Chip order + vaccine sentinel; `?kind=vaccine`; vaccine + growth save branches; nav drop; one-tap chrome; static skeleton; Activities/Insights + e2e (Task 7).
- User-visible failures: Empty name/dose gate covered by existing vaccine helper tests; mutation field/toast reuse implied (no new API).
- Empty / loading / permission: Static Growth skeleton planned; auth/workspace unchanged (no new permission tests needed this pass).

## Edge scenarios checked

- Boundaries / invalid input: Unknown `kind` → Weight; vaccine not a DB growth kind; Insights chips exclude vaccine — planned/existing.
- Concurrency / double-submit / idempotency: Not required this pass (no new double-submit contract in design).
- Offline / partial data / race (if relevant): N/A for chrome + redirect merge; redirect unit fills the bookmark edge.

## Fix ask for Build

Concrete tests to add or strengthen:

1. **Task 3 — Critical:** Unit `baby growth redirects … /baby/vaccines → /baby/growth?kind=vaccine` (permanent; include `/:path*` if Task 3 adds it). Do not wait only for Task 7 e2e.
2. **Task 2 — Major:** Red-first unit locking Growth/vaccine post-save to `afterSave: "stay"` (Growth stay constant on `BABY_CARE_AFTER_SAVE` preferred); assert no `router.push("/baby")`; assert not `BABY_CARE_AFTER_SAVE.diaper`.
3. **Task 2 — Major:** Same or paired unit: vaccine save invalidates vaccines scope; growth-kind save invalidates growth scope; both reset selection to Weight.
4. **Task 5 — Enhancement:** Name assertions so Build cannot “pass” with a new required Save on feed/diaper/sleep one-tap paths.
5. Fold items 1–3 into `04-tasks.md` Task 2/3 TDD bullets before Gate B when practical.

## Round notes

- Fresh read of `03`, `04`, `03a` (clean); skimmed chips, vaccine helpers, redirects, care-save-navigate, nav/header, skeleton, e2e vaccine refs. No product code.
- Strong base: Task 1 chips, existing vaccine input gates, Task 5 one-tap intent, Task 6/7 skeleton + e2e.
- Parent folded Fix ask 1–4 into `04-tasks.md` Task 2/3/5 TDD bullets before Gate B (2026-09-19).
- Blockers for **clean**: redirect destination must be unit-locked (repo already has the pattern); Growth stay-vs-home must not be optional e2e-only after design-review made stay a lock.
- Next (parent): fold Fix ask into `04-tasks.md` → Gate B → Build. Do not Build yet.
