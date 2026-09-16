# Tasks: Baby Insights charts, KPIs, guidance, editable activity table

**Chosen design:** Option 2 — server-side `babyInsightsSeries` aggregate (workspace-scoped) + shared pure derive helpers; progressive disclosure UI; Money-style edit modal; reuse table-style chrome. Activity log still uses Insights-only timeline/growth **with `payload`**. Default #2 = **Night Rest** duration (not efficiency %).  
**Status:** draft for Gate 2 (human picked Option 2).

**Order:** failing derive unit tests → helpers → failing e2e (default two charts) → GraphQL `babyInsightsSeries` + Insights-only timeline `payload` → dashboard wiring/skeleton from series → More insights shell → deferred charts → Activity log unify + edit modal → green e2e → i18n / light-dark polish.

---

## Task 1: Failing unit tests — hydration series + alert

**Description:** Add pure-helper tests for daily wet-diaper count vs feed count / formula ml, and the ~6 wet/day light-alert rule. Cover soft empty when inputs are too thin. Tests must fail until the helper exists (or against a stub that always returns empty). Helpers are shared — server series resolver will call them later.

**Acceptance criteria:**

- [ ] Tests cover: wet vs feeds by day; formula ml when present; soft empty when no useful series
- [ ] **Hydration wetness:** `wetCount` counts `kind ∈ {wet, mixed}` (not wet-only; `dry` / dirty-only excluded). Diaper Output **Wet** bucket may stay wet-only (different chart) — do not conflate in hydration tests
- [ ] **`low_wet` day-scope:** alert when **any** day in the applied range has wet &lt; 6 **and** that same day has ≥1 feed **or** formula ml &gt; 0; no alert if low-wet day has neither feed nor formula ml; not average-across-range; not last-day-only
- [ ] **`low_wet` + truncation:** when `hasMorePages` is true, alert is **null** even if day-scope wet rule would otherwise fire (helper rule unchanged for reuse / tests)
- [ ] Never invent breast ml from duration
- [ ] Soft empty when no wet and no useful feed/formula signal
- [ ] Tests **fail** before helper implementation (red)

**Tests (TDD — what turns red first):**

- [ ] New `lib/baby-insights-hydration*.test.ts` (name flexible) — red on missing export / wrong buckets
- [ ] **Required named cases** (Fix ask — do not skip):
  - [ ] `wet+mixed count toward wetCount; dry and dirty-only do not`
  - [ ] `low_wet when mid-range day has wet&lt;6 and ≥1 feed` (other days fine → still alert)
  - [ ] `no low_wet when low-wet day has zero feeds and zero formulaMl`
  - [ ] `hasMorePages true → alert null` (even if day-scope would fire)
  - [ ] `breast durationSec alone does not create formulaMl`
  - [ ] soft empty when no wet and no useful feed/formula signal

