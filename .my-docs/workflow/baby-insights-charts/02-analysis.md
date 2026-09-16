# Analysis: Baby Insights charts, KPIs, guidance, editable activity table

## What exists today

Baby Insights (`/baby/insights`) is a client dashboard (`BabyInsightsDashboard`) with Money-style date filters, care/growth chips, **count KPIs** (feeds / sleep / diapers / latest weight), **visx** growth line + care-count charts, and **two separate browse lists** (growth + care timeline). Related workflow `baby-insights-table-style` is **implemented in the working tree** (status `gate-merge`, awaiting Gate 3): local **today** default range, shared `Table` + mobile cards for both lists, skeleton/e2e updates — still **two** sections, **view-only**, no insight charts/KPIs from this idea.

There are **no** hydration / wake-window / sleep-efficiency / pattern-matrix chart helpers yet. Existing KPI helper only counts events. Timeline GraphQL for Insights currently returns `id/kind/type/at/endedAt/summary/source` — **not `payload`**, so diaper wet/dirty, `amountMl`, stool texture, etc. are not available to the dashboard until the query asks for them.

Key paths: `app/(shell)/baby/insights/page.tsx`, `components/baby-insights-dashboard.tsx`, `lib/baby-insights-kpis.ts`, `lib/baby-care-counts.ts`, `lib/baby-growth-series.ts`, `components/baby-page-skeleton.tsx`, `messages/baby/en.ts` + `vi.ts`, `e2e/baby-care.spec.ts`.

## Dependencies

| Area | Must change / stay compatible |
|------|-------------------------------|
| Insights dashboard layout | Default = Hydration + **Night Rest** (duration) only; demote count KPI strip, legacy charts, lists. Sleep Efficiency **KPI** stays soft empty behind More insights |
| New pure helpers (KPI/chart series) | Unit-tested derivations from timeline (+ growth if needed); honest empty when thin |
| Timeline query for Insights | Likely add `payload` (and keep `endedAt`) so charts/edit can use real fields |
| GraphQL mutations | **Reuse** existing `updateBabyEvent` / `deleteBabyEvent` / `updateBabyGrowth` / `deleteBabyGrowth` — no Money changes |
| Schema / capture | Prefer **no** new event types this pass; night-waking fragments do **not** exist today |
| `baby-insights-table-style` uncommitted work | **Reuse** Table chrome + today default; **merge** into one Activity log behind expand + add edit — do not re-restyle from scratch |
| Skeletons + i18n | New chart/KPI/expand/edit strings EN+VI; skeleton parity for new hierarchy |
| E2E | Extend Insights specs: default two charts, More insights / Activity log, open-edit happy path |
| Money Insights / capture / Telegram | Out of scope (non-goals) |

