# Design: Baby Insights charts, KPIs, guidance, editable activity table

**Has UI:** yes  
**ADR:** N/A — add workspace-scoped GraphQL `babyInsightsSeries` aggregate + shared pure derive helpers (server uses them); Insights-only timeline/growth with `payload` for Activity log edit; reuse update/delete mutations. No DB schema migration or new framework.

## Locked product picks (from Gate 2-UI + Analyze)

Do not reopen unless Gate 2 rejects them:

1. **Default primary UI** = **Hydration Monitor** + **Night Rest** only (short purpose / light alert allowed). Night Rest = night sleep duration / crib-time proxy — **never** labeled as efficiency %.
2. Full three-KPI strip, other three insight charts, legacy growth / care-count charts, and **existing count KPIs** (feeds / sleep / diapers / latest weight) → behind **More insights**.
3. Unified activity table → behind **Activity log**; **edit** in **Money-style modal**.
4. Soft empty / “need more logs” when data thin — **no fake trends**. Sleep Efficiency **KPI** soft empty until waking fragments exist.
5. **No new capture types** this pass (no night-waking fragments).
6. Build on **`baby-insights-table-style` chrome** in the working tree (Table + mobile cards + today default) — reuse; do not re-restyle from scratch.
7. **visx** only; no hardcoded breakpoints; skeleton parity mandatory.
8. Medical thresholds are light UI warnings with soft clinician wording (~6 wet/day; >20% watery behind More insights).

### Provisional defaults locked into this design

| Topic | Choice |
|-------|--------|
| Edit fields | `occurredAt` / `endedAt` (sleep) + payload fields already allowed by update validators; growth kind/value/unit/notes |
| Delete | Allowed with confirm (same as Measure page) |
| Default #2 Night Rest | Ship **night sleep duration** (crib-time proxy) from completed sleep intervals in the night window; show interval count when &gt;1 so parents can spot short/broken nights. **Do not** label as efficiency % |
| Sleep Efficiency KPI | Soft empty (`need_night_waking_logs`) until waking fragments exist — behind More insights only |
| Hydration milk series | Wet-diaper count vs **feed count** and/or **formula `amountMl` when present**; never invent breast ml from duration |
| Date range vs multi-day KPIs | Applied Insights range drives all series; shorter than needed → soft empty |
| Count KPIs (feeds/sleep/diapers/weight) | **Keep** behind More insights (below insight KPIs) — do **not** drop this pass; never on default view |
| Table merge | One Activity log (care + measurements), behind expand |
| Wet threshold | Fixed ~6/day v1; soft clinician wording |
| Timeline `payload` | **Insights-only** query document (or selection) — do **not** add `payload` to the shared Home `TIMELINE_Q` |

---

## Decision 1 — How we compute and ship insight series

### Option 1 — Client-side derive from Insights timeline pages (progressive disclosure on the dashboard)

**What it is:**  
Keep one `BabyInsightsDashboard`. Add an **Insights-only** `babyTimeline` GraphQL document that selects `payload` (leave shared Home `TIMELINE_Q` unchanged). Add pure unit-tested helpers that turn loaded timeline (+ growth) rows into hydration / **Night Rest duration** / deferred KPI+chart series. Restructure the page so the default view is only the two chart cards; **More insights** and **Activity log** use expand / disclosure. Reuse table-style Table + mobile cards for one Activity log; row open → Money-style edit modal calling existing `updateBabyEvent` / `deleteBabyEvent` / `updateBabyGrowth` / `deleteBabyGrowth`. Night Rest shows usable night-duration signal from today’s schema; Sleep Efficiency **KPI** soft-empty until waking fragments exist (no fake %).

**Example:**  
Caregiver opens `/baby/insights` (today default from table-style helper) → sees Hydration Monitor (wet vs feeds) + Night Rest (last night’s sleep minutes; multi-block count if logged). Opens **More insights** → insight KPIs (efficiency soft empty) + count KPIs + Pattern / Wake / Diaper + legacy charts. Opens **Activity log** → unified table → taps a feed row → modal edits `amountMl` → `updateBabyEvent` → invalidate Insights timeline → charts refresh.

**Pros:**

- Smallest path; matches how Insights already aggregates care counts on the client.
- TDD-friendly pure helpers; no new GraphQL operations beyond an Insights-only selection with `payload`.
- Composes cleanly on unmerged table-style chrome.
- Failure mode for thin data is already familiar (partial / empty copy).
- Default #2 answers “solid or short/broken?” without lying about efficiency %.

**Cons:**

- Charts only see **loaded** timeline pages — truncated history can under-count (must reuse partial/empty honesty).
- `baby-insights-dashboard.tsx` grows again (layout + charts + modal wiring).
- True fragmentation (wakings inside one crib stretch) stays unavailable until a future capture pass.

### Option 2 — Server-side `babyInsightsSeries` aggregate for the applied range

**What it is:**  
Same 80/20 UI and Activity log / modal as Option 1, but add a GraphQL query (e.g. `babyInsightsSeries(from, to)`) that reads **all** care events in the range server-side (workspace-scoped) and returns ready-made series + KPI numbers. Client charts render the snapshot; Activity log still uses infinite timeline/growth lists with payload via an Insights-only selection. Soft empty rules live on the server too (efficiency KPI without waking fragments; hydration uses wet vs feeds / formula ml; Night Rest duration still computed from sleep intervals).

