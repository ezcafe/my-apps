# Review log: baby-insights-page

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `features/baby/server/growth.ts:30-42` · `features/baby/server/growth.test.ts:45-61` | Growth range “server” coverage is a **dead parallel helper**. `filterBabyGrowthByRecordedRange` is only used in tests; `listBabyGrowthEntries` applies real `gte`/`lte` separately and is never exercised. Dropping the SQL range filters still leaves unit tests green. Task 1 acceptance (“server applies gte/lte”) is not protected — classic mock theater. Prefer asserting the real list path (integration) or sharing one condition builder that both production and tests use. | fixed |
| Major | `lib/baby-query-options.test.ts` (growth keys only; ~L23–33) | Task 2/9: **timeline** query keys with non-empty `from`/`to` are not tested. Insights caches on `babyKeys.timeline(bounds.from, bounds.to)` and sync refreshes that key. Only empty-bounds last-care (`"", ""`) is asserted. A regression that drops range from timeline keys would collide month caches and would not fail today’s suite. | fixed |
| Major | `e2e/baby-care.spec.ts:136-152` | Insights smoke is named “shows filters …” but only checks Growth/Timeline headings. No Apply / Reset / date inputs / period chip. Success criteria + Task 8 **view-only** (no Add entry / edit / delete on Insights) is unasserted — editors could return and e2e would still pass. False confidence vs Tasks 7–8 / 12 and idea success criteria. | fixed |
| Enhancement | `lib/baby-insights-filters.test.ts` | Option A chip rules incomplete: no empty `growthKinds` → all rows; no `toggleBabyInsightsGrowthChip`; `babyInsightsFiltersDirty` never covers **growthKinds** dirty; no case that care chips alone leave growth rows unfiltered (independence rule that prevents “Feed wipes charts”). | fixed |
| Enhancement | `lib/baby-insights-kpis.test.ts` | Missing failure modes: skip weight rows with `valueNum: null`; newest-first when multiple weights; care chip filter must not clear `latestWeight`. | fixed |
| Enhancement | `lib/graphql/baby-yoga.test.ts` · `lib/baby-query-options.test.ts` | Task 2 left GraphQL/`from`/`to` wiring thin: no smoke that `babyGrowthEntries` schema/args accept `from`/`to`, and no assertion that growth fetch/query document passes those variables (only cache key shape for growth). | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx:158-215` · `lib/baby-query-options.test.ts:51-74` | **Re-review (new):** Insights **request** `from`/`to` still unprotected. Suite asserts `babyKeys.*`, GraphQL document `$from`/`$to`, and `baby*QueryOptions` queryKey — but app Insights **never calls** `babyGrowthQueryOptions` / `babyTimelineQueryOptions` (only tests do). Live path inlines `fetchBaby*Page({ from: bounds… })` + sync tick. Dropping `from`/`to` from those `queryFn`s (or sync) keeps keys/document/e2e chrome green while the month chip labels unbounded data. Need a fetch-args / GraphQL-variable assertion on the real Insights path (or stop testing unused wrappers and spy `fetchBaby*Page` / route). | fixed |
| Nit | `features/baby/server/growth.test.ts:14-42` vs `lib/validators/baby.test.ts:105-145` | Duplicate `babyGrowthListInputSchema` from/to tests in two files — fine for safety, but the growth file label reads like server coverage while it only re-parses the schema. | open |
| Nit | `e2e/baby-care.spec.ts:147-170` | Insights e2e branches on `applyDesktop.isVisible()` (desktop vs sheet). Can race before chrome settles; prefer viewport fixture or `toPass` before branch. | open |
| Nit | `e2e/baby-care.spec.ts:136-189` | Option A shared kind chips (Feed / Weight / Kinds region) still unasserted in e2e; filter helpers cover logic only. | open |
| FYI | Task 4 redirects | No `next.config` unit test in repo (task allowed e2e). `e2e/baby-care.spec.ts:191-197` covers URL land on Insights; does not assert permanent status codes. Acceptable for this pass. | open |
| FYI | `features/baby/server/growth.ts:157` · growth.test | Shared `babyGrowthRecordedAtRangeConds` is real and used by list (Round-1 Major fix OK). Still no assertion that `listBabyGrowthEntries` spreads those conds — removing the one `conds.push(...range)` line stays green. Integration optional. | open |

**Round notes:**

- Round 1 (2026-09-06) — Adversarial test review (Verifier). Mapped new/changed tests to `04-tasks.md` Option A (shared date + chips Apply; growth `from`/`to`; Insights view-only; Measure writes).
- Helpers that are real and useful: default range (injected `Date`), filter dirty for care+date, timeline care-chip keep-growth, KPI empty/care filter, nav/header/home Measure CTA, measure save e2e (auth), redirects e2e.
- Gaps cluster on (1) range filter not tied to production list, (2) Insights timeline cache key, (3) shallow Insights e2e vs product invariants.

- Fix round 1 (2026-09-06) — Senior Developer Fix (adversarial-tests). Shared `babyGrowthRecordedAtRangeBounds` / `babyGrowthRecordedAtRangeConds` used by `listBabyGrowthEntries`; removed dead `filterBabyGrowthByRecordedRange`. Added timeline key + `babyTimelineQueryOptions` from/to tests; Insights e2e Apply/Reset/date/period + view-only; filters/KPI edge cases; yoga schema validate + `BABY_GROWTH_ENTRIES_QUERY` wiring smoke.
- **Verdict after Fix:** awaiting Verifier re-run of adversarial-tests lens (Fix does not self-approve).

- Round 2 re-review (2026-09-06) — Adversarial Verifier after Fix round 1.
  - **Prior Major ×3:** confirmed fixed (not theater). Growth: production `listBabyGrowthEntries` calls `babyGrowthRecordedAtRangeConds`; tests assert bounds + drizzle `gte`/`lte` equality. Timeline: `babyKeys.timeline` + queryOptions key with non-empty bounds. E2E: filters region, Apply/Reset (desktop/sheet), from/to radiogroups, Showing period text, view-only add/edit/delete count 0.
  - **Prior Enhancement ×3:** confirmed fixed. Filters: empty growthKinds, toggle growth, dirty growthKinds, care/growth independence. KPIs: null `valueNum`, newest-first, care filter keeps weight. GraphQL: yoga validate accepts `from`/`to`; document regex + growth queryKey.
  - **New Enhancement ×1:** Insights live fetch/sync still can drop `from`/`to` without failing tests (unused `*QueryOptions` wrappers vs inline dashboard fetch).
  - Nit/FYI only otherwise (chips e2e, e2e branch race, list-spread residual, redirects).

- Fix round 2 (2026-09-06) — Senior Developer Fix (adversarial-tests Enhancement). Extracted `buildBabyInsightsQueryFns(bounds)` used by Insights dashboard for timeline/growth infinite `queryFn`s + sync first-page fetch + query keys. Unit test injects mock fetchers and asserts applied `from`/`to` on all three call sites (TDD: red → green). Nit/FYI left open.
- **Verdict after Fix:** awaiting Verifier re-run of adversarial-tests lens (Fix does not self-approve). Enhancement marked fixed in table; Nit/FYI remain open.

- Round 3 re-review (2026-09-06) — Adversarial Verifier after Fix round 2.
  - **Prior Enhancement (Insights request from/to):** confirmed fixed (not theater).
    - Production: `components/baby-insights-dashboard.tsx` builds `insightsFns` via `buildBabyInsightsQueryFns(bounds)` and wires infinite `queryKey`/`queryFn` + sync `syncTimelineFirstPage` from that object only (no leftover inline `fetchBaby*Page({ from: bounds… })`).
    - Helper: `lib/baby-query-options.ts` `buildBabyInsightsQueryFns` always passes `bounds.from` / `bounds.to` into timeline, growth, and sync fetch calls.
    - Tests: `lib/baby-query-options.test.ts` injects mock fetchers and asserts `from`/`to` (plus cursor/limit) on timelineQueryFn, growthQueryFn, and syncTimelineFirstPage. Dropping bounds from any of those three sites fails the suite.
  - **New Critical / Major / Enhancement:** none found on this pass.
  - **Nit/FYI:** unchanged (still open; do not block this lens).
  - **Verdict:** Adversarial test review: clean.
---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-page-skeleton.tsx` `BabyInsightsPageSkeleton` vs `components/baby-insights-dashboard.tsx` | **Skeleton parity / CLS** fails DESIGN_GUIDE + Task 7. Live stack is AboutDisclosure → `InsightsDateRangeFiltersBar` (mobile Filter + desktop toolbar) → shared chips → period → **Card** KPIs → growth heading+CTA → charts → growth list → timeline heading → timeline list. Skeleton is flat `h-12` filter (not `MoneyAnalyticsFiltersBarSkeleton`), bare KPI blocks (no Card), no About/growth heading/CTA, and one list after charts (growth + timeline conflated). Chip shell is close; the rest will jump on load. | fixed |
| Major | `components/baby-measure-page.tsx` (list empty branch) | While `growthQuery.isLoading`, `entries` is `[]` so UI shows `growth.noData` (“No data yet”) then fills — **false empty**. Task 5 / DESIGN_GUIDE: loading is not empty; keep route/in-page skeleton until settled. | fixed |
| Major | `BabyMeasurePageSkeleton` vs `baby-measure-page.tsx` list rows | Live rows are text + **Edit/Delete** buttons; skeleton is heading + plain full-width bars only. Action cluster missing → CLS when Measure list loads. | fixed |
| Major | `baby-insights-dashboard.tsx` growth query error path | Timeline has `timelineQuery.isError` → `timeline.loadError`. **Growth has no `growthQuery.isError` UI** — failed growth looks like empty charts/list (`insights.emptyGrowth`). Misleading vs honest empty. | fixed |
| Major | Task 11 i18n · `AnalyticsPeriodChip` + `InsightsDateRangeFiltersBar` vs `messages/baby/{en,vi}.ts` | Baby ships VI locale, but period chip (“Showing…”, “Apply to update”) and date Apply/Reset stay **hardcoded English** from shared Money chrome. Keys `insights.periodThisMonth` / `insights.apply` / `insights.reset` / `insights.chipAll` exist and are unused. Task 11 “period chip” + “no raw English in new UI” not met for filter chrome (KPIs/headings are localized). | fixed |
| Major | Option A + mobile filter chrome · `baby-insights-dashboard.tsx` chips vs `InsightsDateRangeFiltersBar` | Shared kind chips sit **outside** the mobile Filter sheet; **Apply lives only inside** that sheet (desktop Apply is in the toolbar). Chip-only dirty state shows “Apply to update” but narrow viewports must open the date Filter modal to commit — awkward Option A “date + chips Apply together” path. | fixed |
| Major | `components/baby-measure-page.tsx` · `lib/baby-measure-list-state.ts` | **Re-review (new):** Measure list still **false-empty on error**. `babyMeasureListState` only knows loading/empty/ready (`isLoading` + `entryCount`). On `growthQuery.isError` with no pages, UI shows `growth.noData` (“No data yet”) — same honesty bug Insights growth had, on the write surface where caregivers may add duplicates. Need error branch (or extend list state with `isError`) + copy like `growth` load error. | fixed |
| Enhancement | `BabyTimelineSkeleton`, `BabyGrowthPageSkeleton`; empty `app/(shell)/baby/growth/` + `timeline/` dirs | Task 10 leftovers: unused skeleton exports and empty route folders after page delete. Ask before deleting. | fixed |
| Enhancement | Insights growth `useInfiniteQuery` | Timeline has Load more; growth never `fetchNextPage` — charts/list capped at first page (~50). Fine for light months; heavy ranges can under-plot. | fixed |
| Enhancement | `baby-insights-dashboard.tsx` growth Load more vs list | **Re-review (new):** Growth now calls `fetchNextPage` (prior Enhancement fixed for charts), but the growth list still renders `filteredGrowth.slice(0, 8)` only. Timeline Load more extends the list; growth Load more updates charts/pages while the list stays eight rows — easy to think Apply/Load did nothing. Align list with pages or rename/clarify preview. | fixed |
| Nit | KPI `sm:text-3xl` in Insights | Matches Loans KPI type scale; DESIGN_GUIDE prefers no content breakpoints (`auto-fit` / tokens). Pref-only if keeping feature Insights parity. | open |
| Nit | Chip Apply row on desktop | `babyInsightsShowChipApplyRow({ dirty })` shows Apply/Reset under chips whenever dirty — including desktop where the date toolbar already has Apply/Reset. Works; mild duplicate chrome. | open |
| FYI | `AboutDisclosure` first in Insights stack | Lone icon row above filters (shell already titles the page). Loans/Investments put About near chart content. Placement oddity; skeleton now mirrors About slot. | open |
| FYI | Shared filter bar residual English | `InsightsDateRangeFiltersBar` still hardcodes From/To / “Filter” / modal “Filters” (same as Loans). Baby `labels` cover Apply/Reset/applying + period chip only — Round-1 Major scope. Broader Money chrome i18n is out of this fix’s called-out strings. | open |

