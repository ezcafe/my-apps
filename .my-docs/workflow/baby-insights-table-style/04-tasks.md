# Tasks: Baby Insights table style + default today

**Recommended design:** Option 1 — in-dashboard Table + mobile cards; `babyInsightsDefaultRange` → local today; both lists; no URL sync.  
**Status:** draft built — awaiting Gate 2 before my-review-workflow.

**Order:** failing default-range unit test → implement today helper → **failing Insights e2e** (today + table/card chrome) → timeline UI + skeleton → growth UI + skeleton → green e2e → empty-copy / i18n + light/dark.

---

## Task 1: Failing unit test — default range is today

**Description:** Update `lib/baby-insights-default-range.test.ts` so `babyInsightsDefaultRange` expects local today (`fromDate` = `toDate` = that day’s `YYYY-MM-DD`), not this calendar month. Keep `babyInsightsDateBoundsIso` tests as-is unless they need a same-day case.

**Acceptance criteria:**

- [x] Test for fixed `Date(2026, 8, 15)` expects `{ fromDate: "2026-09-15", toDate: "2026-09-15" }`
- [x] Old month expectation is removed
- [x] Test **fails** against current production helper (red before Task 2)

**Tests (TDD — what turns red first):**

- [x] `pnpm test` (or project node:test command) on `lib/baby-insights-default-range.test.ts` — assertion fails on month range