No cross-repo dependency. Front-end + thin GraphQL field selection; server update APIs already exist.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `/Users/ptquang86/ws/my-apps/components/baby-insights-dashboard.tsx` | Live Insights page — layout, filters, KPIs, charts, lists |
| `/Users/ptquang86/ws/my-apps/components/baby-page-skeleton.tsx` | Skeleton parity target (`BabyInsightsPageSkeleton`) |
| `/Users/ptquang86/ws/my-apps/app/(shell)/baby/insights/loading.tsx` | Route loading entry |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-kpis.ts` | Current count KPIs — extend or replace with insight KPI helpers |
| `/Users/ptquang86/ws/my-apps/lib/baby-care-counts.ts` | Day-bucket aggregation pattern from loaded timeline |
| `/Users/ptquang86/ws/my-apps/lib/baby-growth-series.ts` | Growth → chart points + empty/partial copy |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-default-range.ts` | Today default (from table-style work) + inclusive day ISO bounds |
| `/Users/ptquang86/ws/my-apps/lib/baby-query-options.ts` | Timeline/growth infinite queries; Insights timeline **omits `payload` today** |
| `/Users/ptquang86/ws/my-apps/lib/baby-timeline-row-display.ts` | Row summary / duration / stop clock for table cells |
| `/Users/ptquang86/ws/my-apps/db/schema/baby.ts` | Care payloads: feed `amountMl`/`legs`, diaper kind/texture/amount, sleep **notes only** |
| `/Users/ptquang86/ws/my-apps/lib/graphql/baby-typeDefs.ts` | Queries + `updateBabyEvent` / growth update/delete |
| `/Users/ptquang86/ws/my-apps/features/baby/server/care-events.ts` | Server update/delete care events |
| `/Users/ptquang86/ws/my-apps/features/baby/server/timeline.ts` | Summary + duration; payload available server-side |
| `/Users/ptquang86/ws/my-apps/lib/validators/baby.ts` | Update payload schemas per care type |
| `/Users/ptquang86/ws/my-apps/components/baby-care-count-chart.tsx` | Baby visx chart card pattern (ParentSize + theme colors) |
| `/Users/ptquang86/ws/my-apps/components/baby-growth-chart.tsx` | Baby line chart card pattern |
| `/Users/ptquang86/ws/my-apps/components/charts/line-chart.tsx` | Shared visx line (Money analytics) |
| `/Users/ptquang86/ws/my-apps/components/charts/column-chart.tsx` | Shared visx columns — dual series / correlation candidates |
| `/Users/ptquang86/ws/my-apps/components/charts/stacked-area-chart.tsx` | Shared stacked series (diaper mix %) |
| `/Users/ptquang86/ws/my-apps/components/transaction-edit-modal.tsx` | Money edit-from-list modal shell to mirror |
| `/Users/ptquang86/ws/my-apps/components/analytics-transactions-table.tsx` | Row click → open edit modal wiring |
| `/Users/ptquang86/ws/my-apps/components/ui/modal.tsx` | Shared modal primitive |
| `/Users/ptquang86/ws/my-apps/components/baby-measure-page.tsx` | Growth create/update/delete GraphQL + inline edit fields |
| `/Users/ptquang86/ws/my-apps/components/baby-diaper-detail-sheet.tsx` | Diaper detail capture UI (fields for edit modal) |
| `/Users/ptquang86/ws/my-apps/components/baby-feed-form.tsx` | Feed field patterns |
| `/Users/ptquang86/ws/my-apps/components/ui/about-disclosure.tsx` | Compact purpose / “about” expand pattern |
| `/Users/ptquang86/ws/my-apps/components/ui/alert.tsx` | Light in-UI alert banners |
| `/Users/ptquang86/ws/my-apps/messages/baby/en.ts` | Insights i18n keys (extend for purpose / alerts / More insights / Activity log) |
| `/Users/ptquang86/ws/my-apps/messages/baby/vi.ts` | Vietnamese parity |
| `/Users/ptquang86/ws/my-apps/e2e/baby-care.spec.ts` | Existing Insights e2e (filters, tables, charts testids) |
| `/Users/ptquang86/ws/my-apps/docs/DESIGN_GUIDE.md` | Tokens, tables, skeleton parity, chart palette |
| `/Users/ptquang86/ws/my-apps/.my-docs/workflow/baby-insights-table-style/03-design.md` | Settled table chrome + today default — reuse, don’t duplicate |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Client Insights dashboard + applied date range | `components/baby-insights-dashboard.tsx` | One filter already drives KPIs/charts/lists |
| Pure derive helpers + unit tests | `lib/baby-insights-kpis.ts`, `lib/baby-care-counts.ts` | TDD for new wake/hydration/efficiency/series math |
| Honest empty / partial chart copy | `babyCareCountChartCopy` / `babyGrowthChartCopy` | Soft “need more logs,” never fake trends |
| visx chart cards + `colorByIndex` | `baby-*-chart.tsx`, `components/charts/*` | Stay on existing chart stack (user rule + non-goal) |
| Dynamic import + chart skeleton | Dashboard dynamic charts | Keep SSR off for visx; CLS-safe loading |
| Money edit modal shell | `transaction-edit-modal.tsx` + `Modal` | Idea requires Money-style edit UX |
| Table row → modal edit | `analytics-transactions-table.tsx` | Wire Activity log open → edit |
| Growth update/delete mutations | `baby-measure-page.tsx` | Reuse for measurement rows in modal |
| Care update/delete mutations | GraphQL `updateBabyEvent` / `deleteBabyEvent` | Already validated server-side |
| Table + mobile cards chrome | Uncommitted Insights lists / `loans-dashboard` / Transactions | Reuse for unified Activity log |
| AboutDisclosure / Alert | `about-disclosure.tsx`, `alert.tsx` | Short purpose + light threshold alerts |
| Section empty vs error | `lib/baby-insights-section-state.ts` | Empty ≠ hard error |
| Show-more + Load more | `lib/baby-insights-list-visible.ts` + infinite queries | Keep for Activity log volume |
| i18n via `messages/baby/*` | EN + VI | No hard-coded English in UI |
| Skeleton parity | `BabyInsightsPageSkeleton` | Mandatory for layout change |

**Dev-decision-routing note:** context-mode MCP was not available. Local qan `Work/Dev/HTML` is empty; CSS Grid Lanes / generic JS API notes do not override this repo’s DESIGN_GUIDE, visx chart cards, or Money modal patterns. Prefer repo patterns above.

## Constraints and risks

