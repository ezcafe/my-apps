# Review log: Baby Insights charts

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `e2e/baby-care.spec.ts` (missing); Task 10 / 04a Fix ask #4 | **No Activity log edit happy-path e2e.** Task 10 requires open Activity log → row → edit → save → UI/charts refresh (care + growth minimum). Suite only expands the panel / shows Breast L/R labels; never opens the edit modal or asserts `updateBabyEvent` / `updateBabyGrowth` / invalidate. Critical write path unguarded at user-visible layer. | fixed |
| Major | `lib/baby-insights-activity-edit.test.ts:43-56`; Task 10 / 04a Fix ask #4 | **Validation-fail Fix ask not covered as failure mode.** Units only assert `validateActivityCareEdit(...)` is truthy for bad times. No test that the modal shows an **inline** error, blocks the GraphQL mutation, and leaves the Activity log / series unchanged (no crash / no stack). Pure helper ≠ Fix ask “inline modal error; list unchanged.” | fixed |
| Major | `e2e/baby-care.spec.ts:675-707`; Task 9 | **Activity log empty ≠ error not asserted on the real surface.** Empty Insights e2e still targets dual **Growth / Timeline** section regions and their old empty copy. Default UI unified those lists into Activity log (`baby-activity-log-panel` + `insights.activityLogEmpty`). Stale asserts miss Task 9’s empty path and will mislead full e2e. | fixed |
| Enhancement | `lib/baby-insights-insight-kpis.test.ts:78-82` | **Mock theater on `insightKpiPartialFlag`.** Test feeds `{ hasMorePages: true }` and asserts the same flag mirrored as `{ partial: true, completeHistory: false }`. No consumer / wording / alert-suppress path exercised — fails to prove Task 4 truncation honesty beyond a boolean echo. | fixed |
| Enhancement | `lib/baby-insights-insight-kpis.test.ts:26-45`; `lib/baby-insights-deferred-series.test.ts:144-163` | **Loose soft-empty OR asserts.** Wake-window / Awake Trend short-range cases accept `need_3_days \|\| need_more_sleep_logs`. For a 2-day range the contract reason is `need_3_days`; the OR can hide a wrong empty reason and still pass. | fixed |
| Enhancement | `lib/baby-insights-insight-kpis.test.ts:84-114`; `lib/baby-insights-deferred-series.test.ts:166-209` | **Weak happy-path pins.** Wake KPI only asserts `avgMinutes > 0` (comment guesses overnight gaps). Awake rolling only asserts `withRolling.length >= 1`, not that early day-points omit `rollingMeanWakeMinutes` until ≥3 points. Wrong math can still pass. | fixed |
| Enhancement | `e2e/baby-care.spec.ts:1434-1439`; Task 8b | **Deferred chart slots partially asserted.** Expand More insights checks Pattern + care-count; does not assert `baby-awake-trend-chart` / `baby-diaper-output-chart` slots (soft empty OK). | fixed |
| Nit | `lib/baby-insights-activity-edit.test.ts:43-56` | Validation cases use `assert.ok(...)` only — do not pin messages (`Invalid start time`, `End time must be after start`). | fixed |
| FYI | 04a Fix ask #1–3, #5 (derive units) | **Named Fix-ask cases present and real (not mock theater):** hydration wet+mixed / mid-range `low_wet` / no-feed no-alert / `hasMorePages` suppress / breast durationSec / soft empty; overnight clip + outside-window clip + no efficiency field; efficiency always `need_night_waking_logs`; milk→diaper soft empty; all five diaper bucket units + Pattern `<2` days. Care vs growth **mutation name** routing units exist (`activityEditMutationFor`) — acceptable per “unit or e2e,” but does not replace missing modal/e2e failure+happy paths above. | — |
| Major | `e2e/baby-care.spec.ts` ~413–535, ~851–894, ~974–1014, ~1062–1069, ~1081–1144, ~1210–1244; Task 9 | **Sibling Insights e2e still target dual Growth/Timeline lists after Activity log unify.** Round 2 only rewrote the empty-today path. Live UI: collapsed `baby-activity-log` → one panel; list error is a single `timeline.loadError` string; skeleton is collapsed chrome (no list tables). Stale tests still expect always-visible **2 tables**, `insightsListSection(…, /^(growth\|cân đo)$/)` + Timeline headings, dual empty/error copy, and loading **2 tables + 5 card placeholders**. Affects chips filter, table chrome, show/load more, section error, light/dark, and loading skeleton. Full e2e will fail or skip real Task 9 surfaces. | fixed |

