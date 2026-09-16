# TDD test-case review: baby-insights-table-style

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-14

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Unit: `babyInsightsDefaultRange(Date(2026, 8, 15))` → today pair `"2026-09-15"` / `"2026-09-15"` (replace month assert in `lib/baby-insights-default-range.test.ts`) | yes (planned; current file still asserts month → will go red) |
| 2 | real | Green focused default-range unit suite after helper change | yes (planned) |
| 2 | edge | Optional same-day `babyInsightsDateBoundsIso` inclusive start/end of one day | partial (marked optional; design failure mode if wrong) |
| 2 | real | Money `defaultAnalyticsFilters` month default unchanged | partial (acceptance only; Money suites already exercise month defaults elsewhere) |
| 3a | real | E2E: Insights opens with **today** via period chip and/or from/to controls (not only list fixtures) | yes (planned; not written yet) |
| 3a | real | E2E: growth + timeline use table/card chrome (not divide-y-only `<ul>`) | yes (planned; not written yet) |
| 3a | real | E2E: empty today treated as non-error | partial (“if fixtures allow”) |
| 3–4 | real | Drive Task 3a asserts green for timeline then growth; manual narrow/wide viewport | yes (planned) |
| 5 | real | Re-run Task 3a e2e until green; keep repro | yes (planned) |
| 6 | real | Empty recovery copy + period chip sense-check + light/dark | partial (mostly manual; e2e optional) |
| Design locked #6 | real | Reset rebuilds via helper → Reset returns to **today** | no (Checkpoint A “manual smoke optional” only) |
| Design | edge | GraphQL auth / section error paths | n/a for new tests (unchanged; existing error UI stays) |
| Design | edge | Double-submit Apply / load-more races | n/a (behavior unchanged this pass) |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 2 | Same-day inclusive ISO bounds (today window) not required | Unit: `babyInsightsDateBoundsIso("2026-09-15", "2026-09-15")` → `from` = local start of day ISO, `to` = local end of day ISO (23:59:59.999). Make Task 2’s “optional” case **required**. |
| Major | 3a / 5 | Reset → today not in automated plan | E2E (same Insights spec as Task 3a): change from/to away from today → Apply → click Reset → from/to (or period chip date text) again equals local today; lists stay non-error. |
| Major | 3a | Empty today “non-error” is soft / fixture-gated | E2E with GraphQL mocks returning empty `items` for timeline + growth: muted empty copy visible; **no** section error / destructive empty UI. |
| Major | 6 | Empty recovery guidance has no strong assert | Unit/i18n: after string update, `t("insights.emptyTimeline")` and `t("insights.emptyGrowth")` (EN at least; VI if key shared) include plain next-action wording (widen range / date filter / Apply). Keep existing “key exists” checks. |
| Enhancement | 3a | Period chip must not imply “this month” on today | Fold into today-default e2e: period/showing text reflects a single day (or equal from/to), not month-only wording. |
| Enhancement | 3–4 | Skeleton parity / CLS | Keep manual Checkpoint B glance; no new automated CLS test required this pass. |

## Real scenarios checked

- Happy path: Unit today default (Tasks 1–2) + e2e today + table/card chrome for both lists (Tasks 3a → 5) — **planned well**.
- User-visible failures: Section GraphQL errors unchanged — **no new tests needed**; do not treat empty as error.
- Empty / loading / permission: Empty ≠ error + recovery copy **under-specified in TDD**; loading/skeleton = manual; permission gate unchanged.

## Edge scenarios checked

- Boundaries / invalid input: Same-day `babyInsightsDateBoundsIso` **must be added** (design calls out inclusive day vs Home half-open). Invalid GraphQL args / huge ranges = existing server caps — out of scope.
- Concurrency / double-submit / idempotency: **N/A** for this chrome + default pass.
- Offline / partial data / race: Load-more / show-more behavior unchanged — **N/A** unless Build breaks wiring (acceptance still manual/e2e chrome only).

## Fix ask for Build

Concrete tests to add or strengthen (still Red before product code where possible):

1. **Task 2 — required unit:** `babyInsightsDateBoundsIso` same-day case for `"2026-09-15"` / `"2026-09-15"` (inclusive local day). Do not leave this optional.
2. **Task 3a — strengthen e2e** (one Insights spec is enough):
   - Today default via period chip and/or from/to (equal local today).
   - Both growth and timeline: table role and/or mobile card structure; fail if only old divide-y `<ul>` chrome remains.
   - Empty mocks: empty copy shown; not an error state.
   - Reset after a changed range returns to today.
3. **Task 6 — i18n/unit:** Assert empty timeline + growth strings include recovery guidance (widen via existing date filter / Apply). Keep empty ≠ hard error in e2e from (2).

Do **not** delete existing good Insights e2e (filters, chips, redirects, charts). Prefer few strong asserts over brittle class-name lists.

## Round notes

- Read: `03-design.md`, `04-tasks.md`, `03a` Result **clean**, existing `lib/baby-insights-default-range.test.ts` (still month), skim of `e2e/baby-care.spec.ts` Insights tests (no table/today/Reset asserts yet), empty keys in `messages/baby/en.ts`.
- Planned TDD order (unit → failing e2e → UI → green) is sound; gaps are **Reset → today**, **same-day bounds**, and **empty recovery / non-error** automation.
- Result **needs more tests** until Fix ask items 1–3 are in the Red plan (Enhancements optional).
- No product code written in this review.

## Build follow-up (2026-09-14)

Fix ask closed during Build:

1. Same-day `babyInsightsDateBoundsIso` unit — green.
2. E2E today + table chrome + empty non-error + Reset → today — green.
3. i18n empty recovery (Widen/Apply) — green.