**Example:**  
Apply date range → client calls `babyInsightsSeries` once → server scans `baby_care_event` for workspace + bounds → returns `{ hydrationDays, nightRestDays, wakeWindowAvg, … }` → default two charts bind to those fields. Edit still goes through existing mutations; after invalidate, refetch series + lists.

**Pros:**

- Full-range honesty — not capped by client page size.
- Thinner client math; dashboard mostly presents server DTOs.
- Easier to add age-banded thresholds later in one place.

**Cons:**

- New public GraphQL surface + resolvers + tests; higher Build cost.
- Large ranges can be heavier on DB unless carefully limited (must keep existing limit/abuse caps mindset).
- Overlaps existing client derive patterns (`baby-care-counts`, growth series) — two aggregation styles to maintain.
- Does not unlock true efficiency % without waking capture.

## Tradeoffs

| Factor | Option 1 | Option 2 |
|--------|----------|----------|
| Cost / time | Lower — payload field + helpers + UI | Higher — new query + server aggregate + UI |
| Complexity | Client grows; pagination honesty required | New API contract; dual list+series paths |
| Usability | Same 80/20 caregiver outcome | Same 80/20; slightly more accurate multi-day charts |
| Failure cases | Under-count if pages truncated | Slow/expensive range scans if unbounded |

## Recommendation

**Design-time lean was Option 1** (smaller Build; Insights already derives from loaded pages).

**Gate 2 human pick: Option 2.** Caregivers get full-range honesty for charts/KPIs instead of under-count when timeline pages are truncated. Same 80/20 UI, Night Rest duration, soft empty, and Activity log edit path. True efficiency % remains a **capture** gap; Night Rest duration stays the honest default #2.

## Chosen design

**Chosen: Option 2** — server-side `babyInsightsSeries` aggregate for the applied range (human approved at Gate 2).

Charts and insight KPIs bind to the series snapshot. Activity log still uses Insights-only infinite timeline/growth **with `payload`** for edit (same as Option 1 description). Pure derive helpers stay unit-tested and are shared by the server resolver (or a server module that calls them).

---

## Patterns to reuse

| Pattern | Why it fits | Reference |
|---------|-------------|-----------|
| Client Insights dashboard + applied date range | One filter drives series query, lists, expands | `components/baby-insights-dashboard.tsx` |
| GraphQL query + workspace-scoped resolver | New `babyInsightsSeries`; same authz as other Baby fields | Existing Baby GraphQL resolvers / `requireBabyWorkspace` |
| Pure derive helpers + unit tests | TDD formulas first; server resolver (or server module) calls shared helpers | `lib/baby-insights-kpis.ts`, `lib/baby-care-counts.ts` |
| Honest empty / soft empty chart copy | Soft “need more logs,” never fake trends | `babyCareCountChartCopy` / `babyGrowthChartCopy` |
| visx chart cards + `colorByIndex` | Stay on existing chart stack | `baby-*-chart.tsx`, `components/charts/column-chart.tsx`, `line-chart.tsx`, `stacked-area-chart.tsx` |
| Dynamic import + chart skeleton | SSR-safe visx; CLS-safe loading | Dashboard dynamic charts |
| Progressive disclosure | More insights / Activity log | `components/ui/about-disclosure.tsx` (or equivalent expand) |
| Light in-UI alerts | Hydration ~6 wet/day | `components/ui/alert.tsx` |
| Money edit modal + row open | Edit without leaving Insights | `transaction-edit-modal.tsx`, `analytics-transactions-table.tsx`, `components/ui/modal.tsx` |
| Care / growth update+delete | Existing validated mutations | GraphQL + `features/baby/server/care-events.ts`, Measure page |
| Insights-only timeline/growth + `payload` | Activity log edit needs payload; do not bloat Home `TIMELINE_Q` | Dedicated Insights documents |
| Table + mobile cards chrome | Reuse table-style work | Uncommitted Insights lists / `loans-dashboard` |
| Show-more + Load more | Activity log volume | `lib/baby-insights-list-visible.ts` + infinite queries |
| Section empty ≠ error | Soft empty | `lib/baby-insights-section-state.ts` |
| i18n EN+VI | Purpose / alerts / expands | `messages/baby/en.ts`, `vi.ts` |
| Skeleton parity | Zero CLS | `BabyInsightsPageSkeleton` |
| Today default + inclusive day ISO | Keep table-style defaults | `lib/baby-insights-default-range.ts` |

---

## Sequence diagram (Chosen Option 2)

Happy path: open Insights → fetch `babyInsightsSeries` for applied range → bind two default charts → optional More insights from same series → Activity log via Insights-only timeline/growth (with payload) → edit via modal → invalidate series + lists → refresh. Key errors: auth/workspace fail, validation fail on update, thin data soft empty, absurd range rejected.