**Files likely touched:** `lib/baby-insights-hydration.ts` (stub ok), `lib/baby-insights-hydration.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Implement hydration derive helper

**Description:** Implement the hydration series helper to make Task 1 green. Applied date range drives day buckets. Return alert flag/reason for UI `Alert`, not medical copy inside the helper. Same helper will be used by the server series module.

**Acceptance criteria:**

- [ ] Task 1 tests green
- [ ] Helper is pure (no I/O)
- [ ] Document empty reasons for UI i18n keys

**Tests (TDD):**

- [ ] Green: focused hydration unit tests

**Files likely touched:** `lib/baby-insights-hydration.ts`, test file

**Scope:** S

**Dependencies:** Task 1

---

## Task 3: Failing unit tests — Night Rest duration + sleep bucketing

**Description:** Spec Night Rest helper per `03-design.md`: night window `[D−1 19:00, D 08:00)` local; completed sleeps only; output `nightSleepMinutes` + `intervalCount`; **never** efficiency %. Also cover open-sleep exclusion and today→last-night window. Tests red before impl.

**Acceptance criteria:**

- [ ] Completed night sleep → duration minutes (and interval count when multi-block)
- [ ] Open sleep (`endedAt` null) excluded
- [ ] Single-day “today” range still computes night window ending that morning
- [ ] **Overnight clip:** completed sleep crossing midnight into `[D−1 19:00, D 08:00)` counts **overlap minutes only** (not full sleep length outside the window)
- [ ] No efficiency % field or label in the helper output
- [ ] Soft empty reason stable when no night sleep (`need_more_sleep_logs`)
- [ ] Red before implementation

**Tests (TDD):**

- [ ] `lib/baby-insights-night-rest*.test.ts` fails first
- [ ] **Required overnight clip unit** (Fix ask): sleep `22:00→06:00` on night ending day `D` → `nightSleepMinutes` = overlap with `[D−1 19:00, D 08:00)` only; open sleep excluded; output has `nightSleepMinutes` / `intervalCount` and **no** efficiency % field

**Files likely touched:** helper + test

**Scope:** S

**Dependencies:** none (can parallel Task 1–2)

---

## Task 4: Implement Night Rest + insight KPI helpers

**Description:** Implement Night Rest helper for Task 3 green. Add failing→green tests for the three insight KPIs per contracts: wake window (3-day / open-sleep / thin rules), milk→diaper lag (wet|dirty|mixed, 6h cap), sleep efficiency soft empty (`need_night_waking_logs`). Keep KPI math pure — server series will call these helpers.

**Acceptance criteria:**

- [ ] Task 3 green
- [ ] Wake-window / milk→diaper / efficiency KPI rules match `03-design.md` (including soft-empty reasons)
- [ ] No schema / capture changes; no fake efficiency % from Night Rest duration
- [ ] Sleep efficiency KPI always soft-empty `need_night_waking_logs` (never invent % from a single sleep / Night Rest minutes)
- [ ] Keep helper support for `hasMorePages` / truncation flags where contracts define them (used in unit tests; Option 2 series path passes full-range / not truncated)

**Tests (TDD):**

- [ ] Night Rest unit tests green
- [ ] **Required named KPI units** (Fix ask):
  - [ ] Sleep efficiency always soft empty `need_night_waking_logs` (never derive % from a single sleep / Night Rest minutes)
  - [ ] Wake-window soft empty when range `&lt;3` local days (or &lt;2 completed sleeps)
  - [ ] Milk→diaper soft empty when no eligible pair within 6h
- [ ] **Required:** helper unit — when `hasMorePages` true, do not claim complete-history wording / suppress truncated-slice alerts per contracts

**Files likely touched:** `lib/baby-insights-night-rest.ts`, `lib/baby-insights-kpis.ts` (or siblings), tests

**Scope:** M

**Dependencies:** Task 3

---

### Checkpoint A (after Tasks 1–4)

- [ ] Hydration + Night Rest (+ insight KPI) unit tests green
- [ ] No fake efficiency % from single sleep blocks
- [ ] No production UI change yet (or UI still old — OK)

---

## Task 5: Failing e2e — default two charts + expands

**Description:** Before layout work, extend Insights Playwright coverage so it **fails** on current UI: default view must expose Hydration + **Night Rest** (roles/testids/labels); must **not** require always-on three-KPI strip or count KPIs; **More insights** and **Activity log** exist as expands; legacy charts not competing on first paint. Prefer stable labels/testids over classes.

**Acceptance criteria:**

- [ ] Spec **fails** against current Insights (red for the right reasons)
- [ ] Asserts Important #1 / #2 visible without expand (Night Rest, not “efficiency %” as the default title)
- [ ] Asserts More insights / Activity log are deferred controls
- [ ] Soft-empty path allowed (do not require real chart series in mocks)

**Tests (TDD):**

- [ ] `e2e/baby-care.spec.ts` (or Insights spec) red before Task 6+

**Files likely touched:** `e2e/baby-care.spec.ts`

**Scope:** M

**Dependencies:** Checkpoint A preferred (helpers ready to wire)

---

## Task 6: GraphQL `babyInsightsSeries` + Insights-only timeline `payload`

**Description:** Add workspace-scoped GraphQL query `babyInsightsSeries(from, to)` (name per `03-design.md`). Resolver loads care events for the applied range and runs shared derive helpers (Tasks 1–4 / 11) to return hydration, Night Rest, insight KPIs, and deferred series blobs + soft-empty reasons. Reject absurd ranges via existing validation / limit mindset. Separately, add an **Insights-only** timeline GraphQL document that selects `payload` for Activity log edit — **do not** add `payload` to shared Home `TIMELINE_Q`. Wire Insights client: series query for charts/KPIs; infinite timeline/growth (with payload) for Activity log only.

**Acceptance criteria:**

- [ ] `babyInsightsSeries` exists, authz via `requireBabyWorkspace`, returns typed DTO from shared helpers
- [ ] Full applied-range input to helpers (`hasMorePages` N/A / false for series) — day-scope `low_wet` can fire on full series
- [ ] Insights Activity log timeline items include `payload` at runtime types
- [ ] Shared Home / other `TIMELINE_Q` callers unchanged (no extra payload JSON)
- [ ] No REST changes; no schema migration
- [ ] Existing authz path unchanged for mutations

**Tests (TDD):**

- [ ] Resolver / service unit or integration: workspace scope; thin data → soft empty reasons; happy path DTO shape
- [ ] Wiring test: Insights series document present; Insights timeline document includes `payload`; shared `TIMELINE_Q` still omits it
- [ ] Range validation / absurd span rejected (or capped) per design

**Files likely touched:** Baby GraphQL schema + resolver, server series module, `lib/baby-query-options.ts`, related tests/types, shared helpers

**Scope:** L

**Dependencies:** Checkpoint A (helpers); Task 11 helpers may land as stubs then fill

---

## Task 7: Default UI — two chart cards from series + skeleton parity

**Description:** Restructure `BabyInsightsDashboard` default view to Hydration Monitor + **Night Rest** only (purpose lines; hydration `Alert` when **series** says so). Charts consume `babyInsightsSeries` — **not** client-derived from timeline pages. Dynamic-import visx cards; soft empty copy. **Demote** count KPI strip off default (move happens in Task 8a — default must not show it). Update `BabyInsightsPageSkeleton` / loading in the **same** change (two chart slots + collapsed disclosures).

**Option 2 honesty (document clearly):**

- Chart series is full-range for the applied filter → timeline `nextCursor` / Activity log pagination does **not** make charts “partial.”
- Helper `hasMorePages` suppress-`low_wet` rule still exists for truncated slices in unit tests; series path does **not** pass truncated pages — apply day-scope `low_wet` on the full series.
- Soft empty still shows when series data is thin (`need_more_logs` / `need_more_sleep_logs`).

**Acceptance criteria:**

- [ ] Default scroll shows only the two insight charts (+ filters/about as today)
- [ ] Charts/KPIs bind to series query fields (no client re-derive from timeline pages for those cards)
- [ ] Night Rest labeled as duration / night rest — **not** efficiency %
- [ ] Soft empty for thin night/hydration data from series
- [ ] `low_wet` Alert follows series alert (full-range day-scope); **not** suppressed merely because Activity log has `nextCursor`
- [ ] Skeleton order/layout matches (zero CLS)
- [ ] Light + dark tokens only

**Tests (TDD):**

- [ ] Task 5 e2e still red on More insights / Activity log / edit until later tasks — but default-two-charts asserts should start passing
- [ ] Manual: narrow phone + desktop smoke

**Files likely touched:** `components/baby-insights-dashboard.tsx`, new chart components if needed, `components/baby-page-skeleton.tsx`, `messages/baby/en.ts`, `vi.ts`, query options

**Scope:** M

**Dependencies:** Tasks 2, 4, 6

---

## Task 8a: More insights shell — insight KPIs + count KPIs + legacy move

**Description:** Add **More insights** disclosure shell: three insight KPIs from **series**; **keep** existing count KPIs (feeds / sleep / diapers / latest weight) **below** insight KPIs inside the disclosure (do not drop); move legacy growth + care-count charts here (not on default). Collapsed by default. Skeleton collapsed slot matches. Charts for Pattern / Awake / Diaper can be placeholders until Task 8b/11.

**Acceptance criteria:**

- [ ] Collapsed by default; nothing from this set on default view
- [ ] Expanding reveals insight KPIs (from series) + count KPIs + legacy charts
- [ ] Count KPIs are behind More insights (not removed this pass)
- [ ] Sleep Efficiency KPI soft-empty copy when wakings missing
- [ ] Chart/KPI honesty follows series (full range); list pagination is separate
- [ ] Skeleton collapsed slot matches

**Tests (TDD):**

- [ ] E2E: expand More insights shows KPI strips + legacy; default still free of KPI strips
- [ ] Unit tests already cover KPI math

**Files likely touched:** dashboard, skeleton, i18n

**Scope:** M

**Dependencies:** Task 7

---

## Task 8b: More insights charts — Pattern / Awake / Diaper (wire + soft empty)

**Description:** Ship the three deferred insight chart cards under More insights. Bind to series DTO (or helpers via series). Pattern Finder uses the **custom matrix** data shape from `03-design.md` (not column/line forced). Soft empty OK when thin. Wire helpers from Task 11 if stubs. Watery &gt;20% alert only here when texture data supports.

**Acceptance criteria:**

- [ ] Three deferred charts only under More insights
- [ ] Pattern Finder accepts matrix series shape (days × sleep blocks + markers)
- [ ] Soft empty preserved; no fake “partial from timeline pages” on Option 2 series charts
- [ ] Purpose lines per chart

**Tests (TDD):**

- [ ] E2E: expand shows deferred chart slots (soft empty OK)
- [ ] Unit series tests from Task 11

**Files likely touched:** dashboard, chart components (incl. matrix card), skeleton if expanded chrome, i18n

**Scope:** M

**Dependencies:** Task 8a

---

### Checkpoint B (after Tasks 5–8b)

- [ ] Default = Hydration + Night Rest from series; More insights works
- [ ] Unit derive tests green; series query wired
- [ ] E2E default/expand asserts mostly green (Activity log/edit may still fail)
- [ ] Skeleton parity checked for default + disclosure chrome

---

## Task 9: Activity log — unify table behind expand (reuse table-style)

**Description:** Merge care timeline + growth into one **Activity log** section behind expand using the **`ActivityLogRow`** DTO from `03-design.md` (`source: care | growth`, sort key, edit target). Use Insights-only timeline **with `payload`** + growth lists (from Task 6) — not the series DTO for row edit. Reuse table-style Table + mobile cards chrome (do not re-restyle). Keep show-more / load-more. Skeleton mirrors collapsed + expanded table/cards.

**Acceptance criteria:**

- [ ] No always-on dual lists on default view
- [ ] One Activity log expand with care + measurements
- [ ] Merge helper returns `ActivityLogRow` with discriminator for edit routing
- [ ] Timeline items expose `payload` for edit forms
- [ ] Reuses existing Table chrome patterns from table-style work
- [ ] Empty log ≠ hard error

**Tests (TDD):**

- [ ] Unit: merge care + growth → sorted rows; `source` / `editTarget` correct
- [ ] E2E: Activity log expand shows unified list chrome
- [ ] Empty mocks → muted empty copy

**Files likely touched:** `components/baby-insights-dashboard.tsx`, skeleton, merge helper + unit test

**Scope:** M

**Dependencies:** Checkpoint B (Task 8b), Task 6

---

## Task 10: Money-style edit modal + invalidate

**Description:** Row open → modal (Money feel via shared `Modal`). Route by `row.source` / `editTarget`. Care: time + validated payload fields; sleep `endedAt`; growth fields as Measure. Delete with confirm. On success invalidate **`babyInsightsSeries`** + Insights timeline/growth (charts and table refresh). Wire EN+VI strings.

**Acceptance criteria:**

- [ ] Edit/save/delete happy path works for feed, diaper, sleep, growth
- [ ] Care vs growth mutations chosen from row discriminator (no wrong API)
- [ ] Validation errors show inline; no stack traces; list/charts unchanged on fail
- [ ] Workspace ownership relies on existing mutations (no client-only authz)
- [ ] Focus moves into modal; keyboard closable per Modal primitive
- [ ] Success invalidates series + lists

**Tests (TDD):**

- [ ] E2E: open Activity log → open row → edit field → save → UI updates (or toast + refreshed row/charts)
- [ ] Prefer one care type + one growth type happy path minimum
- [ ] **Required failure path** (Fix ask): validation fail (invalid care payload / bad times) → inline modal error; row/list unchanged; no crash / no stack
- [ ] **Required routing** (Fix ask): care `editTarget` save hits `updateBabyEvent` (mock); growth hits `updateBabyGrowth`; never the other (unit or e2e, one assert each direction)

**Files likely touched:** new `baby-insights-edit-modal.tsx` (or similar), dashboard wiring, i18n, maybe validators already server-side only

**Scope:** M

**Dependencies:** Task 9, Task 6

---

## Task 11: Deferred series helpers — Pattern / Awake / Diaper mix

**Description:** Pure helpers + unit tests for Pattern Finder matrix buckets, **Awake Window Trend** series, diaper mix % using the contracts in `03-design.md` (Pattern matrix shape; Awake Trend per-day mean wake + optional 7-day rolling; diaper bucket mapping; soft empties). Soft empty when thin. Server series resolver calls these (same as hydration / Night Rest). Wire to Task 8b charts if stubs were placeholders.

**Acceptance criteria:**

- [ ] Unit tests for each deferred series including diaper mapping edge cases
- [ ] **Awake Window Trend** matches design contract: per-day `meanWakeMinutes` + optional `rollingMeanWakeMinutes` (trailing ≤7 day-points); soft empty when applied range &lt; 3 local days or too few wake gaps/points
- [ ] UI still only under More insights
- [ ] Watery share alert only when texture data supports (&gt;20%)
- [ ] Pattern matrix shape matches design contract; soft empty when &lt;2 days with markers (`need_more_logs`)

**Tests (TDD):**

- [ ] Failing tests first if helpers missing; then green
- [ ] Awake Trend cases (**keep**): short range soft empty; multi-day points + rolling omit until ≥3 day-points
- [ ] **Required diaper mapping units** (Fix ask):
  - [ ] `kind:wet` → Wet bucket only (not hydration wet+mixed)
  - [ ] dirty + watery + blowout increments watery **and** blowouts (double-count OK)
  - [ ] dirty missing `texture` ignored
  - [ ] &lt;3 textured samples → soft empty
  - [ ] watery share &gt;20% → alert when enough samples
- [ ] **Pattern soft empty:** &lt;2 days with markers → `need_more_logs`

**Files likely touched:** `lib/baby-insights-*.ts`, tests, chart wiring, series resolver if needed

**Scope:** M

**Dependencies:** Task 8b (can start tests in parallel after contracts lock); series Task 6 may call stubs first

---

### Checkpoint C (after Tasks 9–11)

- [ ] Activity log + edit modal green in e2e
- [ ] All unit derive tests green; series + list invalidate path green
- [ ] Full Task 5 e2e scenario green
- [ ] Security/UI checklist below checked

---

## Task 12: i18n + light/dark + copy polish

**Description:** Finish EN+VI for purpose lines, alerts, soft empty, More insights, Activity log, modal labels. Night Rest wording must not say “efficiency.” Soft clinician wording for thresholds. Verify light/dark on charts, alert, modal, table.

**Acceptance criteria:**

- [ ] No hard-coded English in new UI
- [ ] Light + dark OK
- [ ] Medical copy is warning-soft, not diagnosis
- [ ] Default #2 copy = Night Rest / duration, not efficiency %

**Tests (TDD):**

- [ ] `lib/baby-i18n.test.ts` (or project i18n parity check) updated for new keys if that pattern exists
- [ ] Manual light/dark pass

**Files likely touched:** `messages/baby/en.ts`, `vi.ts`, i18n tests

**Scope:** S

**Dependencies:** Tasks 7–10

---

## Checkpoints (summary)

| Checkpoint | After | Verify |
|------------|-------|--------|
| A | Tasks 1–4 | Derive unit tests green; Night Rest duration; no fake efficiency |
| B | Tasks 5–8b | Series wired; default two charts + More insights; skeleton parity |
| C | Tasks 9–11 | Activity log + edit e2e green; series invalidate |
| Final | Task 12 | i18n + light/dark; ready for review/test workflows |

---

## Security checks (Build must honor)

- [ ] A01: Mutations/queries (incl. `babyInsightsSeries`) stay workspace-scoped; no forged id success
- [ ] A03: No raw HTML; payload validated server-side
- [ ] A04: Soft empty; no fake trends; no new capture trust boundary; series range caps
- [ ] A09: Do not log full care payloads in new debug
- [ ] No new deps without triage (A06)

## UI checks (Build must honor)

- [ ] 80/20: only Hydration + Night Rest on default
- [ ] Skeleton parity / zero CLS
- [ ] Mobile cards + ≥44px hits; no hover-only edit
- [ ] Empty ≠ error; light alerts via text + `Alert`
- [ ] DESIGN_GUIDE tokens; visx + `colorByIndex`; Pattern = custom matrix
- [ ] Charts from series query — not from truncated Activity log pages

---

## Boundaries

| Tier | Rule |
|------|------|
| **Always** | TDD order above; Option 2 contracts (`babyInsightsSeries` + shared helpers); reuse table-style chrome; Insights-only `payload` for Activity log edit; invalidate series after edit |
| **Ask first** | Age-banded thresholds; labeling Night Rest as efficiency; dropping delete; widening series range limits beyond abuse caps |
| **Never** | XL “implement all Insights charts” single task; new waking capture types; always-on KPI strip; bloat shared Home `TIMELINE_Q`; derive default charts from timeline pages only |

---

## Task index

| # | Title | Scope | Deps |
|---|-------|-------|------|
| 1 | Failing tests — hydration | S | — |
| 2 | Hydration helper | S | 1 |
| 3 | Failing tests — Night Rest + bucketing | S | — |
| 4 | Night Rest + KPI helpers | M | 3 |
| 5 | Failing e2e — default two charts | M | A |
| 6 | `babyInsightsSeries` + Insights-only timeline `payload` | L | A |
| 7 | Default two charts from series + skeleton | M | 2,4,6 |
| 8a | More insights shell + KPIs + legacy | M | 7 |
| 8b | More insights Pattern/Awake/Diaper charts | M | 8a |
| 9 | Activity log unify (+ payload lists) | M | 8b,6 |
| 10 | Edit modal + invalidate series/lists | M | 9,6 |
| 11 | Deferred series helpers | M | 8b |
| 12 | i18n + light/dark | S | 7–10 |
