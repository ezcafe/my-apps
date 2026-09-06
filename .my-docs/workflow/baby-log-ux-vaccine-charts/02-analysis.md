# Analysis: Baby log UX, vaccine, Insights charts

## What exists today

Baby Care already has capture (feed / sleep / diaper / measure), review (Insights with filters + KPIs + weight/height charts + timeline), and shell hamburger nav. Several Gate 1 outcomes are **behavior or chrome changes on existing surfaces**, plus one **new domain object** (vaccine list). No vaccine table, GraphQL, or UI exists yet.

| Area | Today | Key paths |
|------|--------|-----------|
| Feed form + client timer | Toggle Start/Stop on one button; method buttons save via GraphQL then **navigate `/baby`** | `components/baby-feed-form.tsx` |
| Sleep form | Start nap / End nap mutations; both use same navigate helper → **home** | `components/baby-sleep-form.tsx` |
| Diaper form | Save → home (unchanged this pass) | `components/baby-diaper-form.tsx` |
| Post-save navigate helper | Always `router.push("/baby")` after success | `lib/baby-care-save-navigate.ts` (+ `.test.ts`) |
| Insights dashboard | Period + care/growth chips + KPIs + **weight/height only** line charts + growth list + timeline | `components/baby-insights-dashboard.tsx` |
| Insights growth chips | Already a chip bar for all five kinds; charts ignore head/temp/med | `lib/baby-insights-filters.ts` |
| Timeline labels | Server `careSummary` + client shows `item.at` via `toLocaleString` | `features/baby/server/timeline.ts`, Insights list UI |
| Measure page | Kind via **`<Select>`**, not chips; CRUD growth | `components/baby-measure-page.tsx` |
| Growth chart primitive | Simple visx line in a Card (not Money chart-card chrome) | `components/baby-growth-chart.tsx`, `lib/baby-growth-series.ts` |
| Hamburger Baby items | Reuses Money glyph ids (`sleep`→`bills`, `diaper`→`import`, `measure`→`spending`) | `lib/app-section-nav.ts`, icons rendered in `components/money-section-tabs.tsx` |
| Schema / care types | Enums: feed / diaper / sleep; growth kinds: weight / height / head / temperature / medication | `db/schema/baby.ts`, migration `db/migrations/0037_baby.sql` |
| GraphQL + validators | Care + growth CRUD; timeline + growth list with `from`/`to` | `lib/graphql/baby-typeDefs.ts`, `lib/validators/baby.ts`, `features/baby/server/{care-events,growth,timeline}.ts` |
| i18n | EN/VI keys for feed timer, sleep, insights chips, summaries | `messages/baby/en.ts`, `vi.ts` |
| Skeletons | Insights + measure (+ feed/sleep pages via loading) | `components/baby-page-skeleton.tsx`, `app/(shell)/baby/**/loading.tsx` |
| E2E | Asserts feed/sleep save **land on home**; Insights chips; measure form | `e2e/baby-care.spec.ts` |

**Important data quirks for timeline copy**

- Feeds store **`payload.durationSec`** and usually **no `endedAt`** (`createBabyFeed` does not set it). `careSummary` still branches on `endedAt`, so most feed rows read like “Started feed …”.
- Sleep uses **`occurredAt` + `endedAt`**; open sleep is unique per baby (`baby_care_event_open_sleep_uq`).
- Insights timeline UI does **not** format a compact duration (`12m` / `1h 5m`) today; home “when” helpers (`lib/baby-format-care-when.ts`) are relative “last care” copy, not session duration.

## Dependencies