```mermaid
sequenceDiagram
  participant User as Caregiver
  participant UI as BabyInsightsDashboard
  participant Helpers as insightHelpers
  participant QO as babyQueryOptions
  participant GQL as BabyGraphQL
  participant Svc as babyListOrSeriesServices
  participant DB as Postgres

  User->>UI: open /baby/insights
  UI->>UI: today default filters (table-style helper)
  UI->>QO: babyInsightsSeries from/to
  QO->>GQL: babyInsightsSeries(from, to)
  GQL->>Svc: requireBabyWorkspace + load care in range
  Svc->>DB: select baby_care_event workspace + bounds
  alt auth or workspace fail
    DB-->>Svc: error
    Svc-->>GQL: GraphQL error
    GQL-->>UI: section error + retry
  else absurd or invalid range
    Svc-->>GQL: validation error
    GQL-->>UI: section error
  else ok
    DB-->>Svc: care rows (full applied range)
    Svc->>Helpers: derive hydration / nightRest / KPIs / deferred series
    Helpers-->>Svc: DTO + soft-empty reasons + low_wet on full series
    Svc-->>GQL: babyInsightsSeries snapshot
    GQL-->>UI: series for charts and KPIs
  end
  alt thin hydration or no completed night sleep
    UI->>User: two cards visible; soft empty inside chart
  else enough data
    UI->>User: Hydration + Night Rest charts
  end

  opt More insights
    User->>UI: expand More insights
    UI->>UI: bind insight KPIs + deferred series from same snapshot
    UI->>User: KPI strips + other charts + legacy (legacy may still use growth/care lists)
  end

  opt Activity log edit
    User->>UI: expand Activity log
    UI->>QO: Insights timeline + growth infinite (from/to)
    QO->>GQL: Insights-only babyTimeline incl payload
    GQL->>Svc: listBabyTimeline workspace scoped
    Svc->>DB: select care pages
    DB-->>UI: timeline pages with payload (via GQL)
    QO->>GQL: babyGrowthEntries from to
    GQL->>Svc: listBabyGrowthEntries
    Svc->>DB: select growth
    DB-->>UI: growth pages (via GQL)
    User->>UI: open row
    UI->>User: Money-style modal (care or growth via row.source)
    User->>UI: save
    UI->>GQL: updateBabyEvent or updateBabyGrowth
    GQL->>Svc: update workspace scoped + validators
    alt validation fail
      Svc-->>GQL: 422-style GraphQL error
      GQL-->>UI: inline modal error
    else ok
      Svc->>DB: update row
      DB-->>Svc: updated
      Svc-->>GQL: entity
      GQL-->>UI: success
      UI->>QO: invalidate babyInsightsSeries + Insights timeline/growth
      Note over UI: charts and table refresh
    end
  end
```

---

## Contracts

### API contracts

#### GraphQL query (primary): `babyInsightsSeries`

| Item | Detail |
|------|--------|
| Name | `babyInsightsSeries(from: String!, to: String!)` |
| Auth / who can call | Existing session + `requireBabyWorkspace` |
| Request fields | `from`, `to` (applied Insights range; reject absurd spans via existing validation / limit mindset) |
| Success response | Typed DTO: hydration days, night rest days, insight KPI numbers, deferred series blobs (Pattern / Awake / Diaper), soft-empty reasons, hydration `alert` |
| Soft empty / Night Rest / hydration | **Same rules** as derive helpers below — server runs shared helpers on **all** care events in range (not a client page slice) |
| `low_wet` on series | Day-scope rule unchanged. On this full-range path, chart series is **not** truncated by timeline `nextCursor` — treat as complete for the applied range (`hasMorePages` **N/A for charts**). Do **not** suppress `low_wet` just because Activity log lists still paginate. |
| Errors | Unauthenticated / no workspace → GraphQL error; bad / absurd range → validation |
| Downstream | Workspace-scoped scan of `baby_care_event` (+ growth if a deferred series needs it); call shared pure helpers |

**Client:** Insights dashboard fetches this once per applied range for charts and insight KPIs. After edit, invalidate series + Activity log lists.

#### GraphQL query selection: Insights-only `babyTimeline` (Activity log + edit)

Still required under Option 2 — Activity log edit needs `payload`. Charts do **not** derive from these pages.

| Item | Detail |
|------|--------|
| Method + path (or name) | Query `babyTimeline` — **same operation**; new **Insights-only** document (e.g. `INSIGHTS_TIMELINE_Q`) **adds** `payload` |
| Auth / who can call | Existing session + `requireBabyWorkspace` |
| Request fields | `from`, `to`, `cursor`, `limit` (unchanged) |
| Success response | Items include `id`, `kind`, `type`, `at`, `endedAt`, **`payload`**, `summary`, `source`, `cursor` |
| Errors | Unauthenticated / no workspace → GraphQL error; bad args → validation |
| Downstream calls | `listBabyTimeline` → Postgres (payload already stored) |

**Do not** add `payload` to the shared Home `TIMELINE_Q` in `lib/baby-query-options.ts` — that would ship extra JSON to Home and other callers. Insights Activity log uses its own document (or a dedicated selection helper) that includes `payload`.

#### GraphQL mutations (reuse — no schema change)

| Operation | Auth | Request | Success | Errors |
|-----------|------|---------|---------|--------|
| `updateBabyEvent(input)` | Baby workspace | `id`, optional `occurredAt` / `endedAt` / `payload` | `BabyCareEvent` | Not found / wrong workspace; payload fail validators |
| `deleteBabyEvent(id)` | Baby workspace | `id` | Deleted event | Not found / wrong workspace |
| `updateBabyGrowth(input)` | Baby workspace | `id` + patch fields | `BabyGrowthEntry` | Validation / not found |
| `deleteBabyGrowth(id)` | Baby workspace | `id` | Deleted entry | Not found |

