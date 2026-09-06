# Analysis: Baby Insights page (merge Growth + Timeline)

## What exists today

Baby Care already has two **review** surfaces and three **capture** surfaces. Growth and Timeline are separate routes with separate nav items; Home only links to feed / sleep / diaper.

**Money Insights** (the pattern to follow) is a full-span stack: filter toolbar → period chip → KPI strip → chart grid, with matching skeletons. **Loans / Investments Insights** reuse the same chrome but with a **date-only** filter bar (`InsightsDateRangeFiltersBar`) — closer to what Baby can honestly fill without inventing ledger filters.

| Area | Today | Key paths |
|------|--------|-----------|
| Money Insights route | Prefetch + Suspense + `AnalyticsDashboard` | `app/(shell)/money/(tabs)/insights/page.tsx`, `loading.tsx` |
| Money Insights UI | Filters, period chip, KPIs, chart grid | `components/analytics-dashboard.tsx`, `analytics-filters.tsx`, `analytics-period-chip.tsx`, `analytics-stats.tsx`, `money-analytics-skeleton.tsx` |
| Feature Insights (lighter) | Date range + KPIs + charts | `components/loans-insights-dashboard.tsx`, `app/(shell)/loans/insights/` |
| Baby Growth | Chart + list + **inline add/edit/delete** | `app/(shell)/baby/growth/`, `components/baby-growth-page.tsx`, `baby-growth-chart.tsx` |
| Baby Timeline | **Today-only** care+growth list, infinite scroll + auto-sync | `app/(shell)/baby/timeline/`, `components/baby-timeline.tsx` |
| Baby Home | Last-care status + log CTAs (no growth) | `components/baby-home.tsx`, `lib/baby-home-actions.ts` |
| Baby section nav | Home, Timeline, Growth & meds, capture ×3, Settings | `lib/app-section-nav.ts` (`baby.items`) |
| Headers / crumbs | Path → title keys for growth & timeline | `lib/baby-app-header.ts` |
| GraphQL | `babyTimeline(from,to,…)`, `babyGrowthEntries(kind,…)` + CRUD mutations | `lib/graphql/baby-typeDefs.ts`, `features/baby/server/timeline.ts`, `growth.ts` |
| Client queries | Infinite timeline/growth keys + invalidation | `lib/baby-query-options.ts` |
| i18n | `timeline.*`, `growth.*` EN/VI | `messages/baby/en.ts`, `vi.ts` |
| Skeletons | Timeline + growth page/chart | `components/baby-page-skeleton.tsx` |
| Redirects elsewhere | `next.config` permanent redirects + thin `redirect()` pages | `next.config.ts`, e.g. `app/(shell)/analytics/page.tsx` → `/money/insights` |
| E2E | Growth nav + add form; **no dedicated timeline page test** | `e2e/baby-care.spec.ts` |

**API gap (important for Design):** Timeline already accepts `from` / `to`. Growth list accepts **kind + cursor only** — no date range on the server. UI timeline hardcodes **today** (`dayBoundsIso`). Shared “this month” filter needs Design to choose: extend growth GraphQL with `from`/`to`, or filter client-side after paging (weaker).

## Dependencies

