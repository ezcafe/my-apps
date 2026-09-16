# Idea: Baby Insights charts, KPIs, guidance, and editable activity table

## Problem

On **Baby Insights** (`/baby/insights`), parents mostly see **simple counts** (feeds / sleep / diapers / latest weight) and **growth + care-count charts**. That does not answer day-to-day care questions:

- Is the baby **hydrated** (milk in vs wet diapers out)?
- Is **night sleep** restful or fragmented?
- Are **wake windows** climbing (nap drop / schedule change)?
- Is **digestive output** shifting in a way worth noting for a pediatrician?
- Is the **24-hour sleep/feed pattern** lining up into a routine?

Charts also lack **purpose / guidance** text, so parents may not know what “good” looks like or when to worry. Showing every chart at once is noisy. Care **timeline** and **measurements** are still **separate browse lists**; fixing a wrong entry means leaving Insights and using another flow — unlike Money’s edit-from-list pattern.

A related workflow (`baby-insights-table-style`) may restyle lists / default the date range; it does **not** replace this idea’s focus on **insight charts + KPIs + guidance + 80/20 chart visibility + one editable activity table**. Do not assume that work is merged.

## User / audience

- **Primary:** Parents / caregivers who open Baby Insights on a phone or laptop to check **today’s health and rest** and decide “do I need to change something?”
- **Secondary:** Partners who want a quick shared picture (hydration, night sleep, pattern) without reading every log row.
- **Not this pass:** Clinics, multi-baby dashboards, medical diagnosis products, or redesign of Baby capture / Telegram logging.

## Outcome

What “done” looks like:

1. **Default primary UI** shows **only** the two day-to-day signals (plus short purpose / light alert lines on those charts). No always-on three-KPI strip or other KPI cards on the default view.
2. **Three insight KPIs** still exist for the selected date range when inputs exist, but the **full KPI strip** (or any competing KPI cards) lives behind expand / “More insights”:
   - **Average Wake Window** — average of `(Sleep_Start − Previous_Sleep_End)` over **3 days**.
   - **Milk to Diaper Ratio** — average time from a feeding to a following wet/dirty diaper.
   - **Sleep Efficiency** — `Actual_Sleep_Duration / Total_Time_in_Crib` when night wakings (or equivalent fragments) are logged; **soft empty** until those fragments exist (do not invent % from a single sleep block).