**Files likely touched:** `lib/baby-insights-default-range.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Implement today default in helper

**Description:** Change `babyInsightsDefaultRange` to return local today via `toLocalDateString(now)` for both `fromDate` and `toDate`. Stop wrapping `defaultAnalyticsFilters` for Baby. Do not change Money’s `defaultAnalyticsFilters`.

**Acceptance criteria:**

- [x] Task 1 unit test passes
- [x] `babyInsightsDateBoundsIso` still maps inclusive start/end of day
- [x] Money Insights / analytics month default unchanged

**Tests (TDD — what turns red first):**

- [x] Green: focused `baby-insights-default-range` tests
- [x] Required (04a): same-day bounds case for `"2026-09-15"` / `"2026-09-15"`

**Files likely touched:** `lib/baby-insights-default-range.ts`, `lib/baby-insights-default-range.test.ts`

**Scope:** S

**Dependencies:** Task 1

---

### Checkpoint A (after Tasks 1–2)

- [x] Default-range unit tests green
- [x] No Money filter default files touched
- [x] Manual smoke optional: Insights Apply/Reset still call `defaultFilterState()` (will land on today once UI loads)

---

## Task 3a: Failing e2e — today default + table/card chrome

**Description:** Add Insights e2e asserts **before** any Task 3–4 UI edits. Spec must fail on current code: old divide-y `<ul>` chrome and/or month-first default. Cover today default via **period chip or date controls** (not only list row fixtures — mocks often ignore `from`/`to`). Assert table/card chrome presence (roles/labels or structure), not the old list-only markup.

**Acceptance criteria:**

- [x] Spec **fails** against current Insights UI (red before Tasks 3–4)
- [x] Asserts today default using period chip and/or from/to controls
- [x] Asserts table/card chrome for lists (not divide-y-only `<ul>`)
- [x] Does not assert Money Insights defaults
- [x] Empty-today path (if fixtures allow) is treated as non-error
- [x] 04a: Reset → today after changed range
- [x] 04a: empty mocks show muted empty copy, not section error

**Tests (TDD — what turns red first):**

- [x] Add/adjust Playwright asserts in `e2e/baby-care.spec.ts` (or Insights-specific spec) and run until **red** for the right reasons
- [x] Prefer stable roles/labels over brittle class names
- [x] Do **not** wait for “polish” — this task is the automated repro that must exist before UI chrome work

**Files likely touched:** `e2e/baby-care.spec.ts` and/or Insights e2e file

**Scope:** M

**Dependencies:** Checkpoint A (Task 2 done so unit default is today; e2e still red on list chrome until Tasks 3–4)

---

## Task 3: Timeline list → Table + mobile cards (+ skeleton parity)

**Description:** In `BabyInsightsDashboard`, replace the timeline `<ul divide-y>` with a flat section: `@container`, `hidden @md:block` shared `Table` (Baby columns: summary, duration/clock, source), and `@md:hidden` card rows matching loans/Transactions mobile pattern. Keep show-more and load-more wiring. Update `BabyInsightsPageSkeleton` (and route loading if it embeds that skeleton) timeline slot to mirror Table + cards — **same task**, zero CLS.

**Acceptance criteria:**

- [x] Timeline no longer uses divide-y `<ul>` chrome
- [x] Desktop table + mobile cards; no Card wrapper
- [x] Baby fields preserved (summary, duration, stop clock, telegram source)
- [x] Show more / Load more still work
- [x] Skeleton timeline block matches live layout (order, `@md` split, radii)
- [x] Empty / error states still use existing copy paths (empty ≠ hard error)
- [x] Visible list name stays section `h2`; any `TableCaption` is `sr-only` or omitted
- [x] Show more / Load more remain keyboard-reachable ≥ comfortable hit size

**Tests (TDD — what turns red first):**

- [x] Task 3a e2e already red for timeline chrome — drive Task 3 until those asserts move toward green for timeline
- [ ] If extracting pure column/label helpers, unit-test those first (red → green) — N/A (kept in dashboard)
- [ ] Manual: narrow viewport sees cards; wider sees table

**Files likely touched:** `components/baby-insights-dashboard.tsx`, `components/baby-page-skeleton.tsx`, possibly `app/(shell)/baby/insights/loading.tsx`

**Scope:** M

**Dependencies:** Task 3a (failing e2e must exist first)

**Security / a11y notes:** No `dangerouslySetInnerHTML`; keep text nodes; section `h2` visible; caption only if `sr-only`.

---

## Task 4: Growth list → Table + mobile cards (+ skeleton parity)

**Description:** Same chrome restyle for the growth history list: Table + mobile cards, Baby fields (kind, value+unit, recorded time). Keep show-more / load-more. Update growth skeleton slot in the same change.

**Acceptance criteria:**

- [x] Growth list uses Table/card chrome, not divide-y `<ul>`
- [x] Fields unchanged in meaning
- [x] Show more / Load more still work
- [x] Skeleton growth block matches live layout
- [x] Empty / error unchanged in behavior (empty ≠ hard error)
- [x] Visible list name stays section `h2`; any `TableCaption` is `sr-only` or omitted

**Tests (TDD — what turns red first):**

- [x] Task 3a e2e growth/table asserts still failing until this task greens them
- [ ] Manual: both sections look consistent on one page

**Files likely touched:** `components/baby-insights-dashboard.tsx`, `components/baby-page-skeleton.tsx`

**Scope:** M

**Dependencies:** Task 3 (reuse same Table/card markup pattern); Task 3a

---

### Checkpoint B (after Tasks 3–4)

- [x] Both lists use Transactions-like chrome
- [x] Skeletons match both lists (no leftover divide-y list skeletons)
- [x] Focused unit tests for default range still green
- [x] Task 3a e2e expected to be green or near-green (finalize in Task 5)
- [ ] Light + dark quick glance on Insights lists

---

## Task 5: Green e2e — confirm today + table chrome

**Description:** Run and finish the Task 3a Insights e2e until green after Tasks 3–4. Fix flaky selectors only if needed. This is **not** optional polish — it is the mandatory red→green closeout for the UI chrome change.

**Acceptance criteria:**

- [x] Task 3a asserts pass after Tasks 3–4
- [x] Spec still fails if someone reverts to month-only default or old `<ul>`-only chrome
- [x] Does not assert Money Insights defaults

**Tests (TDD — what turns red first):**

- [x] Re-run Playwright until green; keep Task 3a asserts (do not delete the repro)
- [x] Prefer stable roles/labels over brittle class names

**Files likely touched:** `e2e/baby-care.spec.ts` and/or Insights e2e file (selector tweaks only if needed)

**Scope:** S

**Dependencies:** Tasks 3–4 (and Task 3a asserts already present)

---

## Task 6: Empty recovery copy + i18n / period chip + mobile a11y pass

**Description:** Update empty-today copy (`insights.emptyTimeline` / `insights.emptyGrowth` or adjacent strings) so a quiet day stays muted **and** guides caregivers to widen from/to via the **existing** date filter + Apply — empty ≠ error. Confirm period chip / leftover “this month” copy still make sense for today-only. Spot-check keyboard focus on Show more / Load more and filter controls; confirm no hover-only actions on rows.

**Acceptance criteria:**

- [x] Empty today copy includes a plain next-action sentence (widen range via existing date filter / Apply)
- [x] Empty is still not treated as a hard error (no destructive empty UI)
- [x] Period chip shows today (or correct applied range) without lying “this month” when range is today
- [x] No new English hard-codes in Baby VI chrome
- [x] Icon-only controls (if any added) use `iconOnly` / `fx-hit-40`
- [ ] Light + dark OK for both tables

**Tests (TDD — what turns red first):**

- [x] i18n unit: empty timeline + growth strings include recovery guidance (Widen / Apply; VI Mở rộng / Áp dụng)
- [x] e2e empty-today path still non-error and shows recovery wording

**Files likely touched:** i18n locale files; possibly `components/baby-insights-dashboard.tsx`

**Scope:** S

**Dependencies:** Tasks 3–4

---

### Checkpoint C (after Tasks 5–6)

- [x] E2E green for Insights today + table chrome
- [x] Unit default-range green
- [x] Empty today has recovery guidance; still ≠ error
- [x] Skeleton parity reviewed
- [x] Security: no new deps, no authz changes, no unescaped HTML
- [ ] Ready for design-review / later Gate 2 after Build — **awaiting Gate 2**

---

## Out of scope (do not create tasks)

- URL `from`/`to` sync
- Money sort / bulk select / Edit row
- Changing Money Insights month default
- New GraphQL fields
- Option 2 component extract (unless Gate 2 picks Option 2 — then split Tasks 3–4 into extract + wire)