- **Same app / same Baby workspace** — no other repos. Baby GraphQL at `/api/graphql/baby` (`app/api/graphql/baby/route.ts`).
- **Vaccine = new persistence + API + UI list** — not a care-event type and not a growth kind (Gate 1). Expect migration + Drizzle table + validators + GraphQL + invalidate keys in `lib/baby-query-options.ts`.
- **Feed/sleep stay-on-page** touches navigate helper **and** e2e that currently expect home after save (`e2e/baby-care.spec.ts`). Diaper (and any other callers) must keep today’s navigate-home path.
- **Sleep Start disable** needs page-local or queried “open sleep” awareness (DB already enforces one open sleep).
- **Insights chart cards** should reuse Money **layout chrome** (`analytics-chart-card-shared`, `analytics-chart-layout`, card grid), not Money finance metrics. Prefer client aggregation from existing timeline/growth queries unless Design proves a new server series is required.
- **Parallel workflows (in-tree already):** `baby-insights-page` and `baby-pages-money-pattern` are at gate-merge but code is present. Gate 1: **design against current Baby UI**; collide-prone files include `baby-insights-dashboard.tsx`, `baby-page-skeleton.tsx`, `app-section-nav.ts`, measure/insights routes.
- **Telegram** vaccine parity is out of scope unless Design forces a tiny hook; bot commands stay feed/sleep/diaper/growth-oriented (`lib/baby-telegram/commands.ts`).
- **DESIGN_GUIDE + skeleton parity** mandatory on every changed surface (forms, chips, chart cards, vaccine list, nav icons).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `lib/baby-care-save-navigate.ts` | Today always navigates home; need stay-on-page for feed/sleep only (diaper keeps navigate). |
| `lib/baby-care-save-navigate.test.ts` | TDD entry for stay vs navigate branches. |
| `components/baby-feed-form.tsx` | Timer + method save; reshape Start disable / End reset; 3AM eye flow. |
| `components/baby-sleep-form.tsx` | Start/End mutations; stay on page; disable Start while open. |
| `components/baby-diaper-form.tsx` | Control: keep navigate-home. |
| `app/(shell)/baby/feed/page.tsx` + `loading.tsx` | Route + skeleton parity for form layout changes. |
| `app/(shell)/baby/sleep/page.tsx` + `loading.tsx` | Same for sleep. |
| `features/baby/server/timeline.ts` (`careSummary`, `BabyTimelineItem`) | Timeline label source; today method + started/ended strings. |
| `features/baby/server/timeline.test.ts` | Red-first tests for Feed (Breast L/R) + duration formatting helpers. |
| `components/baby-insights-dashboard.tsx` | Timeline row render (`summary` + `at`); growth chip bar already here; chart section to expand. |
| `lib/baby-insights-filters.ts` (+ tests) | Growth kind chip model + toggles — reuse/share with Measure. |
| `lib/money-quick-pick-chip-cls.ts` | Chip visual classes Insights already uses. |
| `components/baby-measure-page.tsx` | Replace kind `<Select>` with same growth chip bar. |
| `lib/baby-measure-list-state.ts` (+ tests) | Measure list empty/error/loading helpers. |
| `components/baby-page-skeleton.tsx` | `BabyInsightsPageSkeleton`, `BabyMeasurePageSkeleton` — keep CLS parity. |
| `components/baby-growth-chart.tsx` + `lib/baby-growth-series.ts` | Existing growth series mapping; may wrap or replace with Money-style cards. |
| `components/analytics-dashboard.tsx` | Money Insights stack order (filters → period → KPIs → **chart card grid**). |
| `components/analytics-chart-card-shared.tsx` | Chart card container / empty / loading chrome. |
| `components/analytics-chart-layout.ts` | Card height + grid tokens (`CHART_CARD_*`). |
| `components/analytics-chart-cards/monthly-columns-card.tsx` | Concrete Money-style card (visx/dynamic) to mirror structurally for care-count-over-time. |
| `components/loans-insights-dashboard.tsx` | Smaller feature Insights using shared chart chrome. |
| `components/money-analytics-skeleton.tsx` | Chart/KPI skeleton pieces Insights already imports. |
| `lib/app-section-nav.ts` (+ `.test.ts`) | Baby hamburger item list + **wrong** icon ids to replace. |
| `components/money-section-tabs.tsx` | `moneySectionTabIcons` map — add new dedicated Baby SVGs here (or extract shared icon module). |
| `components/icons/icon-baby.tsx` | Existing Baby glyph pattern for new SVGs. |
| `db/schema/baby.ts` (+ `db/schema/baby.test.ts`) | Care/growth enums/tables; **new vaccine table** lives beside these. |
| `db/migrations/0037_baby.sql` + `db/migrations/meta/_journal.json` | Migration style to follow for vaccine. |
| `lib/validators/baby.ts` (+ `.test.ts`) | Zod contracts; add vaccine create/list schemas. |
| `lib/graphql/baby-typeDefs.ts` | Extend Query/Mutation for vaccine. |
| `lib/graphql/baby-resolvers.ts` + `features/baby/server/care-events.ts` / `growth.ts` | Resolver + service patterns to copy for vaccine CRUD. |
| `lib/api-baby.ts` / `lib/baby-gql-client.ts` / `lib/baby-query-options.ts` | Client request + query keys + invalidation. |
| `lib/baby-format-care-when.ts` | Clock formatting reference only — **not** the duration format target. |
| `messages/baby/en.ts` + `vi.ts` | Summary / timer / insights strings to extend. |
| `e2e/baby-care.spec.ts` | Update stay-on-page expectations; add vaccine + chart + Measure chips coverage. |
| `docs/DESIGN_GUIDE.md` | Tokens, concentric radii, chart cards vs flat lists, skeleton parity. |
| `lib/shell-layout.ts` | `SHELL_FULL_SPAN` / `SHELL_DASHBOARD_STACK` used by forms. |