**Round notes:**

- Round 1 (2026-09-06) — Quality Verifier (independent of Fix author). Checked uncommitted Insights merge vs Gate 1 idea, Gate 2 **Option A**, and `04-tasks.md` (routes `/baby/insights` + `/baby/measure`, growth `from`/`to`, nav, redirects, skeletons, DESIGN_GUIDE).
- **What looks solid:** Permanent redirects in `next.config.ts`; nav Home → Insights → capture (+ Measure) → Settings; header keys; Insights view-only + Measure writes; Option A shared chips with independent care/growth filter helpers; growth server `from`/`to`; default this-month range; e2e Insights/redirects/Measure smoke (adversarial already covered tests).
- **Gaps cluster on:** skeleton/CLS vs Money Insights primitives, Measure loading vs empty, growth error silence, VI filter-chrome i18n, mobile Apply vs chips.
- **Verdict:** Quality review: **not clean** — 6 Major (0 Critical). Fix then re-run Quality lens.

- Fix round 1 (2026-09-06) — Senior Developer Fix (quality).
  - Insights skeleton: About → `MoneyAnalyticsFiltersBarSkeleton` → chips → `AnalyticsPeriodChipSkeleton` → Card KPIs → growth heading+CTA → charts → growth list → timeline heading → timeline list.
  - Measure: `babyMeasureListState` keeps list skeleton while loading (no false empty); list rows include Edit/Delete placeholders (`BabyMeasureListSkeleton`).
  - Growth section uses `babyInsightsSectionState` + `insights.loadGrowthError`; Load more via `fetchNextPage`.
  - Period chip + date filter bar accept labels; baby wires `insights.showing` / `applyToUpdate` / `apply` / `reset` / `applying` (EN+VI).
  - Chip-only dirty: Apply/Reset row near chips (`babyInsightsShowChipApplyRow`).
  - Removed unused `BabyTimelineSkeleton` / `BabyGrowthPageSkeleton` and empty `growth/` + `timeline/` dirs.
  - TDD: measure list state, insights section state, chrome labels, mobile apply helpers.