#### Shared derive helpers + client modules (Option 2)

Helpers are pure and unit-tested first. Server series resolver (or a server module) **calls** them on full-range rows. Client charts bind to series DTO fields — they do **not** re-derive chart series from timeline pages.

| Module | Role | Notes |
|--------|------|-------|
| `lib/baby-insights-hydration.ts` (name flexible) | Daily wet count + feed count / formula ml series; `low_wet` per day-scope rule below | Pure; unit-tested; used by server series |
| `lib/baby-insights-night-rest.ts` (name flexible) | Per-day night sleep **duration** (+ interval count); never efficiency % | Pure; unit-tested; used by server series |
| `lib/baby-insights-kpis.ts` (extend or sibling) | Avg wake window, milk→diaper lag, sleep efficiency KPI | Soft empty per rules below; used by server series |
| Deferred series helpers | Pattern matrix, awake trend, diaper mix % | Used by server series / More insights |
| Activity merge helper | Care + growth → unified row DTO | Client; Activity log only |
| Activity edit modal component | Mirrors Money modal; care vs growth forms | Calls mutations above |
| Insights query options | `babyInsightsSeries` + Insights-only timeline/growth | Charts vs list paths stay separate |

#### Sleep day bucketing (shared helper note)

One shared rule for Night Rest, wake windows, and any sleep day series:

| Rule | Choice |
|------|--------|
| Local calendar | Use the caregiver’s local timezone (same as Insights date filters / today default) |
| General day key | Local calendar date of sleep **`occurredAt` (start)** for ordering and “which day a sleep starts on” |
| Completed sleep | `endedAt` present and `endedAt` &gt; `occurredAt`; **open sleep** (`endedAt` null) is **excluded** from duration and from wake-window pairs |
| Night Rest day **D** (morning label) | Sum overlap minutes of completed sleeps with night window **`[D−1 19:00 local, D 08:00 local)`**; also return `intervalCount` of contributing sleeps |
| Cross-midnight | Overlap clip handles intervals that start before midnight and end after; duration only counts minutes inside the night window |
| “Today” default | When applied range is a single local day **D** (today), Night Rest still computes the night window ending on **D** morning (last night → this morning) so default #2 is useful on the today filter |
| Wake-window ordering | Sort completed sleeps by `occurredAt` ascending within the applied range (and look back one prior completed sleep if needed for the first gap — server series can include that prior row when loading the range; Activity-log-only client paths must not invent it) |

#### Insight KPI formulas (input → output)

**1. Average Wake Window**

- **Input:** Completed sleep intervals in the applied range (open sleep excluded).
- **Pairs:** Chronological consecutive sleeps; wake minutes = `next.occurredAt − previous.endedAt` (only if positive).
- **Output:** Mean of those wake gaps (minutes), or soft empty.
- **Soft empty when:** applied range spans **&lt; 3** distinct local calendar days; **or** fewer than **2** completed sleeps; **or** no positive wake gaps. (Option 1 leftover: do not claim a full average from a truncated client page slice — **N/A for Option 2 charts**, which use full-range series.)

**2. Milk → Diaper lag**

- **Input:** Feed events + diaper events in the applied range (need `payload` for diaper `kind`).
- **Following diaper:** For each feed at time `T`, take the earliest diaper with `at &gt; T`, `kind ∈ {wet, dirty, mixed}` (**not** `dry`), and lag ≤ **6 hours**.
- **Output:** Mean lag minutes of those pairs, or soft empty.
- **Soft empty when:** no feed→diaper pairs within the 6h cap; or no feeds; or no eligible diapers.