- **Same app / same Baby workspace** — no other repos. Baby GraphQL at `/api/graphql/baby`.
- **Nav + tests** must move together: `lib/app-section-nav.ts` (+ test), `lib/baby-app-header.ts` (+ test), i18n keys, e2e growth menu test.
- **baby-pages-money-pattern** may still be merging layout polish (shell tokens, home status). Gate 1 says **design against current Baby UI** — coordinate only if mid-flight diffs collide on the same files (`baby-home`, growth/timeline components, skeletons). Prefer rebase later over waiting.
- **Capture routes** (feed / sleep / diaper), Telegram, settings locale — stay out of scope except where growth **write** UI relocates.
- **Redirects** for `/baby/growth` and `/baby/timeline` → `/baby/insights` should mirror Money’s analytics→insights pattern (`next.config.ts` and/or thin redirect pages).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/analytics-dashboard.tsx` | Full Money Insights stack order (filters → chip → KPIs → charts). |
| `components/analytics-filters.tsx` (`InsightsDateRangeFiltersBar`) | Date Apply/Reset chrome used by Loans/Investments — best Baby filter starting point. |
| `components/analytics-period-chip.tsx` | “Showing {period} · filters” read-only chip. |
| `components/analytics-stats.tsx` + Loans KPIs in `loans-insights-dashboard.tsx` | KPI strip pattern (Cards + `AnimatedNumber`). |
| `components/money-analytics-skeleton.tsx` (`FeatureInsightsPageSkeleton`, filter/KPI/chart skeletons) | Skeleton parity for insights chrome. |
| `app/(shell)/money/(tabs)/insights/page.tsx` + `loading.tsx` | Route + Suspense wiring. |
| `app/(shell)/loans/insights/page.tsx` + `components/loans-insights-dashboard.tsx` | Smaller feature Insights page to copy structurally. |
| `lib/analytics-default-filters.ts` | **This calendar month** default (`fromDate`/`toDate`) — match Baby default period. |
| `lib/shell-layout.ts` | `SHELL_FULL_SPAN` + `SHELL_DASHBOARD_STACK` (current Baby/Money body tokens). |
| `components/baby-growth-page.tsx` + `baby-growth-chart.tsx` | View pieces to split: chart/list (Insights) vs form CRUD (elsewhere). |
| `components/baby-timeline.tsx` | List + sync + load-more; change day bounds → shared period. |
| `components/baby-page-skeleton.tsx` | Existing growth/timeline skeletons to merge into Insights skeleton. |
| `lib/baby-query-options.ts` | Query keys, fetchers, invalidation scopes. |
| `lib/graphql/baby-typeDefs.ts` + `features/baby/server/{timeline,growth}.ts` | Contracts; growth may need `from`/`to`. |
| `lib/validators/baby.ts` | `babyTimelineInputSchema` / `babyGrowthListInputSchema`. |
| `lib/app-section-nav.ts` + `lib/app-section-nav.test.ts` | Replace Timeline + Growth with one Insights item. |
| `lib/baby-app-header.ts` + `lib/baby-app-header.test.ts` | Path → title/crumbs for `/baby/insights`. |
| `messages/baby/en.ts` + `vi.ts` | Nav + page copy (`insights.*`). |
| `next.config.ts` (`redirects`) | Permanent redirects for old Baby URLs. |
| `e2e/baby-care.spec.ts` | Update growth test; add Insights + redirect coverage. |
| `docs/DESIGN_GUIDE.md` | Cards for charts/KPIs; flat list for timeline; tokens; skeleton parity. |

## Constraints and risks

- **Honest KPIs only** — Baby has no spend ledger. Do not invent finance-style metrics. Soft Design pick: counts (feeds / diapers / sleep sessions), latest weight/height in range, or omit empty KPI slots rather than fake numbers.
- **“Full Money Insights” ≠ copy Money’s five ledger filters** — Accounts/categories/merchants do not exist on Baby. Chrome order yes; filter *content* must be Baby-real (date + maybe care type / growth kind). Loans’ date-only bar is the closest shipped sibling.
- **Growth has no server date filter today** — shared period for charts is either a small API extension or fragile client filter on infinite pages.
- **Timeline today = calendar day** — Insights default = **this month** changes empty-state copy, sync behavior, and load volume; keep auto-sync first-page refresh but keyed to applied range.
- **View-only Insights** — remove create/update/delete UI from the merged page; mutations stay in GraphQL for the new write surface.
- **Nav icon reuse** — Timeline used `spending`, Growth `analytics`; Insights should pick one (likely `analytics`) so the menu stays scannable.
- **CLS** — new Insights skeleton must mirror filters → chip → KPIs → growth charts → timeline list in the same order as live UI.
- **Parallel workflow risk** — baby-pages-money-pattern touches growth/timeline/home; expect merge conflicts, not product waits.
- **Local HTML/CSS/JS notes (qan)** — context-mode lookup failed this run (Node native module mismatch). Analysis is grounded in this repo’s Money/Loans Insights + DESIGN_GUIDE instead.

## Settled decisions (do not relitigate)

From Gate 1 (2026-09-06), locked in `01-idea.md`:

1. Full Money Insights **pattern** (period chip, filters, KPI strip, chart grid) — adapted to Baby data, not Money ledger fields.
2. Section order: **Growth first**, then **timeline**; both follow shared filter; default period = **this month**.
3. Insights is **view-only**; growth add/edit moves elsewhere (placement = Design soft pick).
4. Route **`/baby/insights`**; **remove** `/baby/growth` and `/baby/timeline` (redirects OK for bookmarks).
5. One **Insights** nav item replaces Timeline and Growth & meds.
6. Design/build against **current** Baby UI; do not wait for baby-pages-money-pattern Gate 3.

## Soft picks for Design (not blocking)

### Where growth add/edit lives (required product hole; Design chooses)

**Option A — New capture route (like feed/sleep/diaper)**  
**What it is:** Dedicated write page, e.g. `/baby/measure` or `/baby/log-growth`, linked from Home + section nav under capture.  
**Example:** Home CTA “Log growth” → form → save → back `/baby` (same post-save habit as care forms).  
**Pros:** Matches existing capture pattern; Insights stays clean; bookmarks for “add” are clear.  
**Cons:** Extra nav item (or Home-only CTA); one more route/skeleton.  
**Recommendation lean:** Strong default if caregivers add growth often.

**Option B — Home-only form section / modal**  
**What it is:** Add/edit UI on Home (expand or sheet); no separate route.  
**Example:** Home status strip → “Add measurement” opens inline Field form.  
**Pros:** Fewer routes; review stays on Insights.  
**Cons:** Home mixes status + write; edit-from-list harder (no growth list on Home).  
**Recommendation lean:** Only if growth writes are rare.

**Option C — Settings subsection**  
**What it is:** Growth CRUD under `/baby/settings`.  
**Example:** Settings → “Growth & meds” section with form + recent list.  
**Pros:** Keeps browse nav thin.  
**Cons:** Settings is configure, not daily capture; worse for tired caregivers.  
**Recommendation lean:** Weak for primary add path.

**Option D — Capture route + edit deep-link from Insights list (read-only links out)**  
**What it is:** Insights shows measurements without editors; “Edit” navigates to capture route with `?id=`.  
**Example:** `/baby/measure?id=…` loads update form.  
**Pros:** View/write split is clear; still one write home.  
**Cons:** Slightly more routing/query wiring.  
**Recommendation lean:** Best if Option A is chosen and edit must remain reachable.

### How “full Insights” filters map to Baby

**Option A — Date range only** (reuse `InsightsDateRangeFiltersBar`) — closest to Loans/Investments.  
**Option B — Date + care/growth kind chips** — still honest filters; more UI work.  
Design should pick; neither reopens Gate 1.

### Growth date filter implementation

**Option A — Extend `babyGrowthEntries` with `from`/`to`** (preferred if charts must honor month exactly).  
**Option B — Client filter after fetch** (faster ship; wrong for long history / pagination).

### Redirect style

**Option A — `next.config.ts` permanent redirects** (Money analytics→insights style).  
**Option B — Thin `page.tsx` `redirect()` stubs** (Money analysis→insights style).  
Either is fine; A is enough for static path moves.

## Settled soft picks (user — 2026-09-06)

1. **Growth write home:** **A** — new capture route (like feed/sleep/diaper). Design may still add edit via that route (list/edit on capture page); Insights stays view-only.
2. **Filter depth:** **B** — date range **plus** care/growth kind chips.
3. **Growth date filter:** **A** — extend `babyGrowthEntries` with `from`/`to`.
4. **Redirects:** Follow **Money’s current pattern** — `next.config.ts` permanent redirects for path renames (like `/money/analytics` → `/money/insights`); thin `redirect()` pages only if Money-style leftovers need them.

## Blocking questions

None that block Design. Soft picks locked above.

---

*Analyze complete 2026-09-06. Soft picks locked. Ready for Design.*