- **Verdict after Fix:** awaiting Verifier re-run of quality lens (Fix does not self-approve).

- Round 2 re-review (2026-09-06) — Quality Verifier after Fix round 1.
  - **Prior Major ×6:** confirmed fixed (not theater).
    - Skeleton: `BabyInsightsPageSkeleton` matches live order (About → Money filters skeleton → chips → period → Card KPIs → growth heading+CTA → charts → growth list → timeline heading → timeline list).
    - Measure loading: `babyMeasureListState` → `BabyMeasureListSkeleton` while `isLoading` (no `growth.noData` flash).
    - Measure skeleton rows: Edit/Delete-sized action slots in `BabyMeasureListSkeleton`.
    - Insights growth error: `babyInsightsSectionState` + `insights.loadGrowthError` when `growthQuery.isError`.
    - i18n chrome: `babyInsightsPeriodChipLabels` / `babyInsightsDateRangeFilterLabels` wired into period chip + date bar; VI keys resolve (unit + helper tests).
    - Mobile chip Apply: dirty → Apply/Reset under chips (`babyInsightsShowChipApplyRow`) without opening the date sheet.
  - **Prior Enhancement ×2:** confirmed fixed. Unused `BabyTimelineSkeleton` / `BabyGrowthPageSkeleton` and empty `growth/` + `timeline/` dirs gone; growth `fetchNextPage` + Load more present.
  - **New Major ×1:** Measure list still false-empty on `growthQuery.isError` (`babyMeasureListState` ignores error).
  - **New Enhancement ×1:** Growth Load more pages charts but list stays `slice(0, 8)` — unlike timeline Load more.
  - Nit/FYI: KPI breakpoint, desktop duplicate chip Apply, About placement, residual shared From/To English (Loans-parity).
  - **Verdict:** Quality review: **not clean** — 1 Major + 1 Enhancement. Fix then re-run Quality lens.

