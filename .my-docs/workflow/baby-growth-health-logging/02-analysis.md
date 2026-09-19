# Analysis: Baby Growth + health logging

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows. Stay within artifact size caps.
**Updated:** 2026-09-18
**UI concept:** settled (`01b` + Gate A2 Option 1) — implement that IA; keep existing Insights date filter bar chrome (trim chips only).

## Deep dive (required)

### Overall

#### What is this?
Rename Measure capture to **Growth**, extend logging (med / vitamin / vaccine dose / pump express / temp+symptoms), keep Vaccines as schedule/read + deep link, and trim Insights to **date/time filters only** (same bar styles).

#### Why do we need this?
Parents need one write home for growth + health; wording already says Growth on Home while nav still says Measure. Skipping leaves split brain, thin health kinds, and noisy Insights chip chrome.

#### How to do this?
- Extend `baby_growth_kind` + Measure UI → Growth route; harden validators; reclaim `/baby/growth` after changing `next.config.ts` redirect.
- Vaccine doses: prefer Growth UI calling **existing vaccine APIs** (see Decision 2) so schedule data stays one table.
- Insights: omit `multiSelectFilters`; leave chip state empty (= all); update empty copy + skeleton `triggerCount`.
- **Other ways:** label-only rename (fails metric); dual vaccine write (Gate A rejected); redesign Insights bar (Gate A2 rejected).
- **Best practices:** repo — GraphQL + Zod + Drizzle enum like today’s growth CRUD; shared `InsightsDateRangeFiltersBar`; skeleton parity. Industry — one capture surface per habit; progressive disclosure for secondary fields.

### Solution pieces

#### 1. Measure → Growth rename / routing

##### What is this?
User-facing Measure → Growth (nav, headers, i18n, CTAs) and a stable capture URL after today’s `/baby/growth` → Insights permanent redirect.

##### Why do we need this?
Without a full rename + redirect plan, bookmarks and nav disagree; reclaiming `/baby/growth` without changing `next.config.ts` sends parents to Insights.

##### How to do this?
**Decision 1 — Capture URL**

- **Option 1 — Reclaim `/baby/growth` for capture; redirect `/baby/measure` → `/baby/growth`**
  - **What it is:** Move `app/(shell)/baby/measure` → `growth`; remove Insights redirect for `/baby/growth`; add Measure→Growth redirect.
  - **Example:** Nav `href: "/baby/growth"`; `next.config` `{ source: "/baby/measure", destination: "/baby/growth", permanent: true }`.
  - **Pros:** URL matches product language; success criteria “route shows Growth”.
  - **Cons:** Touches redirects, e2e (`/baby/measure`, `/baby/growth` today), header matcher, tests that assert no `/baby/growth` nav item.
- **Option 2 — Keep `/baby/measure` URL; rename labels only**
  - **What it is:** Labels say Growth; path stays measure.
  - **Example:** Nav label “Growth”, `href` still `/baby/measure`.
  - **Pros:** Fewer redirect/e2e changes.
  - **Cons:** Path still says measure; fights Outcome wording.
- **Recommendation:** **Option 1** — matches Outcome + skim hard constraint #1.