**3. Sleep Efficiency KPI** (More insights only — not default chart #2)

- **Input:** Would need night-waking / crib-fragment logs (`Actual_Sleep / Total_Time_in_Crib`).
- **Output:** Soft empty with reason `need_night_waking_logs` until fragments exist.
- **Never:** invent efficiency % from a single sleep block or from Night Rest duration.

#### Night Rest chart series (default #2)

- **Input:** Completed sleeps overlapping each night window for days in the applied range (see bucketing above).
- **Output per day D:** `{ date: D, nightSleepMinutes, intervalCount }`.
- **UI label:** Night Rest / night sleep duration — **not** “efficiency.”
- **Soft empty when:** no completed sleep overlaps any night window in range (`need_more_sleep_logs`).
- **Parent signal:** short `nightSleepMinutes` or `intervalCount &gt; 1` → short/broken night clue; long single block → solid night clue. Honest limit: cannot see wakings inside one logged interval.

#### Hydration Monitor series + `low_wet` alert (default #1)

- **Input:** Diaper + feed events in the applied range (need `payload` for diaper `kind` and feed `amountMl`). Helpers may accept optional `hasMorePages` for reuse / unit tests.
- **Output per local day D:** `{ date: D, wetCount, feedCount, formulaMl? }` — **hydration wetness** `wetCount` = count of diapers with `kind ∈ {wet, mixed}` (`dry` and dirty-only do **not** count). Feeds = feed events that day; `formulaMl` = sum of present `amountMl` (never invent breast ml from duration).
- **Soft empty when:** no wet counts and no useful feed/formula signal in the series inputs (`need_more_logs`).
- **`low_wet` alert (day-scope):** Return `alert: "low_wet"` when **any** local day in the applied range has `wetCount &lt; 6` **and** that same day has **≥1 feed** OR **formulaMl &gt; 0**. Otherwise `alert: null`.
  - Not “average wet across range,” not “last day only,” not “today only unless today is in range and matches.”
  - Multi-day example: range Mon–Wed; Tue wet=4 with 2 feeds → `low_wet` even if Mon/Wed are fine.
  - No feed and no formula ml on a low-wet day → do **not** alert (thin intake signal; soft empty or quiet series only).
  - **Pagination / truncation honesty (helper rule unchanged):** When `hasMorePages` is true (incomplete input slice), **do not** return `low_wet` — series may still render with **partial** copy only. Incomplete wet counts must not fire a false dehydration alert.
  - **Option 2 charts:** `babyInsightsSeries` scans the **full** applied range → for chart/KPI binding, `hasMorePages` is **N/A** (pass false / omit). Apply day-scope `low_wet` on the full series. Do **not** suppress the alert because Activity log timeline still has `nextCursor`.

#### Diaper Output buckets (schema → chart)

Schema enums (`db/schema/baby.ts` / `lib/baby-diaper-detail.ts`): `kind` = wet\|dirty\|mixed\|dry; `texture` = soft\|seedy\|mushy\|watery\|hard\|formed; `amount` = smear\|medium\|blowout. Texture/amount only valid on dirty/mixed.

| Bucket | Mapping rule |
|--------|----------------|
| **Wet** | `kind === "wet"` only (count 1). **Different job** from Hydration Monitor wetness (`wet`+`mixed`). `dry` ignored for this chart. |
| **Loose-watery** | `kind ∈ {dirty, mixed}` **and** `texture === "watery"` |
| **Blowouts** | `kind ∈ {dirty, mixed}` **and** `amount === "blowout"` |
| **Normal** | `kind ∈ {dirty, mixed}` **and** `texture ∈ {soft, seedy, mushy, hard, formed}` (not watery) |
| **Unclassified dirty/mixed** | dirty/mixed with **missing** `texture` — **ignore** for stool-% buckets (do not invent “normal”) |
| **Double-count** | One diaper may count in **both** loose-watery and blowouts if both fields match; wet is separate. Percents use denominator = wet + normal + loose-watery + blowouts counts (blowout+watery diaper adds 2 to denominator) **or** build shows absolute counts + % of textured stool — prefer **counts first**, then % of (normal + loose-watery + blowouts) for stool mix and separate wet count line. **v1:** report four shares where denominator = sum of bucket counts after classification; a watery blowout increments watery and blowouts (denominator +2). |
| **Soft empty** | Soft empty when **&lt; 3** dirty/mixed rows with a **present** `texture` in the applied range — too few textured samples for a honest mix %. Wet-only ranges → soft empty for mix chart (hydration still uses wet counts). |
| **Alert** | Loose-watery share of (normal + loose-watery + blowouts stool-classified count) **&gt; 20%** when soft-empty rule does not fire — light clinician wording only. |

#### Unified Activity log row DTO

```ts
type ActivityLogRow = {
  source: "care" | "growth";
  id: string;                 // care event id or growth entry id
  at: string;                 // ISO sort instant (care `at` / growth `recordedAt`)
  sortKey: string;            // `${at}\0${source}\0${id}` descending for newest-first
  title: string;              // i18n type label (Feed / Sleep / Diaper / Weight / …)
  summary: string;            // existing summary helpers
  careType?: "feed" | "diaper" | "sleep";
  growthKind?: string;
  endedAt?: string | null;    // sleep
  // edit routing — modal uses this only
  editTarget: { source: "care" | "growth"; id: string };
};
```

Merge: map timeline care items + growth items → `ActivityLogRow[]`, sort by `sortKey` desc. Row open → if `source === "care"` call care update/delete; if `growth` call growth update/delete.

#### Pagination / partial honesty

**Charts / insight KPIs (Option 2):** Come from `babyInsightsSeries` over the full applied range. Timeline `nextCursor` on Activity log lists does **not** make chart series “partial.” Soft empty still applies when data is thin. Helper `hasMorePages` / suppress-`low_wet` rule remains for unit tests and any non-full slice; series resolver passes complete range input.

**Activity log lists:** If Insights timeline (or growth) pages still have `nextCursor`, the **table** uses show-more / load-more — never claim the visible list is the full history. That list pagination must **not** demote chart honesty or suppress series `low_wet`.

#### HTTP / REST

No new or changed REST handlers.

### Database contracts

**No schema migrations this pass.**

| Table / collection | Purpose | Key fields | Indexes / uniques | Write owner | Read owners |
|--------------------|---------|------------|-------------------|-------------|-------------|
| `baby_care_event` | Feeds, diapers, sleep for series + Activity log + edit | `id`, `workspace_id`, `baby_id`, `type`, `occurred_at`, `ended_at`, `payload` (jsonb), `source` | `baby_care_event_workspace_occurred_idx`; open-sleep unique | Capture + `updateBabyEvent` / delete | `babyInsightsSeries`, timeline list |
| `baby_growth_entry` | Measurements in Activity log + legacy growth charts | `id`, `workspace_id`, `kind`, `value_num` / text, `unit`, `recorded_at`, `notes` | existing baby/kind indexes | Measure + update/delete growth | Growth list / charts |

**Payload shapes (unchanged — read for charts/edit):**

- Feed: `method`, optional `durationSec`, `amountMl`, `legs`, `notes`
- Diaper: `kind` (`wet`\|`dirty`\|`mixed`\|`dry`), optional `color`, `texture`, `amount`, `notes`
- Sleep: optional `notes` only — **no waking fragments**

**Data ownership notes:**

- Charts **read** care/growth; they do not invent rows.
- Edit modal **writes** only through existing validators — reject unknown payload keys.
- Soft empty for Sleep Efficiency **KPI** when waking fragments do not exist; Night Rest chart still uses completed sleep duration.
- Diaper mix uses schema enums only (see bucket mapping above).

### Example queries

Placeholders: `$workspaceId`, `$fromIso`, `$toIso`, `$eventId`, `$userSub`.

**1. Full-range care rows for `babyInsightsSeries` (conceptual — server loads then runs shared helpers):**

```sql
SELECT id, type, occurred_at, ended_at, payload, source
FROM baby_care_event
WHERE workspace_id = $workspaceId
  AND occurred_at >= $fromIso
  AND occurred_at <= $toIso
ORDER BY occurred_at ASC, id ASC;
-- Reject absurd ranges in GraphQL/validation before unbounded scans.
```

**2. Timeline page for Activity log (conceptual — existing service; Insights-only client document requests `payload`):**

```sql
SELECT id, type, occurred_at, ended_at, payload, source
FROM baby_care_event
WHERE workspace_id = $workspaceId
  AND occurred_at >= $fromIso
  AND occurred_at <= $toIso
ORDER BY occurred_at DESC, id DESC
LIMIT $limit;
```

**3. Update care event from edit modal (conceptual — existing `updateBabyEvent`):**

```sql
UPDATE baby_care_event
SET occurred_at = COALESCE($occurredAt, occurred_at),
    ended_at = COALESCE($endedAt, ended_at),
    payload = COALESCE($payload::jsonb, payload),
    updated_by_user_sub = $userSub,
    updated_at = now()
WHERE id = $eventId
  AND workspace_id = $workspaceId
RETURNING *;
```

**4. Shared derive sketch (unit-tested pure helpers — also called from series resolver):**

```ts
deriveHydrationSeries(items, { fromDate, toDate, hasMorePages? });
// => { days: [{ date, wetCount, feedCount, formulaMl? }], alert: "low_wet" | null, emptyReason? }
// wetCount = kind ∈ {wet, mixed} (not wet-only; dry/dirty-only excluded)
// low_wet when ANY day in range has wetCount < 6 AND (feedCount >= 1 OR formulaMl > 0)
//   AND hasMorePages is not true; Option 2 series path: full range → hasMorePages N/A / false

deriveNightRestSeries(items, { fromDate, toDate, nightWindow: { startHour: 19, endHour: 8 } });
// => { days: [{ date, nightSleepMinutes, intervalCount }], emptyReason?: "need_more_sleep_logs" }

deriveWakeWindowKpi(items, { fromDate, toDate });
// => { avgMinutes } | { emptyReason: "need_3_days" | "need_more_sleep_logs" }

deriveAwakeWindowTrendSeries(items, { fromDate, toDate, rollingDays: 7 });
// => { days: [{ date, meanWakeMinutes, rollingMeanWakeMinutes? }], emptyReason? }
// soft empty when applied range < 3 local days or too few wake gaps (see Awake Window Trend contract)

deriveMilkToDiaperLagKpi(items, { fromDate, toDate, maxLagHours: 6 });
// => { avgLagMinutes } | { emptyReason }

deriveSleepEfficiencyKpi(items, { fromDate, toDate });
// => { emptyReason: "need_night_waking_logs" }  // until fragments exist

deriveDiaperOutputSeries(items, { fromDate, toDate });
// => buckets via mapping table | { emptyReason: "need_more_texture_logs" }

mergeActivityLogRows(careItems, growthItems): ActivityLogRow[];
```

**5. Client GraphQL (conceptual):**

```graphql
query BabyInsightsSeries($from: String!, $to: String!) {
  babyInsightsSeries(from: $from, to: $to) {
    hydration { days { date wetCount feedCount formulaMl } alert emptyReason }
    nightRest { days { date nightSleepMinutes intervalCount } emptyReason }
    # … KPIs + deferred series per schema
  }
}
```

### Pattern Finder series shape + visx approach

Repo has line / column / stacked-area cards — **no** existing day×24h matrix. For this pass:

| Item | Spec |
|------|------|
| **Data shape** | `{ days: Array<{ date: string /* YYYY-MM-DD */, sleepBlocks: Array<{ startMin: number, endMin: number }>, markers: Array<{ minuteOfDay: number, kind: "feed" \| "diaper" }> }> }` — `startMin`/`endMin` are minutes from local midnight (0–1440); clip cross-midnight sleep into the day row(s) using the same local-start / overlap rules as Night Rest where needed |
| **visx approach** | **Custom matrix card** (ParentSize + SVG/`visx/shape` rects or a CSS grid heatmap) — one row per day, 24h x-axis; sleep = horizontal bands; feed/diaper = small markers. Reuse `colorByIndex` / chart-card chrome. **Do not** force this into `column-chart` / `line-chart`. |
| **Soft empty** | Soft empty when &lt; **2** days with any sleep/feed/diaper markers in the series range (`need_more_logs`) |
| **Partial** | N/A for Option 2 chart series (full applied range). Activity log list pagination does not mark the matrix partial |

### Awake Window Trend series shape + soft empty (chart — not only KPI)

Distinct from the **Average Wake Window KPI** (one mean). This is the **Awake Window Trend** chart under More insights (Tasks 8b / 11).

| Item | Spec |
|------|------|
| **Input** | Completed sleep intervals in the **applied** Insights range (same wake-gap rules as Average Wake Window KPI: consecutive completed sleeps; open sleep excluded; series path may look back one prior completed sleep when loading the range) |
| **Per-day point** | For each local calendar day `D` in the applied range that has ≥1 positive wake gap whose **gap end** (`next.occurredAt`) falls on `D`: `{ date: D, meanWakeMinutes }` = mean of those gap minutes on `D` |
| **Rolling mean (optional series)** | `rollingMeanWakeMinutes` = mean of `meanWakeMinutes` over up to the last **7** days that have a per-day point, ending on `D` (trailing window, not a fixed calendar week). Omit rolling value until ≥ **3** day-points exist in that trailing window |
| **Applied range drives points** | Only days inside the applied `from`/`to` appear. A **today-only** (or otherwise &lt; 3 local days) range → **soft empty** for this chart (same spirit as wake KPI needing multi-day span) — caregivers widen the filter for a trend |
| **Soft empty when** | Applied range spans **&lt; 3** distinct local calendar days; **or** fewer than **2** completed sleeps / no positive wake gaps; **or** fewer than **2** per-day points (`need_more_sleep_logs` / `need_3_days`) |
| **Partial** | N/A for Option 2 chart series (full applied range) |
| **visx** | Shared **line** (or line + dashed rolling) chart card — reuse `baby-*-chart` / `line-chart` + `colorByIndex`. Not a matrix |
| **UI home** | More insights only — never default view |

---

## UI / UX / mobile

**Has UI:** yes.

### 80/20 UI (Gate 2-UI locked)

- **Main user goals:** Check hydration today; judge last night’s rest; optionally dig into patterns / fix a wrong log.
- **Vital few:** Hydration Monitor; Night Rest.
- **Important info #1 (always visible):** Hydration Monitor + short purpose + light alert when wet &lt; ~6/day (and data supports it).
- **Important info #2 (always visible):** Night Rest + short purpose (duration / multi-block — **not** efficiency %). Soft empty only when no completed night sleep.
- **Secondary / deferred:** More insights (insight KPI strip, **count KPIs** feeds/sleep/diapers/latest-weight, Pattern Finder matrix, Awake Window, Diaper Output, legacy growth/care-count); Activity log expand; edit modal; long guidance.
- **Top journey:** Open Insights → read two charts → (optional) expand / edit.
- **Defaults:** Today range (table-style); two charts expanded; More insights + Activity log collapsed.
- **Measure after ship:** Can caregivers answer hydration + night rest (solid vs short/broken) without expanding?

### Layout / hierarchy

Top → bottom:

1. About / filters / period (existing)
2. **Hydration Monitor** card (visx dual series — prefer column/line correlation pattern)
3. **Night Rest** card (visx columns or line of night sleep minutes; optional interval-count annotation — never “% efficiency”)
4. **More insights** disclosure, order:
   1. Three **insight** KPIs (wake window / milk→diaper / sleep efficiency soft empty)
   2. Existing **count** KPIs (feeds / sleep / diapers / latest weight) — **kept**, not dropped; below insight KPIs
   3. Pattern Finder (custom matrix) / Awake Window / Diaper Output
   4. Legacy growth + care-count charts
5. **Activity log** disclosure: one unified Table + mobile cards (care + measurements), show-more / load-more

Do **not** put count KPI strip or Activity table on the default scroll path. Flat sections; chart cards use existing chart-card pattern; tables stay sharp (no Card wrapper around Activity log).

**ui-refs:** Drafts under `ui-refs/` must match this layout and contracts. Light (`01-default-light.png`) is the visual SoT; dark/mobile must mirror the same charts (no oz-intake / fluid-% / goal chips / topic filters).

### Loading / empty / error / success

- **Loading:** Skeleton mirrors two chart slots + collapsed disclosure rows (not five charts + tables).
- **Empty:** Soft copy inside chart (“need more logs” / “need more sleep logs” / “need night-waking logs” for efficiency KPI) — empty ≠ section error.
- **Partial:** Activity log lists may still show load-more when `nextCursor` remains — that does **not** make Option 2 chart series partial or suppress series `low_wet`. Soft empty still applies when series data is thin.
- **Error:** Existing section error + retry for query failures; modal inline errors for validation.
- **Success:** Toast or quiet close after edit (match Money / Measure stakes — routine edit, not a party).

### Skeleton parity (zero CLS)

Update `BabyInsightsPageSkeleton` (+ `loading.tsx` if it embeds it) in the **same** change as live layout:

- Two chart skeleton blocks (order = Hydration then Night Rest)
- Collapsed “More insights” / “Activity log” placeholders matching disclosure chrome
- When expanded skeletons are shown in loading route, mirror `@container` / `@md` table vs cards

Outer `rounded-[var(--radius-md)]`; nested chips/rows `rounded-[var(--radius-sm)]`; tables sharp.

### Mobile

- Phone-first: two charts stack; thumb-friendly expand buttons (≥44×44 / `fx-hit-40` for icon-only).
- Activity log: `@md:hidden` cards; table from `@md` up (reuse table-style).
- Edit modal: focus trap via shared `Modal`; large tap targets; `inputMode` for ml / numeric fields.
- No hover-only edit affordance — row click / explicit Edit control works on touch.
- Safe-area: rely on shell padding; no hover-only actions.

### Accessibility

- Chart purpose as visible text (not color alone for alerts).
- Alerts use `Alert` + text, not color-only.
- Disclosures: real buttons, `aria-expanded`.
- Modal: focus moves in on open; restore on close.
- Table: real table semantics; visible `h2` for Activity log; `sr-only` caption if needed.
- i18n: all new strings EN + VI.

### Day-to-day usage notes

Aligned with Gate 2-UI round 2 + design-review Fix ask path (2): open Insights and answer hydration + night rest (solid vs short/broken via duration) **without expanding**. Dense matrix and KPI strip stay one tap away. Fix wrong rows without leaving the page.

---

## Security design review (OWASP)

### Trust boundaries

| Boundary | What crosses it |
|----------|-----------------|
| Browser → GraphQL | Session cookie + Baby workspace; `from`/`to` for series + list args; mutation inputs; **payload JSON** on Insights timeline read + update |
| GraphQL → DB | Workspace-scoped series scan / list / update / delete services |
| Shared derive helpers | Pure transforms — not an authz boundary; server calls them after workspace-scoped load |
| Modal forms | User-edited times + payload fields → validated server-side |

### Abuse cases

- Forge another workspace / event id on update/delete → must fail workspace ownership checks (existing).
- Oversized `payload` or unknown keys → reject via existing Zod/validators.
- Huge date span / large `limit` → keep existing caps; do not loosen for charts.
- XSS via notes/summary in table or chart tooltips → React text escaping only; no `dangerouslySetInnerHTML`.
- Treat soft medical alerts as diagnosis copy → avoid; keep clinician-soft wording (product/security of trust).

### OWASP Top 10

Primary reference: https://owasp.org/Top10/

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 Broken Access Control | **pass** | Reuse `requireBabyWorkspace` on series + lists + updates/deletes; no new IDOR paths |
| A02 Cryptographic Failures | **N/A** | No new secrets, tokens, or sensitive data in URLs |
| A03 Injection | **pass** | Parameterized ORM/SQL via existing services; React-escaped UI; JSON payload validated, not eval’d |
| A04 Insecure Design | **pass** | Soft empty instead of fake trends; no new capture trust; series is UX aggregate not authz; thresholds are warnings not medical claims; keep range caps |
| A05 Security Misconfiguration | **N/A** | No CORS / header / debug flag changes |
| A06 Vulnerable Components | **pass** | No new chart library or deps planned (visx already in repo) |
| A07 Auth Failures | **pass** | Same session + workspace gate on reads and mutations |
| A08 Software / Data Integrity | **pass** | Mutations go through existing validators; no unsigned webhooks |
| A09 Logging / Monitoring Failures | **pass** | Do not log full care payloads / PII in new debug paths; authz failures stay server-side |
| A10 SSRF | **N/A** | No server fetch of user-supplied URLs |

### Callouts

- **Authz:** Every read/write remains workspace-scoped.
- **Injection:** Payload is structured JSON validated per care type — never concatenate into SQL.
- **Secrets:** None added.
- **Logging:** Avoid dumping timeline payloads in client or server logs while debugging charts.

---

## Aggressive challenges answered

| Question | Answer |
|----------|--------|
| Do we need this? | Yes — counts-only Insights do not answer hydration or night rest; Gate 2-UI ok’d the two-chart default. |
| What fails? | True efficiency % empty without waking logs (honest KPI soft empty); breast milk volume missing (use feed count / formula ml); large date spans need range caps on series; forgetting skeleton parity → CLS. |
| Is this overspecified? | Gate 2 chose Option 2 for full-range honesty — accepted Build cost. New capture types are explicitly out. Five always-on charts rejected by 80/20. |
| Why Night Rest instead of empty efficiency chart? | Gate 2-UI needs a **usable** default #2. Duration / multi-block from today’s schema answers solid vs short/broken without fake efficiency %. Efficiency KPI stays behind More insights as soft empty until wakings exist. |
| Why not wait for table-style merge? | Working tree already has chrome; composing now avoids a second restyle and duplicate e2e thrash. |
| Why keep Insights-only timeline payload? | Activity log edit still needs payload on list rows; series DTO is for charts/KPIs, not row edit forms. |

---

## Boundaries for Build

| Tier | Rule |
|------|------|
| **Always** | TDD for derive helpers first; server `babyInsightsSeries` uses those helpers; default UI = Hydration + Night Rest only; soft empty; skeleton parity; EN+VI; reuse table-style chrome; Insights-only `payload` for Activity log; edit via existing mutations; count KPIs behind More insights; range caps on series |
| **Ask first** | Age-banded thresholds; labeling Night Rest as efficiency; deleting from modal if product wants read-only; widening series range limits beyond existing abuse caps |
| **Never** | New night-waking capture types this pass; fake efficiency %; invent breast ml; always-on KPI strip; five charts default; bloat shared Home `TIMELINE_Q` with `payload`; derive chart series from truncated Activity log pages; new chart library; hardcoded breakpoints; Money / Telegram / capture redesign |