- Fix round 2 (2026-09-06) — Senior Developer Fix (quality).
  - Measure: `babyMeasureListState` takes `isError` → `"error"` (before empty/ready; loading still wins). Measure page shows `insights.loadGrowthError`, not `growth.noData`.
  - Insights growth list: removed `filteredGrowth.slice(0, 8)` so Load more grows list with loaded pages (charts already did).
  - TDD: measure list-state error vs empty (red → green). Skeletons unchanged (no structure change).
  - Nit/FYI left open.
- **Verdict after Fix:** awaiting Verifier re-run of quality lens (Fix does not self-approve).

- Round 3 re-review (2026-09-06) — Quality Verifier after Fix round 2.
  - **Prior Major (Measure error vs empty):** confirmed fixed (not theater).
    - Helper: `babyMeasureListState` takes `isError`; order is loading → error → empty → ready. Unit tests cover error with zero entries, error with stale entries, and loading preferred over error.
    - Production: `components/baby-measure-page.tsx` passes `growthQuery.isError` and renders `insights.loadGrowthError` on `"error"` — no `growth.noData` false empty when the query failed.
  - **Prior Enhancement (growth Load more vs list):** confirmed fixed (not theater).
    - Insights growth list maps full `filteredGrowth` (all loaded pages after chip filter). No `slice(0, 8)`. Load more still calls `growthQuery.fetchNextPage()` so charts and list grow together.
  - **New Critical / Major / Enhancement:** none found on this pass.
  - **Nit/FYI:** unchanged (KPI `sm:` scale, desktop chip Apply duplicate, About placement, residual shared From/To English). Optional FYI: Measure reuses `insights.loadGrowthError` copy (localized; fine for this pass).
  - **Verdict:** Quality review: clean.

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement on this pass. | clean |

