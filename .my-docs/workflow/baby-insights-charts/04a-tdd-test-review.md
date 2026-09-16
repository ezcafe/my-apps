# TDD test-case review: baby-insights-charts

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-14

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Hydration daily wet vs feeds / formula ml + soft empty when thin | partial (acceptance yes; TDD list unnamed) |
| 1 | edge | `wetCount` = `wet` + `mixed`; dry / dirty-only excluded | partial (acceptance only) |
| 1 | edge | `low_wet` day-scope (any day in range, not average / last-day-only); no alert if that day has no feed and no formula ml | partial (acceptance only) |
| 1 | edge | `hasMorePages` / `nextCursor` → `alert: null` even when day-scope would fire | partial (acceptance only) |
| 1 | edge | Never invent breast ml from feed duration | partial (acceptance only) |
| 2 | real | Green focused hydration unit suite | yes |
| 3 | real | Night Rest duration + `intervalCount` for multi-block; soft empty `need_more_sleep_logs` | partial (acceptance yes; TDD unnamed) |
| 3 | edge | Open sleep (`endedAt` null) excluded; today-only range still uses night window ending that morning | yes (acceptance) |
| 3 | edge | Cross-midnight / partial night-window overlap minutes only | **no** |
| 3 | real | Helper output has no efficiency % field | yes (acceptance) |
| 4 | real / edge | Wake-window KPI (3-day / open-sleep / thin); milk→diaper lag (wet\|dirty\|mixed, 6h); sleep efficiency soft empty `need_night_waking_logs` | partial (acceptance yes; TDD unnamed) |
| 4 | edge | Partial-copy helper when `nextCursor` | partial (marked optional) |
| 5 | real | E2E default: Hydration + Night Rest visible; no always-on insight/count KPI strips; More insights / Activity log deferred | yes |
| 5 | real | Soft empty allowed (no forced series in mocks) | yes |
| 6 | real / edge | Insights document includes `payload`; shared Home `TIMELINE_Q` still omits it | yes |
| 7 | real | Default two charts + skeleton; Night Rest not labeled efficiency %; suppress `low_wet` Alert when `nextCursor` | yes (e2e from Task 5 + acceptance) |
| 8a | real | Expand More insights → insight KPIs + count KPIs + legacy; default still free of KPI strips; efficiency KPI soft empty in UI | yes |
| 8b | real | Expand shows Pattern / Awake / Diaper slots (soft empty OK) | yes |
| 9 | real | Unit merge care + growth → sorted `ActivityLogRow`; `source` / `editTarget` correct | yes |
| 9 | real | E2E Activity log expand + empty ≠ error | yes |
| 10 | real | E2E edit care + growth happy path → save → refresh | yes |
| 10 | real | Modal validation fail → inline error (no stack) | **no** (acceptance only; not in TDD list) |
| 10 | edge | Care row never calls growth mutation (and reverse) | **no** |
| 11 | real / edge | Awake Window Trend: short range soft empty; multi-day points; rolling omit until ≥3 day-points | yes |
| 11 | edge | Diaper buckets: wet-only vs hydration wet+mixed; watery+blowout double-count; missing texture ignored; soft empty &lt;3 textured; watery &gt;20% alert | partial (“mapping edge cases” unnamed) |
| 11 | real | Pattern matrix shape + soft empty &lt;2 marker days | partial (acceptance; TDD unnamed) |
| 12 | real | i18n key parity; Night Rest copy ≠ efficiency | yes |
| Existing | real | Count KPIs / filters / table-style chrome / section error e2e already in repo | yes (reuse; do not drop) |
| Design | edge | Auth / workspace GraphQL fail → section error | n/a (existing e2e; unchanged path) |
| Design | edge | Double-submit modal save / race | n/a this pass (Enhancement only) |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Critical | 1 | Named hydration cases not in TDD list (risk Build skips day-scope / `nextCursor` / wet+mixed) | Add **required** unit names in Task 1 (see Fix ask #1) |
| Critical | 3 | Overnight / cross-midnight overlap clip not planned | Unit: sleep `22:00→06:00` on night ending day `D` → minutes = overlap with `[D−1 19:00, D 08:00)` only; assert `nightSleepMinutes` and no efficiency field |
| Major | 4 | Insight KPI soft-empty / happy paths unnamed | Name 3 units: wake soft empty `&lt;3` days; milk→diaper soft empty no pairs; efficiency always `{ emptyReason: "need_night_waking_logs" }` (never invent % from Night Rest) |
| Major | 10 | User-visible edit failure not in TDD | E2E (or focused unit on modal error wiring): invalid care payload / bad times → inline modal error; row unchanged; no crash |
| Major | 10 | Edit routing discriminator not asserted | Unit or e2e: care `editTarget` save hits `updateBabyEvent` (mock); growth hits `updateBabyGrowth`; never the other |
| Major | 11 | Diaper bucket edges unnamed | Units: (a) `kind:wet` → Wet bucket only; (b) dirty+watery+blowout increments watery **and** blowouts; (c) dirty missing `texture` ignored; (d) &lt;3 textured → soft empty; (e) watery share &gt;20% → alert when enough samples |
| Enhancement | 4 | Partial-copy helper marked optional | Make one small unit **required**: `nextCursor` present → partial wording / flag, not “complete history” |
| Enhancement | 11 | Pattern matrix soft empty | One unit: &lt;2 days with markers → `need_more_logs` |
| Enhancement | 7 / 8a | Skeleton parity | Keep manual Checkpoint B; no automated CLS test required |

## Real scenarios checked

- Happy path: Hydration + Night Rest units (Tasks 1–4) + default two-chart e2e (Task 5/7) + Insights-only `payload` wiring (Task 6) + More insights expand (8a/8b) + Activity merge + edit happy path (9–10) — **direction good**.
- User-visible failures: Section GraphQL errors already covered in existing Insights e2e — **OK**. Modal **validation fail** is only in acceptance — **must add** to TDD.
- Empty / loading / permission: Soft empty reasons planned for helpers; empty Activity log planned; skeleton = manual; permission gate unchanged — **OK**.

## Edge scenarios checked

- Boundaries / invalid input: `low_wet` day-scope + `nextCursor` suppress + wet+mixed are in Task 1 **acceptance** but not named TDD cases — **treat as missing until named**. Overnight cross-midnight clip **missing**. Diaper double-count / unclassified **under-named**. Breast ml from duration **must be an explicit assert**.
- Concurrency / double-submit / idempotency: **N/A** for this pass (no new write queue).
- Offline / partial data / race: Hydration alert suppress when pages truncated is the key edge — must be a **named** Task 1 unit. Awake Trend short-range soft empty is planned — **OK**.

## Fix ask for Build

Concrete tests to add or strengthen in `04-tasks.md` (still Red before product code where possible). Prefer few strong tests:

1. **Task 1 — name these units (required):**
   - `wet+mixed count toward wetCount; dry and dirty-only do not`
   - `low_wet when mid-range day has wet&lt;6 and ≥1 feed` (other days fine → still alert)
   - `no low_wet when low-wet day has zero feeds and zero formulaMl`
   - `hasMorePages true → alert null` (even if day-scope would fire)
   - `breast durationSec alone does not create formulaMl`
   - soft empty when no wet and no useful feed/formula signal

2. **Task 3 — add overnight clip unit (required):**
   - Completed sleep crossing midnight into `[D−1 19:00, D 08:00)` → only overlap minutes; open sleep excluded; output has `nightSleepMinutes` / `intervalCount` and **no** efficiency %.

3. **Task 4 — name KPI units (required):**
   - Sleep efficiency always soft empty `need_night_waking_logs` (never derive % from a single sleep / Night Rest minutes)
   - Wake-window soft empty when range `&lt;3` local days (or &lt;2 completed sleeps)
   - Milk→diaper soft empty when no eligible pair within 6h

4. **Task 10 — add failure + routing (required):**
   - Validation fail → inline modal error; list/charts unchanged
   - Care vs growth mutation chosen from `editTarget.source` (one assert each direction)

5. **Task 11 — name diaper + keep Awake Trend cases (required):**
   - Keep planned Awake Trend short-range / rolling-omit tests
   - Add diaper mapping units from Gaps table (wet-only bucket; watery+blowout double-count; missing texture ignored; soft empty; watery &gt;20% alert)

Do **not** weaken Task 5/6/8a 80/20 or Insights-only `payload` asserts — those key contracts are already planned well.

## Round notes

- Read: `03-design.md`, `04-tasks.md`, `03a` Result **clean**, skim of existing `lib/baby-insights-*.test.ts` (count KPIs / filters / default-range only — no hydration / night-rest / diaper-mix helpers yet) and Insights e2e in `e2e/baby-care.spec.ts` (table-style + legacy chart region; no Hydration / Night Rest / More insights expands yet).
- Task order (failing units → e2e red → wire → green) is sound. Gaps are **named cases** for hydration alert rules, **overnight sleep clip**, **efficiency soft empty explicit**, **modal validation + routing**, and **diaper bucket edges**.
- Result **needs more tests** until Fix ask items 1–5 are in the Red plan (Enhancements optional).
- No product code written in this review.
- **Folded into `04-tasks.md` (Fix ask → named TDD):** Task **1** — six required hydration unit names + soft-empty acceptance; Task **3** — overnight clip acceptance + required clip unit; Task **4** — three named KPI soft-empty units + partial-copy now required; Task **10** — validation-fail e2e/unit + care/growth mutation routing asserts; Task **11** — five diaper mapping units + Pattern `&lt;2` days soft empty (Awake Trend cases kept).