Also: EN/VI keys (`measure.*` → Growth copy or alias), `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, Insights CTA `/baby/measure` → Growth, skeletons rename with parity.

#### 2. Extending growth kinds (med / vitamin / pump / temp+symptoms)

##### What is this?
New/extended kinds on Growth capture: vitamin, pump (amount+time), symptoms with optional temp; med **name required**; keep weight/height/head/temp/medication.

##### Why do we need this?
Enum today is only `weight|height|head|temperature|medication`. UI-only kinds will fail Zod/GraphQL. Med form today sends `valueNum`/`unit` only — **never `valueText`** — so named meds need a real field mapping.

##### How to do this?
- **Approach:** Widen `baby_growth_kind` enum + Zod + GraphQL; Growth kind chips match `01b`; map fields: measures → `valueNum`+`unit`; med/vitamin → **`valueText` = name** (required) + optional `valueNum` amount; pump → `valueNum` amount + unit (e.g. ml) + `recordedAt`; temp+symptoms → optional `valueNum` °C + structured symptom list (Decision 3).
- **Other ways:** Stuff everything into `notes` free text (hard to edit/filter); separate tables per kind (overbuilt this pass).
- **Best practices:** Repo already has `valueText`/`notes` on `baby_growth_entry` — reuse before new columns. Kind-first form like `baby-measure-page.tsx`.

**Decision 3 — Symptom storage**

- **Option 1 — `valueText` or `notes` as stable JSON / delimited ids** (e.g. `notes` JSON `{ "symptoms": ["cough",…] }` or ordered ids in `valueText`)
  - **Example:** Save symptoms-only: `kind: "temperature"`, `valueNum` null, `notes: '{"symptoms":["rash"]}'` — or add kind `symptoms` if Design prefers split.
  - **Pros:** No schema column; edit/delete stays one growth row.
  - **Cons:** Must version the string format; charts ignore non-numeric.
- **Option 2 — New `jsonb` payload column on `baby_growth_entry`**
  - **Example:** `payload: { symptoms: [...] }`.
  - **Pros:** Clean typed shape.
  - **Cons:** Migration + GraphQL surface; heavier for this pass.
- **Recommendation:** **Option 1** for this pass (temp stays `temperature` kind; symptoms ride along). Confirm exact kind label vs `temperature` in Design if UI chip says “Temp + symptoms”.

Vitamin = new enum value `vitamin` (not overload `medication`). Pump = new `pump` (not Feed `method: "pump"`).

#### 3. Vaccine write-home vs existing vaccine APIs

##### What is this?
Gate A: dose **write** on Growth; Vaccines page = schedule/read + deep link. Today doses live in `baby_vaccine_entry` with full CRUD UI on `/baby/vaccines`.

##### Why do we need this?
Ignoring the table creates dual histories or breaks schedule. Ignoring the lock leaves two write homes.

##### How to do this?
**Decision 2 — Vaccine data plane**

- **Option 1 — Growth UI facade over existing vaccine GraphQL**
  - **What it is:** Growth vaccine kind calls `createBabyVaccine` / update / delete; Vaccines page drops create form, lists + “Log dose on Growth” link (`?kind=vaccine` or similar).
  - **Example:** Growth Save (vaccine) → same mutation Vaccines uses today; Recent merges vaccine rows by `administeredAt` or shows linked section.
  - **Pros:** One durable table; schedule/read stays accurate; no data migration.
  - **Cons:** Growth Recent must merge two sources; e2e “vaccine create on /vaccines” moves.
- **Option 2 — New growth kind `vaccine` in `baby_growth_entry` only**
  - **What it is:** Stop writing `baby_vaccine_entry` for new doses (or migrate).
  - **Example:** `kind: "vaccine"`, `valueText: "Hexaxim"`, dose in notes.
  - **Pros:** One list API on Growth.
  - **Cons:** Breaks / orphans Vaccines schedule table; loses first/second dose enum unless reimplemented; migration risk.
- **Recommendation:** **Option 1** — honors write-home lock without abandoning vaccine schema. Design must specify Recent merge + dose first/second fields on Growth form (vaccine API still requires `name` + `dose`).

#### 4. Insights filter trim (date-only; keep bar styles)

##### What is this?
Remove care-type / growth-kind FilterMenu from Insights only; keep `InsightsDateRangeFiltersBar` + period chip chrome as today (Gate A2).

##### Why do we need this?
Chip chrome fights date-range review. Restyling the bar would violate Gate A2.

##### How to do this?
- **Approach:** Pass `multiSelectFilters={[]}` (default); force applied chips empty so helpers show all; empty/error copy → date range only; skeleton `MoneyAnalyticsFiltersBarSkeleton triggerCount={1}` (was 2); period chip `activeFilters` without care/kind labels.
- **Other ways:** Hide chips under “More” (idea allowed as fallback — not needed if date-only locked); trim Activities too (out of scope — keep Activities chips per Non-goals).
- **Best practices:** Same bar component as Investments/Loans date-only; empty chip selection already means “all” in `lib/baby-insights-filters.ts`.

#### 5. Activities / Home / nav copy coherence

##### What is this?
Rename Measure cues to Growth; leave Activities ledger + chip filters as-is except Growth wording in summaries/empty copy where they still say “measurement”.

##### Why do we need this?
Half-rename (Home “Growth & meds” vs nav “Log measurement”) is the stated risk.

##### How to do this?
- **Approach:** i18n + nav/header/Insights CTA; Activities filter chrome **unchanged**; edit/delete growth rows still work for new kinds via existing growth mutations where applicable.
- **Other ways:** Strip Activities chips too — rejected by Non-goals this pass.
- **Best practices:** Match `baby-activities-page` copy keys; don’t fork filter helpers.

## What exists today

Baby capture is `/baby/measure` (`BabyMeasurePage`) over `baby_growth_entry` (5 kinds). Vaccines are a separate CRUD table/UI. Insights + Activities share care/growth chips via `InsightsDateRangeFiltersBar`; `next.config.ts` permanently sends `/baby/growth` → Insights. Feed `pump` = fed expressed milk, not express volume.

## Dependencies

- Schema/enum migration + Zod + GraphQL for new kinds; e2e (`baby-care.spec.ts` measure, vaccines, Insights chips, `/baby/growth` redirect).
- Vaccines page write UI removal vs Growth facade (Decision 2).
- Skeleton parity Growth + Insights; EN+VI messages.
- Activities keeps chips → shared filter helpers stay; Insights stops using them in UI.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `next.config.ts` | `/baby/growth` → Insights redirect must change |
| `db/schema/baby.ts` | `babyGrowthKindEnum`, `babyGrowthEntry`, `babyVaccineEntry` |
| `lib/validators/baby.ts` + `features/baby/server/growth.ts` / `vaccines.ts` | CRUD contracts |
| `components/baby-measure-page.tsx` | Rename/extend capture UI |
| `components/baby-insights-dashboard.tsx` | Date bar; omit multiSelect |
| `components/baby-vaccines-page.tsx` | Schedule/read + deep link |
| `lib/baby-insights-filters.ts` | Empty chips = all |
| `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, `messages/baby/{en,vi}.ts` | Growth labels |
| `components/baby-page-skeleton.tsx` | CLS after trim/rename |
| `e2e/baby-care.spec.ts` | Measure, vaccines, Insights/Activities filters |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Kind chips + form + recent list | `baby-measure-page.tsx` | Primary Growth surface (`01b`) |
| `InsightsDateRangeFiltersBar` | `analytics-filters.tsx` | Date-only without restyle |
| Vaccine mutations | `baby-vaccines-page.tsx` / GraphQL | Facade for Growth dose write |
| Growth CRUD server | `features/baby/server/growth.ts` | Same parse → insert pattern |
| Empty chips = all | `baby-insights-filters.ts` | Safe after UI trim |