**Round notes:**

- Round 1 (2026-09-06) — Security Verifier (Senior). Security-review subagent unavailable (usage limit ×2); manual review of Insights merge surfaces.
- **Scope checked:** GraphQL `babyGrowthEntries` `from`/`to`; `listBabyGrowthEntries` workspace + range filters; Insights/Measure routes; `next.config.ts` growth/timeline → insights redirects; baby GraphQL authz/CSRF/rate-limit boundary.
- **Authz / workspace:** Reads use `requireBabyWorkspace` (session + membership verified). Writes (Measure → growth mutations) use `requireBabyWriteWorkspace`. `workspaceId` comes from server context (`getBabyWorkspaceIdForUser` + `verifyMoneyWorkspaceAccess`), not client args. List/update/delete growth always `eq(…workspaceId, workspaceId)`.
- **Injection / untrusted input:** `from`/`to` go through `babyGrowthListInputSchema` (`datetime` + offset; reject `from > to`). Range applied via Drizzle `gte`/`lte` (parameterized). Limit capped 1–100. No raw SQL string concat. UI has no `dangerouslySetInnerHTML` / eval on Insights or Measure.
- **Redirects:** Permanent redirects to fixed `/baby/insights` (wildcard paths dropped, not forwarded) — no open redirect.
- **Secrets:** No new secrets or credential paths in this merge.
- **Insights view-only:** UI-only constraint; same-user writes still go through Measure + existing write-scoped mutations (expected).
- **Verdict:** Security review: clean.

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `components/baby-insights-dashboard.tsx` timeline `useInfiniteQuery` · `lib/baby-query-options.ts` | **Timeline pages still unbounded on the client.** Growth Load more stops at `BABY_GROWTH_MAX_PAGES` (4). Timeline has no matching cap — only the ~1m sync `replaceBabyTimelineFirstPage` drops deeper pages. Insights defaults to **this month** (analysis load-volume risk), so rapid Load more before the next sync (or a long `BABY_SYNC_INTERVAL_MINUTES`) can grow QueryClient + DOM far past the old today-only timeline. Add a timeline page window (or reset on Apply) like growth. | fixed |
| Enhancement | `components/baby-insights-dashboard.tsx` (~219–241) | **Hot-path `useMemo` miss.** `timelineItems` / `growthEntries` are fresh `flatMap` arrays every render, so memos for chip filters, KPIs, and chart series always recompute — including cheap draft chip toggles that do not change applied data. Stabilize page-derived lists (depend on `query.data` / page length) or derive inside memos from `*.data`. | fixed |