**Round notes:**

- Round 1 (adversarial). Mapped tests to `04-tasks.md` Option 2 (`babyInsightsSeries` + helpers + 80/20 UI + Activity log edit) and 04a Fix ask #1–5.
- Derive helper suites are generally strong, deterministic, and tied to real failure modes (no Date.now/random flakiness found in new units).
- Gaps cluster on **edit modal user-visible contracts** and **Activity log empty e2e** after the unify; plus a few soft assertions / partial-flag theater.
- Result: **not clean** — 3 Major, 4 Enhancement, 1 Nit (FYI only for passed Fix-ask derive cases).
- Verifier did not change product code.
- Round 2 (Fix, adversarial-tests). Closed all open Critical/Major/Enhancement (+ Nit):
  - **Happy-path edit e2e:** care (`updateBabyEvent`) + growth (`updateBabyGrowth`) open → edit → save → row refresh; opposite mutation never recorded.
  - **Validation fail e2e:** bad sleep end-before-start → `role=alert` inline error; mutations array stays empty; row summary unchanged; dialog stays open. Helper units pin exact messages.
  - **Empty ≠ error e2e:** `insights defaults to today…` expands Activity log and asserts muted `insights.activityLogEmpty` (not Growth/Timeline empty regions / load errors).
  - **Enhancements:** removed `insightKpiPartialFlag` mock-theater unit; soft-empty asserts exact `need_3_days`; wake KPI pins `avgMinutes: 900`; Awake Trend pins day means + rolling omit until ≥3 points; More insights e2e asserts Awake + Diaper slots.
  - **Verify:** units `baby-insights-{activity-edit,insight-kpis,deferred-series}.test.ts` → 21 pass; e2e filter (empty + default charts + care/growth edit + validation) → 5 pass.
  - Fix agent does not self-approve — verifier should re-run adversarial lens.
- Round 3 (adversarial re-check after Fix). Verified each Round 1 Critical/Major/Enhancement (+ Nit) against code/tests:
  - Edit happy paths, validation-fail e2e + pinned helper messages, empty-today Activity log asserts, exact soft-empty reasons, wake `900` / Awake rolling omit pins, More insights Awake+Diaper slots — **confirmed fixed**.
  - **New open Major:** Round 2 closed empty-today only; sibling Insights e2e still assert dual Growth/Timeline (chips, table chrome, show/load more, section error, light/dark, loading skeleton) vs unified deferred Activity log.
  - No new Critical/Enhancement from the Fix itself (removing `insightKpiPartialFlag` theater is OK — real truncation honesty remains via hydration `hasMorePages → alert null`).
  - Result: **not clean** — 1 Major open.
  - Verifier did not change product code.
- Round 4 (Fix, adversarial-tests). Closed remaining Major — sibling Insights e2e retargeted to unified Activity log:
  - **Chips / table chrome / show+load more / error / light-dark / skeleton:** expand `baby-activity-log` first; assert single table + mobile cards; `Weight: N kg` row copy; one `timeline.loadError`; skeleton has **0** tables / **0** list card placeholders / **2** deferred toggle bars.
  - Removed obsolete `insightsListSection` helper; added `openActivityLog`.
  - **Verify:** Playwright filter (chips + table chrome + show/load more + skeleton + error + light/dark + empty-today) → **7 passed**.
  - Fix agent does not self-approve — verifier should re-run adversarial lens.
- Round 5 (adversarial re-check after Fix). Verified Round 3 Major against `e2e/baby-care.spec.ts`:
  - **Confirmed fixed:** chips, table chrome, show/load more, section error, light/dark, and loading skeleton all expand `baby-activity-log` / `openActivityLog`, assert **one** table + mobile cards, `Weight: N kg` row copy, single `timeline.loadError` (no dual growth error copy), skeleton **0** tables / **0** list card placeholders / **2** `.h-12.w-40` deferred bars.
  - **Spot-check:** no `insightsListSection`; no dual Growth/Timeline section-region or always-visible 2-table asserts; empty-today + Breast L/R + edit paths use Activity log panel. Stale test **titles** only (`growth then timeline`, `insights timeline shows…`) — Nit/FYI, not blocking.
  - No new Critical / Major / Enhancement.
  - Result: **Adversarial test review: clean.**
  - Verifier did not change product code.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `features/baby/server/insights-series.ts` `getBabyInsightsSeries` | **Night Rest undercounts on default “today” (and first day of any range).** Series loads `occurredAt ∈ [from, to]` plus **one** prior completed sleep (wake-gap lookback). Night window for day **D** is `[D−1 19:00, D 08:00)` — multi-block nights with evening segments before `from` are dropped. Breaks Important #2 / design “today → last night” usefulness and the short/broken (`intervalCount > 1`) signal when it matters most. | fixed |