## Constraints and risks

- Hard: reclaim `/baby/growth` only after redirect rewrite; Feed pump ≠ Growth pump; tokens + skeleton parity.
- Risk: dual vaccine write if Vaccines form left live; Growth Recent incomplete if vaccine rows not merged (Option 1).
- Risk: Insights charts that keyed visibility off selected growth chips — with empty chips, all charts show (desired).
- Risk: med/vitamin saves without `valueText` name (current Measure UI gap).

## Settled decisions (do not relitigate)

- Gate A: Growth sole write home for dose / pump / meds / symptoms; Vaccines schedule/read + deep link; pump = amount+time; symptoms ± temp; med/vitamin name required.
- Gate A2: Option 1 look; **keep existing Insights filter bar styles** — remove care/growth chips only.
- `01b` IA: kind picker + Save + Recent; Insights date → Apply only.
- Activities: no chip trim this pass (label coherence only).
- Non-goals: clinical AI, Feed home redesign, per-symptom Insights charts.

## Spike notes (optional)

Throwaway exploration (read-only code) — not production Build.

| Spike | What / Why / How summary | Finding | Keep or discard |
|-------|--------------------------|---------|-----------------|
| Route conflict | What: `/baby/growth` URL. Why: rename. How: read `next.config.ts` | Permanent redirect to Insights today | **Keep** — Decision 1 |
| Vaccine plane | What: where doses live. Why: write-home lock. How: schema + vaccines page | Full CRUD on `baby_vaccine_entry`; e2e creates on `/baby/vaccines` | **Keep** — prefer Decision 2 Option 1 |
| Med name field | What: name required. Why: Gate A. How: Measure save path | UI never sends `valueText` | **Keep** — wire name → `valueText` |
| Insights bar API | What: date-only trim. Why: Gate A2. How: read filter bar | `multiSelectFilters` defaults `[]`; skeleton `triggerCount={2}` | **Keep** — omit filters; drop trigger to 1 |
| Chip semantics | What: after trim. Why: charts/lists. How: filters helpers | Empty care/growth arrays = show all | **Keep** |

## Blocking questions

**Settled (Option 1)** — locked in Analyze Q&A → Design locks in `03-design.md` (D2–D7). Do not re-open.

| # | Was | Settled as |
|---|-----|------------|
| 1 | Vaccine data plane | **D3 Option 1** — Growth UI facade over existing vaccine GraphQL |
| 2 | first/second dose | **D4 Option 1** — required on Growth vaccine form (same as today’s API) |
| 3 | Symptom storage | **D5 Option 1** — structured `notes` JSON (`v:1`); no jsonb column |
| 4 | Recent + vaccines | **D6 Option 1** — merge vaccine doses into Growth Recent this pass |
| 5 | Temp+symptoms chip | **D7 Option 1** — one `temperature` kind/chip (not separate symptoms kind) |

Also locked with D2: reclaim `/baby/growth` (Analyze Decision 1 Option 1).

---

**Clarity check:** Settled. Design owns packaging (Decision 1 Option 1) + contracts.