**Front-end local notes (qan):** `Work/Dev/HTML` empty; CSS tips reinforce concentric radii + `repeat(auto-fit, minmax(…))` (already matches DESIGN_GUIDE). No conflicting chip/timer recipes beyond that.

## Constraints and risks

- **Tribal: navigate helper is shared** — a naive “remove navigate” breaks diaper and e2e that assert home. Prefer an explicit stay vs navigate API used only by feed/sleep.
- **Tribal: feed has no real start/end row** — duration is client timer → `durationSec` on create. “Stop time only” on Insights must be defined from `endedAt` **or** `occurredAt` (+ optional duration), or labels stay wrong.
- **Tribal: sleep has no client timer** — Gate 1 “reset timer after End” maps to **re-enable Start** (and clear any local pending UI), not a ticking clock unless Design adds one.
- **Insights already has growth chips** — Measure is the gap; do not invent a second chip model.
- **Charts only weight/height today** — head/temp/med need numeric series rules (medication may be text-only → empty chart / skip).
- **Care-count over time** — no dedicated analytics API; Design should prefer aggregating loaded timeline/care data in range (honest, limited by page size) **or** a small server bucket query — call out tradeoff in Design.
- **Hamburger** — new dedicated SVGs; **vaccine adds a new hamburger capture item** (user chose Option C).
- **Icon map is Money-centric** — extending `AppSectionTabIconId` affects the shared type used by all sections; keep new ids Baby-specific and wire them in `money-section-tabs.tsx`.
- **Parallel merge risk** — Insights/Measure files are hot; rebase after other baby merges if needed.
- **CLS** — every chip bar / chart card / form reorder needs matching skeleton in the same change.
- **No fake metrics** — chart cards must bind to real care/growth (or vaccine) data.

## Settled decisions (do not relitigate)

1. **Feed/sleep:** after **Start**, stay on page, disable Start, show timer; after **End**, **redirect home**. Diaper keeps navigate-home on save.
2. **Vaccine:** separate list (not care type, not growth kind). Required: **name** + **dose** (first / second). Log-only; no schedule product. **UI:** `/baby/vaccines` + new hamburger item (Option C).
3. **Growth kind chip bar** on **both** Insights and Measure (Weight / Height / Head / Temperature / Medication).
4. **Charts:** more growth series + **care-count over time**, Money-style chart cards (layout chrome, not finance clones).
5. **Hamburger:** new **dedicated SVGs** per Baby menu item (including vaccine).
6. **Duration format:** compact **`12m` / `1h 5m`**.
7. **Baseline UI:** design/build against **current in-tree** Baby UI (no wait on other merges).
8. **Design:** Option A approved Gate 2 (client care-count + thin timeline fix).

## Blocking questions

*(None — vaccine placement settled as Option C, 2026-09-06.)*

---

*Front-end routing note: qan `Work/Dev/HTML` had no notes; CSS tips align with existing DESIGN_GUIDE (concentric radii, intrinsic grids). Context-mode MCP was unavailable (Node native module mismatch); analysis used repo files + direct qan folder read.*

**Are the instructions and reference files clear enough to design?** Yes — proceed to Design.