**Round notes:**

- Round 1 (2026-09-06) — Performance Verifier (Senior) vs `performance-optimization` + `vercel-react-best-practices`. Draft only — no production Fix this round.
- **Scope:** Insights dual infinite queries + sync + charts; Measure growth list; server growth `from`/`to`.
- **Strong (no Critical / Major):**
  - Server lists keyset + Zod `limit` 1–100; growth `from`/`to` via indexed `(workspace_id, recorded_at)`.
  - Timeline care+growth DB reads already `Promise.all` (no N+1 / no sequential waterfall).
  - Client growth capped (`babyGrowthNextPageParam` / `BABY_GROWTH_MAX_PAGES`); Measure reuses that cap.
  - Insights timeline + growth infinite queries start together (parallel, not await-A-then-B).
  - Sync refreshes **first timeline page only** + in-flight guard + pause when tab hidden.
  - Charts and date filter bar use `next/dynamic` (`bundle-dynamic-imports`).
- **Gaps:** month-default timeline client window vs growth; filter/KPI memo deps broken by per-render `flatMap`.
- **FYI (not filed):** Growth rows hit twice (dedicated growth query + timeline merge) — needed for chart completeness with range; acceptable at baby scale. Three GraphQL posts on mount (sync + two infinites) run in parallel.
- **Verdict:** Performance review: **not clean** — 0 Critical / 0 Major / 2 Enhancement. Fix then re-run Performance lens. Do not start Memory until Performance is clean.

- Fix round 1 (2026-09-06) — Senior Developer Fix (performance).
  - Timeline: `BABY_TIMELINE_MAX_PAGES` (4) + `babyTimelineNextPageParam` wired into Insights `getNextPageParam` (Load more hidden when `hasNextPage` false at cap).
  - Insights: `timelineItems` / `growthEntries` memoized on `query.data` so filter/KPI/chart memos stay stable across draft chip toggles.
  - TDD: `babyTimelineNextPageParam` stops at max pages; no cursor → undefined.
