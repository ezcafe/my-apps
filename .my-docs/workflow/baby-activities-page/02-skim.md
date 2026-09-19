# Light repo skim: baby-activities-page

**Result:** done
**Updated:** 2026-09-18
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js shell app with a Baby Care workspace under `app/(shell)/baby/` (layout + `BabyWorkspaceProvider`, not a new shell feature). The **Activity log** today is a deferred panel inside `BabyInsightsDashboard` on `/baby/insights` (merged care + growth, Money-like select/edit/delete already shipped). Money **Spending** is `/money` → `MoneyTransactionsPage` with `MONEY_LEDGER_SPENDING` (filters + period chip + optional summary stats + selectable ledger) — the page-layout reference for Activities.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `/Users/ptquang86/ws/my-apps/app/(shell)/baby/insights/page.tsx` | Thin route → Insights dashboard | yes — remove Activity log; add short Activities cue |
| `/Users/ptquang86/ws/my-apps/components/baby-insights-dashboard.tsx` | Charts / KPIs / More insights + expandable Activity log (`baby-activity-log` / `-panel`); timeline+growth queries gated on expand | yes — **move** log surface off here; keep charts |
| `/Users/ptquang86/ws/my-apps/components/baby-activity-selection-bar.tsx` | Fixed bottom Edit / Delete / Clear for Activity log | yes — move with ledger |
| `/Users/ptquang86/ws/my-apps/components/baby-insights-edit-modal.tsx` | Single-row edit/delete modal (care or growth) | yes — keep |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-activity-log.ts` | Merge rows, selection keys, prune helpers | yes |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-activity-edit.ts` | Mutation routing + care/growth patch helpers | yes |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-list-visible.ts` | Show-more window (`BABY_INSIGHTS_LIST_VISIBLE_CAP`) | yes |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-default-range.ts` | **Last 7 local days** (`babyInsightsDefaultRange`) | yes — Activities default |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-filters.ts` | Care / growth chip ids for merged filters | yes |
| `/Users/ptquang86/ws/my-apps/components/baby-page-skeleton.tsx` | `BabyInsightsPageSkeleton` (collapsed Activity log parity) | yes — Insights skeleton loses log; new Activities skeleton |
| `/Users/ptquang86/ws/my-apps/app/(shell)/money/(tabs)/page.tsx` | Spending entry: SSR prefetch + `MoneyTransactionsPage` + `showSummaryStats` | **reference** — do not change Money |
| `/Users/ptquang86/ws/my-apps/app/(shell)/money/(tabs)/spending/page.tsx` | Alias redirect → `/money` | reference only |
| `/Users/ptquang86/ws/my-apps/components/money-transactions-page.tsx` | Live Spending stack: `AnalyticsFiltersBar` → `AnalyticsPeriodChip` → optional summary/chart → selectable table | **page chrome reference**; Activities this pass: period/filters → ledger **only** (no summary strip) |
| `/Users/ptquang86/ws/my-apps/components/analytics-transactions-table.tsx` / `transaction-selection-bar.tsx` | Money ledger select / Edit / bulk bar patterns | already mirrored on Activity log — don’t re-clone |
| `/Users/ptquang86/ws/my-apps/lib/app-section-nav.ts` | Baby section items: Home, **Insights** (`review`), capture logs, Vaccines, Settings — **no Activities yet** | yes — add `/baby/activities`, label **Activities**, `group: "review"` next to Insights |
| `/Users/ptquang86/ws/my-apps/lib/baby-app-header.ts` | Path → title / breadcrumbs (no activities path yet) | yes — extend |
| `/Users/ptquang86/ws/my-apps/components/icons/icon-baby-nav.tsx` + map in `money-section-tabs.tsx` | Baby nav icons (`babyInsights`, etc.) — **no Activities icon id yet** | yes — add icon + `AppSectionTabIconId` |
| `/Users/ptquang86/ws/my-apps/messages/baby/en.ts` (+ `vi.ts`) | `insights.activityLog*`, nav/insights copy | yes — new Activities keys + Insights cue |
| `/Users/ptquang86/ws/my-apps/lib/features/registry.ts` | Shell feature `baby` → `/baby` | no new `WorkspaceAppKey` — page stays under Baby |
| `/Users/ptquang86/ws/my-apps/e2e/baby-care.spec.ts` | Many Insights Activity log expand / table / selection tests | must retarget to `/baby/activities` |
| `/Users/ptquang86/ws/my-apps/next.config.ts` | `/baby/timeline` + `/baby/growth` → `/baby/insights` | note for Design (redirect vs cue) |
| Prior run `.my-docs/workflow/baby-insights-activity-log-money-parity/` | Table select/edit parity while log still on Insights | context only |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `POST /api/graphql/baby` (`app/api/graphql/baby/route.ts`) | Sole Baby HTTP entry; client via `babyGraphQLRequest` |
| `babyTimeline` + Insights query `BABY_INSIGHTS_TIMELINE_QUERY` | Care rows + **payload** for edit; paginated (`BABY_INSIGHTS_TIMELINE_PAGE_LIMIT`) |
| `babyGrowth` (via `lib/baby-query-options.ts` growth query) | Growth rows for merge; same date bounds as timeline |
| `babyInsightsSeries` | Charts / KPIs on Insights only — stay on Insights |
| Mutations `updateBabyEvent` / `deleteBabyEvent` / `updateBabyGrowth` / `deleteBabyGrowth` | `lib/graphql/baby-typeDefs.ts` → `features/baby/server/care-events.ts` + `growth.ts` |
| `lib/baby-query-options.ts` | Query keys, infinite timeline/growth fns, invalidate helpers |
| No Baby bulk-delete / bulk-edit API | Multi-delete already loops client-side per row (care vs growth) |
| Money ledger / summary APIs | Out of scope — do not change |

## Hard constraints (do not fight)

1. **Same Baby feature** — new route under existing `workspaceAppKey: "baby"`; do not add a shell registry feature or Money APIs.
2. **Move, don’t duplicate** — Activity log leaves Insights; Insights keeps charts / KPIs / More insights + a **short Activities cue** (Gate A).
3. **Reuse log behavior** — prefer extracting/moving dashboard log + selection bar + edit modal + helpers; do not rebuild select/edit from scratch.
4. **Default range = last 7 days** via `babyInsightsDefaultRange` — not Money Spending’s default period.
5. **No summary stats / trend strip** on Activities this pass (Money Spending can show them; Activities must not copy that strip).
6. **Nav + chrome wiring** — `APP_SECTION_NAV.baby`, `resolveBabyAppHeader`, i18n EN/VI, section icon map; label **Activities**, review group next to Insights.
7. **Spending “same styles” = page stack + tokens**, not Money columns or Money summary. Note: live Spending DOM order is **filters → period chip → (stats) → table**; idea wording is period → filters → ledger — UI concept must pick a clear Activities order without inventing Money changes.
8. **Lists currently load only after Activity log expand** (`timelineEnabled` / `growthEnabled` tied to `activityOpen`) — Activities page must fetch without that expand gate.
9. **Skeleton parity** — new Activities loading skeleton; Insights skeleton drops collapsed Activity log block.
10. **Design system** — `docs/DESIGN_GUIDE.md` / clean-minimal tokens; tables sharp/flat; concentric radii; light + dark.
11. **Tests** — large `e2e/baby-care.spec.ts` Activity log suite assumes Insights expand; unit helpers already cover merge/selection/edit.

## Risks if we ignore the repo

- Shipping silent Insights removal without cue → caregivers think entries vanished.
- Leaving e2e / home links / habits on Insights expand → false failures and “missing log” reports (`/baby/timeline` still redirects to Insights).
- Keeping timeline/growth `enabled: activityOpen` on a always-visible Activities ledger → empty or never-loading list.
- Missing nav / header / icon / i18n → Activities unreachable or unlabeled.
- Copying Money summary stats strip against Gate A non-goals.
- Rebuilding selection/edit instead of moving existing pieces → regressions and scope blow-up.
- Touching Money Spending or shell `registry` as a new product area.

## Enough for UI concept / Analyze?

**yes** — Gate A ok; concrete Activity log host, Spending page reference, Baby section nav, GraphQL timeline/growth/mutations, default 7-day helper, and e2e touchpoints are enough for lean UI concept and Analyze.

Open for Design (not skim blockers): Insights cue copy/placement; whether `/baby/timeline` should later redirect to Activities; exact Activities chrome order vs Money’s filters-before-period chip; extract-component vs thin new page wrapping moved dashboard slice.