3. **Five insight charts**, each with short **purpose / guidance** copy (and light alert copy where thresholds apply):
   1. **24-Hour Sleep & Feed Matrix** (Pattern Finder) — days × 24h; sleep blocks + feed/diaper markers; vertical alignment ≈ routine working. (**Deferred** — “More insights.”)
   2. **Feeding to Wet Diaper Correlation** (Hydration Monitor) — daily **feed count** and/or **formula ml when present** vs wet-diaper count; trends should move together; warn if feeds/formula look steady but wet diapers drop below **~6/day**. (**Default #1.**)
   3. **Awake Window Trend** (Nap Transition Calculator) — awake time between naps + ~7-day rolling trend; climbing → consider dropping a nap / adjusting schedule. (**Deferred.**)
   4. **Diaper Output Breakdown** (Digestive Health Summary) — % wet / normal / loose-watery / blowouts; loose-watery **>20%** → pediatrician-ready summary. (**Deferred.**)
   5. **Night Rest** (Rest Quality Indicator) — per-day **night sleep duration** (crib-time proxy from completed sleep intervals in the night window). **Not** labeled as efficiency %. Short or multi-block nights help parents judge “solid vs short/broken.” True efficiency % stays in the KPI strip (soft empty until wakings). (**Default #2.**)
4. **80/20 chart visibility:** only **Hydration Monitor** and **Night Rest** show on the primary Insights view; the other three charts sit behind expand / “More insights.”
5. Guidance themes inform chart purpose copy and light alerts (not separate pages): Daily Health & Hydration; Predictable Biological Rhythms; Feed-to-Sleep Correlation; Strategic Nap Transitions.
6. **One unified activity table** merges care timeline + measurements; it sits behind expand / **“Activity log”** (not on the default scroll view). Row open uses a **Money-style edit modal** so caregivers can correct entries without leaving Insights.
7. Existing date range / filters still drive KPIs, charts, and the table; skeletons stay in parity (zero CLS); light + dark remain correct. Thin data → soft empty / “need more logs,” not fake trends.

## Metric

**Primary signal:** A caregiver can open Baby Insights and, **without expanding anything**, answer: (1) “Is hydration looking OK?” and (2) “Was last night’s sleep solid or short/broken?” — using Hydration Monitor + **Night Rest** (duration / multi-block signal, **not** a fake efficiency %). True sleep-efficiency % is behind More insights and stays soft empty until waking logs exist.

**Supporting signal:** They can open **More insights** for pattern / wake-window / diaper-mix charts and the full KPI strip (including soft-empty Sleep Efficiency until wakings), open **Activity log** for the unified table, and **edit a wrong feed/sleep/diaper/measurement** via a Money-like modal.

## 80/20 UI (day-to-day)

- **Important info #1 (always visible):** **Hydration Monitor** (Feeding ↔ Wet Diaper correlation) — with short purpose text and a light dehydration-style alert when the rule fires.  
  **Why:** Day-to-day safety signal parents check first; feeds/formula vs wet output is actionable the same day.
- **Important info #2 (always visible):** **Night Rest** (night sleep duration / crib-time proxy — **not** efficiency %) — with short purpose text.  
  **Why:** Next-day mood, feeding, and schedule decisions hang on whether the night looked solid or short/broken; today’s schema supports duration, not waking fragments.
- **Everything else:** expand / modal / context menu — deferred:
  - Pattern Finder (24h matrix)
  - Awake Window Trend (nap transition)
  - Diaper Output Breakdown (digestive mix)
  - Full three-KPI strip (Average Wake Window, Milk to Diaper Ratio, Sleep Efficiency) — behind expand / “More insights”; never always-on on the default view. Sleep Efficiency KPI soft-empty until wakings. Short purpose / light alert on the two default charts only.
  - Long guidance / “why this matters” copy beyond one short purpose line per visible chart
  - Unified activity table browse behind expand / **“Activity log”**; **edit** always in **modal**
  - Legacy growth / care-count charts — behind expand / “More insights” this pass (or out of Insights; prefer behind expand so they never compete with #1/#2)

**Rejected default pair (documented):** Pattern Finder + Hydration — strong for “is routine forming?” but Pattern Finder is a **week-shape** view, less urgent than **night rest quality** for daily decisions. Keep Pattern Finder in “More insights.”

## Non-goals

What we will **not** build in this pass:

- Separate insight “topic pages” for the four purpose themes.
- Medical diagnosis, treatment advice, or clinician portal features.
- Push / SMS / email alert products (in-UI copy and light banners only).
- Multi-baby comparison or age-norm percentile charts from WHO/CDC (unless data already exists and is trivial — default **no**).
- Rework of Baby capture, Telegram bots, or Money Insights.
- Hardcoded layout breakpoints or a new chart library outside the app’s existing chart stack (visx for normal charts).
- Assuming `baby-insights-table-style` is merged — if that work lands first, **reuse** table chrome; do not duplicate restyle-only tasks.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| Parents care most about **hydration + night sleep** on first glance | Yes for 80/20 pick | User prefers Pattern Finder + Hydration (or another pair) | Swap default charts; keep others deferred |
| Timeline events already (or can) carry enough fields for wake windows, milk volume, wet vs dirty, night duration, stool consistency | Mostly | Logs lack milk amount, waking fragments, or stool type | Soften hydration to feeds/formula ml; ship Night Rest as duration (not efficiency %); keep efficiency KPI soft empty; stool % soft empty when texture thin |
| **~6 wet diapers/day** and **>20% loose/watery** are OK product thresholds for light UI warnings (not medical claims) | For copy v1 | Pediatric guidance differs by age / feeding method | Age-banded thresholds later; softer wording (“check with your clinician”) |
| Merging timeline + measurements into **one** table is clearer than two styled lists | Likely | User wants two tables but one edit modal | Keep two sections; share edit chrome only |
| Money-style **edit modal** can update baby care + growth rows via existing APIs | Likely | APIs are create-only / sync-owned | Read-only table this pass, or thin update APIs in Design |
| Growth line charts / care-count chart can be **replaced or demoted** without blocking this idea | Open | User still wants weight/height charts on the same page | Keep growth charts behind expand; don’t let them compete with the two defaults |

## What we should not build

- Five charts all visible by default.
- Long medical essays on the primary view.
- Fake trends when the selected range has too little data (prefer empty / “need more logs”).
- A second edit UX that does not match Money’s modal feel.
- Scope creep into new capture event types unless a chart is impossible without them (call that out in Design instead of silent inventing).

## Success criteria

- [ ] Default primary UI shows **only** Hydration Monitor + **Night Rest** (short purpose / light alert allowed) — no always-on three-KPI strip or competing KPI cards.
- [ ] Night Rest shows usable night-duration signal from today’s schema; it is **never** labeled as efficiency %. Sleep Efficiency KPI stays soft empty until waking fragments exist.
- [ ] Three insight KPIs behave correctly (or honest empty states) from logged care data; the **full KPI strip** is behind expand / “More insights.”
- [ ] Five charts exist with **purpose / guidance** text each; light alerts for hydration (~6 wet/day) and loose stool share (>20%) when data supports them.
- [ ] Other three charts require an explicit expand / “More insights” action; legacy growth / care-count charts (if kept) also stay behind expand.
- [ ] Purpose themes show up in chart guidance (hydration/illness/constipation cues; wake windows / rhythm; feed–sleep association; nap-drop signs) without separate pages.
- [ ] One unified activity table covers care + measurements behind expand / **“Activity log”**; edit uses a Money-style modal; skeletons match; light + dark OK.
- [ ] Thin data shows soft empty / “need more logs,” not fake trends.
- [ ] Focused unit tests for KPI/chart derivations; e2e covers default-two-charts visibility, expand for more charts / Activity log, and open-edit-from-table happy path.
- [ ] No change required to Money; Baby capture unchanged unless Design proves a hard data gap.

## Open questions

1. **Default chart pair** — Confirmed: **Hydration Monitor + Night Rest** (duration proxy, not efficiency %). Switch only if user rejects this pair later.
2. **Legacy charts** — **Prefer:** keep weight/height/head/temp + care-count charts behind expand / “More insights” this pass (or remove from Insights). They must not compete with the two default charts on first glance.
3. **KPI strip** — **Settled:** full three-KPI strip behind expand / “More insights.” Default view = only the two charts (+ short purpose / light alert). No always-on KPI strip. Sleep Efficiency KPI soft-empty until wakings.
4. **Edit scope** — Which fields are editable in the modal (time, type, amounts, diaper contents, growth values)? Delete allowed?
5. **Data readiness** — **Settled for night:** ship Night Rest duration on today’s schema; keep true efficiency soft empty. Soft empty elsewhere when formula ml / stool texture thin.
6. **Overlap with `baby-insights-table-style`** — If that branch merges first, should this workflow only add edit + merge-into-one-table on top of its chrome? (Table still behind **Activity log** expand.)
7. **Wet-diaper threshold** — Keep fixed ~6/day for v1, or already plan age / feeding-method bands?