| Major | `components/baby-night-rest-chart.tsx` | **`intervalCount` never shown.** Helper + GraphQL return it; chart only plots `nightSleepMinutes`. Design / 01-idea require showing interval count when &gt;1 so parents see short/broken nights. | fixed |
| Major | `lib/baby-insights-activity-log.ts` (`careTitle` / `growthTitle`); dashboard row render | **Activity log titles hardcoded English** (`Feed` / `Sleep` / `Weight`…). VI locale still shows EN titles. Task 12: no hard-coded English in new UI. | fixed |
| Major | `components/baby-hydration-chart.tsx` legend; dashboard Awake/Diaper lists | **Hardcoded EN chart/list labels** (`Wet` / `Feeds`; `Wet:` / `Normal:` / `Watery:` / `Blowouts:`). Same Task 12 gap. | fixed |
| Major | `lib/baby-insights-activity-edit.ts` `validateActivityCareEdit` | **Modal validation errors are English string literals** (`Invalid start time`, …) set directly as `error` — not i18n keys. VI users see EN inline errors. | fixed |
| Major | `components/baby-insights-dashboard.tsx` timeline/growth `useInfiniteQuery` | **Lists (with `payload`) always fetch + auto-page on Insights open** even when Activity log / More insights stay collapsed. Option 2 default view only needs `babyInsightsSeries`; design sequence loads lists after Activity log expand. Wastes bandwidth and ships payload JSON before disclosure. | fixed |
| Major | `components/baby-insights-dashboard.tsx` Activity log `<TableRow onClick>` | **Desktop table rows are click-only** (not a button / no keyboard activation). Mobile cards are `<button>` — OK. UI check: edit must not be hover/pointer-only. | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx` Awake Trend + Diaper Output | **Deferred “charts” are plain `<ul>` lists**, not visx cards (unlike Hydration / Night Rest / Pattern). Soft empty OK; full chart polish deferred. | nit (downgraded) |
| Enhancement | `components/baby-insights-dashboard.tsx` (~1050 lines) | **Dashboard keeps growing** (series + KPIs + legacy + Activity log + modal wiring). Structural risk; consider extract later. | fyi (downgraded) |
| Enhancement | `components/baby-insights-edit-modal.tsx` diaper kind | Diaper kind is a free-text `<Input>`, not a constrained control matching schema enums — easy to mistype; server must reject. | fixed |
| Nit | `lib/baby-insights-insight-kpis.ts` `insightKpiPartialFlag` | Helper appears unused by UI after adversarial removed mock-theater unit — dead code candidate (ask before delete). | open |
| Nit | `components/baby-insights-dashboard.tsx` Awake Trend list | Deferred Awake list UI (not visx) — Task 8b / 04a accept soft-empty chart **slots**; list body is interim polish, not acceptance fail this pass. | open |
| FYI | `components/baby-insights-dashboard.tsx` size | Dashboard still large (~1050 lines); extract later — no acceptance fail this pass. | — |
| FYI | Option 2 wiring (series + helpers + Insights-only `payload` doc) | Shared derive helpers, `hasMorePages: false` on series path, Home `TIMELINE_Q` without `payload`, invalidate `insightsSeries` on care/growth scope, 80/20 default two charts + collapsed disclosures + skeleton collapsed chrome — **aligned when rows fall inside the loaded window**. | — |

**Round notes:**

- Round 1 (Quality). Independent verifier vs `01-idea`, `03-design` Option 2, `04-tasks`. Focus: `babyInsightsSeries`, derive helpers, 80/20 UI, Activity log + edit modal, skeletons, i18n, e2e (adversarial already clean — not re-litigated).
- **Critical:** series night-window lookback insufficient for default today Night Rest / multi-block nights.
- **Majors:** missing `intervalCount` UI; EN hardcoding (titles, legends, validation); eager timeline+payload fetch; desktop table keyboard/edit affordance.
- **Enhancements:** Awake/Diaper not visx; dashboard size; diaper kind free text.
- Result: **not clean** — 1 Critical, 6 Major, 3 Enhancement, 1 Nit (FYI only for Option 2 happy-path alignment).
- Verifier did not change product code.
- Round 2 (Fix, quality). Closed Critical + all Majors + diaper-kind Enhancement (TDD where behavior):
  - **Critical:** `babyInsightsSeriesCareLoadFrom` extends care scan to first-day night-window open (`D−1 19:00`); prior wake-gap sleep looks before that bound. Units pin loadFrom + multi-block undercount vs full lookback.
  - **intervalCount:** Night Rest chart lists days with `intervalCount > 1` (`baby-night-rest-intervals`).
  - **i18n:** Activity titles via `activityLogRowTitleKey` + `t()`; hydration legends + diaper bucket labels EN/VI; validation returns message keys translated in modal.
  - **Lazy lists:** timeline/growth `enabled: activityOpen \|\| moreOpen`; sync + auto-page gated the same way.
  - **Keyboard:** desktop Activity rows focusable (`tabIndex={0}`) + Enter/Space (no `role=button` on `<tr>` — keeps table row semantics / e2e). Mobile cards keep `<button>`.
  - **Enhancement:** diaper kind → constrained `<Select>` over `BABY_DIAPER_KINDS`. Awake/Diaper visx + dashboard extract **deferred** (no mega-refactor). Nit dead-code left open (ask before delete).
  - **Verify:** units insights-series + activity-edit/log + i18n + night-rest → 31 pass. E2e: validation + table chrome pass; empty-today bounds assert moved to after Activity log expand (lazy lists).
  - Fix agent does not self-approve — verifier should re-run Quality lens.
- Round 3 (Quality re-check after Fix). Verified each Round 1 Critical/Major/Enhancement against code (verifier did not write the Fix):
  - **Critical night lookback — confirmed fixed:** `babyInsightsSeriesCareLoadFrom` + `getBabyInsightsSeries` scan from night-window open; units pin today-only loadFrom and multi-block intervalCount with full lookback.
  - **intervalCount UI — confirmed fixed:** `baby-night-rest-intervals` lists days with `intervalCount > 1` + `blocksLabel` from i18n.
  - **Activity titles / hydration+diaper labels / validation i18n — confirmed fixed:** `activityLogRowTitleKey` + `t()`; legend/bucket keys EN+VI; `validateActivityCareEdit` returns keys; modal `t(clientErr)`.
  - **Lazy lists — confirmed fixed:** `listsEnabled = activityOpen \|\| moreOpen`; timeline/growth `enabled`, sync interval, and auto-page all gated.
  - **Keyboard — confirmed fixed:** desktop `TableRow` `tabIndex={0}` + Enter/Space → edit; mobile `<button>` unchanged.
  - **Diaper kind Select — confirmed fixed:** `<Select>` over `BABY_DIAPER_KINDS` + `t(\`diaper.${kind}\`)`.
  - **Awake/Diaper visx + dashboard extract — downgraded:** Task 8b / 04a accept deferred chart **slots** with soft empty; list UIs do not violate this-pass acceptance. Dashboard size is FYI only. Status → Nit/FYI (do not block).
  - Nit `insightKpiPartialFlag` dead-code candidate remains open (non-blocking).
  - No new Critical / Major / Enhancement.
  - Result: **Quality review: clean.**
  - Verifier did not change product code.

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major findings. | — |

**OWASP coverage (A01–A10):**

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 Broken Access Control | **pass** | `babyInsightsSeries` calls `requireBabyWorkspace`; series + prior-sleep scans filter `eq(workspaceId)`; updates/deletes use `requireBabyWriteWorkspace` + workspace-scoped get/update/delete (IDOR → NOT_FOUND). Matches 03-design. |
| A02 Cryptographic Failures | **N/A** | No new secrets, tokens, or sensitive data in URLs. |
| A03 Injection | **pass** | Drizzle parameterized `where`; Zod datetime/range + per-type `.strict()` payload patches (`updateBabyEventPayloadSchemaForType`, size cap 4096); React text escape; no `dangerouslySetInnerHTML` / eval in new Insights UI. |
| A04 Insecure Design | **pass** | Soft empty vs fake trends; series is UX aggregate after authz; `BABY_INSIGHTS_SERIES_MAX_DAYS` (93) + from≤to; client edit validation is soft only — server validators remain authoritative. |
| A05 Security Misconfiguration | **N/A** | No CORS / header / debug flag changes. |
| A06 Vulnerable Components | **pass** | No new chart libs or lockfile deps (existing visx). |
| A07 Auth Failures | **pass** | Same session + membership gate on series/lists; writes need write scope. |
| A08 Software / Data Integrity | **pass** | Edit/delete reuse existing validated mutations; no webhooks/deserialization added. |
| A09 Logging / Monitoring Failures | **pass** | No new `console.*` dumping care payloads in series/modal/dashboard helpers; `mapServiceError` still logs unhandled errors without attaching request payloads. |
| A10 SSRF | **N/A** | No server fetch of user-supplied URLs. |

**Round notes:**

- Round 1 (Security). Security-review subagent unavailable (usage limit ×2); verifier reviewed uncommitted baby-insights-charts changes manually vs OWASP + `03-design.md` Security section.
- Focus confirmed: `requireBabyWorkspace` on `babyInsightsSeries`; workspace isolation on care load; Activity log edit → existing `updateBabyEvent` / growth mutations with Zod payload validation; Insights-only timeline `payload` (Home `TIMELINE_Q` stays lean); no secrets/PII dump in new log paths.
- Aligns with design OWASP table (A01/A03/A04/A06/A07/A08/A09 pass; A02/A05/A10 N/A).
- Result: **Security review: clean.**
- Verifier did not change product code.

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-insights-dashboard.tsx` `listsEnabled = activityOpen \|\| moreOpen` | **More insights expand starts payload list waterfall.** Design sequence: More insights binds insight KPIs + deferred charts from the **same `babyInsightsSeries` snapshot**; Insights-only timeline/growth **with `payload`** starts on **Activity log** expand (`03-design.md` sequence). Code treats `moreOpen` like Activity log: enables timeline (payload) + growth infinite queries, sync truncate interval, and auto-`fetchNextPage` up to `BABY_TIMELINE_MAX_PAGES` (8×100). User opens More insights for Pattern / wake / diaper (already in series) and pays sequential GraphQL + heavy payload JSON + background sync. Legacy growth/care-count “may” use lists — should not gate the whole payload auto-page path on More insights. | fixed |
| Enhancement | `features/baby/server/insights-series.ts` `getBabyInsightsSeries` | **Sequential DB waterfall.** Range scan `await` then prior-sleep `await`. Independent queries — `Promise.all` (async-parallel) would cut one RTT on every series request. | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx` count KPIs + care-count vs `babyInsightsSeries` | **Duplicate care scan + weaker counts.** After More insights, count KPIs / `aggregateCareCountsByDay` re-derive from auto-capped timeline pages while the server already scanned the full applied range for series. Extra bandwidth/CPU; counts can lag series honesty past the auto-page cap. Prefer counts (and latest weight) on the series DTO, or defer list fetch to Activity log / legacy-only. | fixed |
| FYI | `getBabyInsightsSeries` main select | **No row `LIMIT` inside the day span** — only `BABY_INSIGHTS_SERIES_MAX_DAYS` (93). Matches Option 2 full-range honesty + indexed `workspace_id, occurred_at`. Accepted tradeoff; not raised as open defect. | — |
| FYI | Chart / filter `next/dynamic` | Hydration, Night Rest, Pattern, growth/care-count, edit modal, filters — dynamic + `ssr: false` where needed. No new chart libs. Bundle path OK. | — |
| FYI | More insights latest weight / legacy growth charts | Still need Activity log lists (series has care `counts` / `careCountDays` only). Weight KPI shows — and growth charts empty until Activity expand — accepted “defer list fetch” resolution of the counts Enhancement; not re-opened. | — |

**Round notes:**

- Round 1 (Performance). Skills: `performance-optimization`, `vercel-react-best-practices`. Focus: `babyInsightsSeries` + Insights dashboard changes for this slug.
- **N+1:** None — one range select + one prior-sleep select (limit 5); no per-row queries.
- **Pagination:** Series intentionally unpaged within 93-day cap (Option 2). Activity log still page-limited (100/50) + auto-cap 8 + DOM show-more 100. Default Insights open correctly gates lists behind expand (**Quality** already fixed always-on lists).
- **Waterfalls / hot path:** Remaining Major is `moreOpen` re-opening the payload timeline auto-page + sync path against design’s Activity-log fetch gate. Server series has a small sequential-await Enhancement.
- **Bundle:** New visx charts code-split via `next/dynamic`; no barrel-import issue found on this path.
- Result: **not clean** — 1 Major, 2 Enhancement (FYI only for accepted series row span / dynamic imports).
- Verifier did not change product code.
- Round 2 (Fix, performance). Closed Major + both Enhancements (TDD where behavior):
  - **Major:** `listsEnabled = activityOpen` only. More insights no longer enables timeline/growth / sync / auto-page. E2e asserts 0 timeline+growth fetches after More insights expand; lists start after Activity log expand.
  - **Promise.all:** range scan + prior-sleep in `getBabyInsightsSeries` run in parallel (TDD skipped — internal RTT; covered by existing series units).
  - **Series counts:** DTO adds `counts` + `careCountDays` (applied-range only; lookback excluded). Dashboard `preferSeriesInsightCountKpis` + care-count chart prefer series (never partial from page caps). Partial copy remains for Activity log list path only when series missing. Latest weight still from growth lists when Activity log has loaded them (else —).
  - **Verify:** units care-counts / kpis / insights-series / yoga / query-options → pass. E2e (default charts + empty-today + edits + care-count cards) → **6 passed**.
  - Fix agent does not self-approve — verifier should re-run Performance lens.
- Round 3 (Performance re-check after Fix). Verified each Round 1 Critical/Major/Enhancement against code (verifier did **not** write the Fix):
  - **Major listsEnabled — confirmed fixed:** `listsEnabled = activityOpen` only (`baby-insights-dashboard.tsx` ~271). `moreOpen` is UI disclosure only (aria + panel). Timeline/growth `enabled`, sync interval, and auto-`fetchNextPage` all gate on `listsEnabled`. E2e default-charts test asserts `timelineFetches === 0` and `growthFetches === 0` after More insights expand; Activity log expand then increments fetches.
  - **Promise.all — confirmed fixed:** `getBabyInsightsSeries` runs range scan + prior-sleep via `Promise.all` (`insights-series.ts` ~143–178).
  - **Series counts — confirmed fixed:** DTO + GraphQL selection expose `counts` + `careCountDays`; `aggregateSeriesCareCounts` excludes lookback days outside applied range (unit pin). Dashboard prefers series for count KPIs + care-count chart (`preferSeriesInsightCountKpis`, `careCountFromSeries` / `babyCareCountChartCopyFromSeries`); no partial copy from page caps when series present.
  - **Spot-check:** no N+1; series still unpaged within 93-day cap (accepted); charts remain `next/dynamic`. Latest weight / legacy growth still list-backed until Activity log — documented FYI, matches Fix “defer list” option.
  - No new Critical / Major / Enhancement.
  - Result: **Performance review: clean.**
  - Verifier did not change product code.

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | clean |
| FYI | `features/baby/server/insights-series.ts` `getBabyInsightsSeries` | Series loads the full care window (≤93 days + night lookback + one prior sleep) with payloads into one `items[]` for derive helpers — no row `LIMIT`. Request-scoped; matches Option 2 full-range honesty. Same accepted tradeoff Performance already FYI’d. | — |
| FYI | `components/baby-insights-dashboard.tsx` Activity log path | When expanded, RQ may retain timeline pages **with payload** (soft max 20×100) alongside the series snapshot — intentional charts-vs-edit split, not a growing module cache. | — |

**Round notes:**

- Round 1 (Memory). Checklist on Insights dashboard + `babyInsightsSeries` / derive helpers / Activity log lists. Verifier did not change product code.
- **Listeners / timers:** `visibilitychange` removes on unmount. Sync `setInterval` clears + sets `cancelled`; effect no-ops when `!listsEnabled` (Activity log collapsed). No new subscriptions without cleanup.
- **Caches / lists:** Timeline soft max 20 / auto 8; growth soft max 20; DOM show-more steps of 100 bounded by loaded pages. Sync truncate keeps only first timeline page. Series Maps/arrays are request- or render-local — no module-level growing cache.
- **Closures / long-lived refs:** No new module-level state. Edit modal holds one `ActivityLogRow` while open. Sync effect deps cleaned on change/unmount.
- **Whole result sets:** Series intentionally unpaged within day-span cap (design Option 2). Lists stay page-capped. Not raised as open defect.
- **Money/sum casts:** N/A — no `SUM` / `::int` / money columns in series or Insights dashboard path; counts are JS aggregates.
- No Critical / Major / Enhancement.
- **Memory review: clean.**