- **Verdict after Fix:** awaiting Verifier re-run of performance lens (Fix does not self-approve).

- Round 2 re-review (2026-09-06) — Performance Verifier after Fix round 1.
  - **Prior Enhancement (timeline max pages):** confirmed fixed (not theater).
    - Helper: `BABY_TIMELINE_MAX_PAGES` (4) + `babyTimelineNextPageParam` returns `undefined` once `allPages.length >= maxPages` (same shape as growth).
    - Production: Insights timeline `useInfiniteQuery` uses `getNextPageParam: (last, pages) => babyTimelineNextPageParam(last, pages)` — Load more gated by `hasNextPage`.
    - Tests: `lib/baby-query-options.test.ts` asserts stop-at-cap and no-cursor → undefined.
  - **Prior Enhancement (memoized flatMaps):** confirmed fixed (not theater).
    - Production: `timelineItems` / `growthEntries` are `useMemo` on `timelineQuery.data` / `growthQuery.data`; chip filters, KPIs, and chart series depend on those arrays — draft chip toggles no longer force fresh `flatMap` + downstream recompute.
  - **New Critical / Major / Enhancement:** none found on this pass.
  - **Still strong (unchanged):** server keyset + limit 1–100; growth/timeline indexes; timeline care+growth `Promise.all`; parallel Insights infinites; sync first-page only + in-flight + hidden-tab pause; charts/filters `next/dynamic`.
  - **FYI (not filed, same as Round 1):** growth rows still appear in both growth query and timeline merge; three GraphQL posts on mount run in parallel — fine at baby scale.
  - **Verdict:** Performance review: clean.

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement on this pass. | clean |

**Round notes:**

- Round 1 (2026-09-06) — Memory Verifier (Senior) vs checklist (listeners/timers, unbounded caches, retained closures / module state, full-set retention, money/SUM casts, long-lived refs). Focus: Insights sync + dual infinite queries + page caps; Measure growth list; `babyKeys` / QueryClient.
- **Strong (no Critical / Major / Enhancement):**
  - **Timers / listeners:** Insights `visibilitychange` removes on cleanup; sync `setInterval` clears on cleanup; `cancelled` skips `setQueryData` after unmount; `babyTimelineSyncShouldFetch(inFlight)` serializes ticks; hidden tab → `babyRefetchInterval` false (interval effect tears down).
  - **Client page caps:** Growth `BABY_GROWTH_MAX_PAGES` (4) via `babyGrowthNextPageParam` on Insights + Measure; timeline `BABY_TIMELINE_MAX_PAGES` (4) via `babyTimelineNextPageParam` on Insights. Sync uses `replaceBabyTimelineFirstPage` (keeps refreshed first page only).
  - **Query keys:** Timeline/growth keys include applied `from`/`to`; Measure uses unbound `babyKeys.growth()` (separate key, still page-capped). Selective `invalidateBabyQueries` scopes. Browser `QueryClient` singleton is expected; inactive range caches rely on default TanStack GC (fine at baby scale).
  - **Server / SQL:** Growth + timeline lists are keyset + Zod limit 1–100; no `SUM` / `::int` money-style casts on baby Insights/Measure paths. Last-care walk capped (`BABY_LAST_CARE_MAX_PAGES` = 3).
  - **No growing module-level baby caches** in Insights/Measure path; GraphQL client is request-scoped (no retained result store).
- **FYI (not filed):** `windowBabyGrowthInfiniteData` is tested but unused on the happy path (next-page stop is enough). Apply date changes leave prior range keys inactive until GC — normal TanStack behavior, bounded pages per key.
- **Verdict:** Memory review: clean.
---

## Fix notes (TDD skipped)

List any docs-only items where TDD was skipped:

*(none this round — all findings had behavior/tests)*