- **Night sleep efficiency data gap:** Sleep payload is `{ notes? }` only — one interval per nap/night (`occurredAt`/`endedAt`). There is **no** night-waking / crib-fragment model. Full `Actual_Sleep / Total_Time_in_Crib` cannot be honest without capture changes or a softer proxy (e.g. hide KPI / “need night-waking logs”).
- **Hydration “milk intake”:** Breast feeds often lack `amountMl` (duration/legs instead); formula has ml. Prefer soft empty or count-/formula-ml proxies rather than inventing breast volume.
- **Diaper detail sparsity:** `texture` / `amount` (blowout) exist on dirty/mixed only when caregivers fill detail; wet count from `kind` is more reliable than stool %.
- **Insights timeline omits `payload`:** Charts and edit need payload (or a dedicated read); Design must plan query shape + types.
- **Today default vs multi-day KPIs:** Page default is **today** (table-style). Wake window “3 days” and ~7-day trends will often be empty unless the user widens the range or Design uses fixed lookbacks (product choice — see non-blocking Q below).
- **Pagination honesty:** Charts from loaded timeline pages can under-count if truncated — reuse partial/empty copy patterns; do not invent complete-history claims.
- **Overlap with table-style:** Same branch has large uncommitted Insights UI/e2e changes. Charts workflow must **compose** on top (unify + edit + new charts), not fight a second restyle.
- **80/20 lock:** Default view = Hydration Monitor + **Night Rest** (duration / multi-block) only. Count KPI strip, Sleep Efficiency KPI (soft empty until wakings exist), other three insight charts, legacy growth/care-count, Activity log — all behind expand. Do not put a third primary fact on the default view.
- **Medical copy:** Thresholds (~6 wet/day, >20% watery) are light UI warnings with soft clinician wording — not diagnosis.
- **No new chart library;** no hardcoded breakpoints; skeleton parity mandatory.

## Settled decisions (do not relitigate)

- Gate 1 + Gate 2-UI **ok** — idea approved.
- Default primary pair: **Hydration Monitor** + **Night Rest** (duration / multi-block — not efficiency %). Short purpose / light hydration alert allowed.
- Sleep Efficiency stays a soft-empty **KPI** behind **More insights** until night-waking fragments exist — never default chart #2.
- Full three-KPI strip behind **More insights** — never always-on on default.
- Other three insight charts + legacy growth/care-count behind **More insights**.
- Unified activity table behind **Activity log**; edit in **Money-style modal**.
- Soft empty / “need more logs” when data thin — no fake trends.
- Prefer reuse of `baby-insights-table-style` chrome if present; do not duplicate restyle-only work.
- No Money / capture / Telegram rework unless Design proves a hard data gap (then call it out, don’t silent invent).
- visx for normal charts.

## Blocking questions

None for starting Design. Data gaps and edit scope are covered by **provisional defaults** below — Design can proceed and surface options only if a pick changes architecture.

## Non-blocking questions (Design may use provisional defaults)

1. **Edit modal fields / delete?**  
   - **Provisional:** Editable = time (`occurredAt` / `endedAt` for sleep) + type payload fields already allowed by update validators (feed method/ml/notes; diaper kind/color/texture/amount/notes; sleep notes; growth kind/value/unit/notes). **Delete** allowed with confirm (same as measure page). Out of scope: inventing night-waking editors.

2. **Sleep efficiency without night wakings?**  
   - **Superseded (Gate 2-UI / design):** Default #2 is **Night Rest** duration, not a Night Sleep Efficiency chart. Sleep Efficiency remains a soft-empty KPI behind More insights until fragments exist; do **not** add capture types in this pass.

3. **Milk series for Hydration Monitor?**  
   - **Provisional:** Prefer wet-diaper count vs **feed count** and/or **formula ml when present**; soft empty when neither is useful. Do not invent breast ml from duration.

4. **Today filter vs 3–7 day KPI windows?**  
   - **Provisional:** Applied Insights date range still drives all series; if range is shorter than a KPI needs → soft empty. Caregivers widen the filter for multi-day views. (Alternative for Design to weigh: fixed lookbacks for deferred KPIs only — only if that stays clear with the period chip.)

5. **Unified table merge vs two sections + shared edit?**  
   - **Provisional (idea preference):** one Activity log table (care + measurements), behind expand.

6. **Wet-diaper threshold?**  
   - **Provisional:** fixed ~6/day for v1; soft clinician wording; age bands later.

7. **`baby-insights-table-style` still unmerged?**  
   - **Provisional:** Build on current working-tree Table chrome + today default; charts workflow owns unify + edit + insight charts. Coordinate merge order with Gate 3 of that workflow so chrome is not duplicated.

---

**Clarity check for Design:** Are the instructions and reference files clear enough to design?
