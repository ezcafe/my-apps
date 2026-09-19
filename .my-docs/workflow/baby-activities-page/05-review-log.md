# Review log: Dedicated Baby Activities page

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/baby-activities-enable.test.ts:24-28` | **Mock theater on `activityOpen`:** test builds a local `{ moreOpen: true }` object and asserts `"activityOpen" in params === false`. That never touches the helper signature, TypeScript params, or production callers — it cannot fail for a real regression. | fixed |
| Major | `lib/baby-activities-enable.test.ts:9-34` · `components/baby-insights-dashboard.tsx:207` · Task 3 sync ownership | **Enable / sync ownership not locked to real failure modes:** `babyActivitiesListsEnabled()` / `babyInsightsTimelineListEnabled()` are hard-coded `true`/`false`; Insights only `void`s the timeline helper and never uses the return as `enabled`. Unit suite stays green if Insights re-adds a timeline `useInfiniteQuery` or `syncTimelineFirstPage` / auto-page interval. E2E `timelineFetches === 0` (`e2e/baby-care.spec.ts:1652-1664`) helps for list queries, but with `intervalMinutes: 60` it will not catch a sync `setInterval` that never fires in the test window. Need a wiring or source assert (Insights has no timeline sync/auto-page; Activities enables lists + owns sync on mount). | fixed |
| Major | `e2e/baby-care.spec.ts:1299-1358` | **Load-error failure mode incomplete:** asserts destructive Alert + Retry visible and empty copy absent, but never clicks Retry and never proves refetch clears the error / restores the ledger. Broken `onClick` / wrong refetch target would still pass. | fixed |
| Enhancement | `components/baby-page-skeleton.test.ts:73-82` vs live page | **Live chrome order untested in unit:** skeleton order filters → period → ledger is covered; live `baby-activities-filters` → `baby-activities-period` → `baby-activities-ledger` order is not asserted in unit (e2e sees each piece, not order). | fixed |
| Nit | `lib/baby-activities-enable.test.ts:9-13,31-34` | Constant `true`/`false` helper tests add little beyond e2e list-fetch ownership once wiring asserts exist; keep only if paired with caller/source checks. | fixed |
| FYI | `e2e/baby-care.spec.ts` Activities edit/delete/partial multi-delete, cue, empty quiet, Insights log absent | Strong real-path coverage for Tasks 5–7 mutation rewrite, cue, and empty — do not weaken these while fixing the gaps above. | — |

**Round notes:**

- Mapped against `04-tasks.md` + `04a-tdd-test-review.md` Fix ask: empty quiet + load-error Alert exist in e2e; series-only KPI unit is real (`preferSeriesInsightCountKpis` missing series → zeros); growth `moreOpen` false/true unit + e2e fetch gate are good; Home `href="/baby/activities"` markup assert is real.
- Not clean: three Majors (mock theater, ownership lock, retry not exercised) + one Enhancement.
- Fix ask (tests only): (1) delete or replace activityOpen local-object assert with a real contract/wiring check; (2) lock Insights has no timeline list/sync/auto-page and Activities owns enable+sync (source or component/e2e with short sync interval / request spy on sync); (3) extend load-error e2e to click Retry and assert recovery; (4) optional unit for live chrome testid order.

### Fix round (adversarial-tests) — 2026-09-18

**TDD:** Red (source ownership asserts fail on Insights `void` theater + activityOpen mock) → Green (remove void import/call; replace tests; extend Retry e2e; live chrome order unit) → Verify focused units green.

| Finding | Change |
|---------|--------|
| activityOpen mock theater | Replaced with helper **signature** check (`moreOpen` only) + Insights call-site `babyInsightsGrowthEnabled({ moreOpen })` / `enabled: growthEnabled` / no `activityOpen`. |
| Enable/sync ownership | Source asserts: Activities wires `listsEnabled` + owns `syncTimelineFirstPage` / truncate / `setInterval` / auto-page; Insights has none of those and no `void babyInsightsTimelineListEnabled` theater. Removed unused timeline-enable import/void from Insights (growth still uses `moreOpen` as `enabled`). Min sync interval is 60s so ownership locked via source, not e2e tick. |
| Load-error Retry | E2E flips route to success, clicks Retry, asserts alert gone + ledger table + recovered row. |
| Live chrome order | Unit: `baby-activities-filters` → `baby-activities-period` → `baby-activities-ledger` in `baby-activities-page.tsx`. |
| Nit constants | Kept `true`/`false` helper values **paired** with source/wiring asserts above. |

**Tests run:** `npx tsx --import ./scripts/test-env.mjs --test lib/baby-activities-enable.test.ts components/baby-page-skeleton.test.ts` — 13 pass.

**Result:** Adversarial Fix ask items closed; ready for Adversarial re-check.

### Round 2 (re-check) — 2026-09-18

Re-verified Fix claims against current tests + production wiring (fresh context; did not write this code).

| Round 1 finding | Re-check |
|-----------------|----------|
| activityOpen mock theater | **Closed.** Helper signature requires `moreOpen: boolean` only; Insights call-site `babyInsightsGrowthEnabled({ moreOpen })` + `enabled: growthEnabled`; no local-object/`activityOpen` theater. |
| Enable/sync ownership | **Closed.** Activities source locks `listsEnabled` on both infinite queries + `syncTimelineFirstPage` / truncate / `setInterval` / auto-page; Insights has none of those and no `void babyInsightsTimelineListEnabled` theater. E2E still gates Insights `timelineFetches === 0` and Activities `> 0`. Sync tick still source-locked (min interval). |
| Load-error Retry | **Closed.** E2E flips route success, clicks Retry, asserts alert gone + ledger table + recovered row (`e2e/baby-care.spec.ts` ~1299–1403). Production `handleRetryLoad` refetches timeline + growth. |
| Live chrome order (Enhancement) | **Closed.** Unit asserts live testid order filters → period → ledger in `baby-activities-page.tsx`. |
| Nit constants | Still paired with source/wiring asserts; not blocking. |

**Also spot-checked (still real, not weakened):** series-only KPI unit (no timeline fallback); Home too-old `href="/baby/activities"`; Activities empty quiet + edit/delete/partial multi-delete e2e; Insights cue / no activity log.

**Tests run:** `npx tsx --import ./scripts/test-env.mjs --test lib/baby-activities-enable.test.ts components/baby-page-skeleton.test.ts lib/baby-insights-kpis.test.ts` — 22 pass.

**Result:** Adversarial test review: clean. Zero Critical / Major / Enhancement.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `components/baby-activities-page.tsx:565-585` | **Rules of Hooks violation:** early `return <BabyActivitiesPageSkeleton />` when `showInitialSkeleton`, then later `useCallback` for `handleRetryLoad`. Cold load paints skeleton first, then settles and adds a hook → React “Rendered more hooks than during the previous render.” Insights correctly avoids hooks after its skeleton early-return; Activities does not. Smoke (build+unit) would not catch this; cold `/baby/activities` can crash. | fixed |
| Major | `components/baby-insights-dashboard.tsx` (More insights growth) vs Activities load-more | **Insights growth pagination gap after log move:** previously the only `growthQuery.fetchNextPage` lived in the Activity log load-more. That control moved to Activities; Insights More insights still enables growth on `moreOpen` and shows partial/capped copy via `babyGrowthChartCopy`, but has **no** growth load-more. Many measurement pages → charts can stay permanently partial unless the user visited Activities first (shared RQ keys). Design moved list load-more with the ledger — confirm intentional for Insights charts, or restore a growth-only load-more under More insights. | fixed |
| Enhancement | `messages/baby/en.ts` + `vi.ts` (`activities.loadError`, `insights.about`) | **Stale “timeline” copy after the move:** Activities load error still says “Could not load timeline.” / “Không tải được dòng thời gian.” Insights about still describes a “care timeline.” Confuses caregivers after the log left Insights. Prefer Activities-oriented wording. | fixed |
| Enhancement | `lib/baby-insights-kpis.ts` `deriveBabyInsightsKpis` | **Production-dead helper:** only referenced from unit tests after series-only KPI path; Insights uses `preferSeriesInsightCountKpis` only. Ask before delete (skill: dead code). | fixed |
| Nit | `lib/baby-activities-enable.ts` `babyInsightsTimelineListEnabled` | Constant `false` helper unused in production (tests assert Insights does not call it). Fine as a contract stub; otherwise fold into source asserts only. | deferred |
| Nit | `messages/baby/*` `home.pendingTimelineLink` | Key name still says Timeline while copy correctly says Open Activities. Rename optional; not user-visible. | deferred |
| FYI | Human locks D1–D4 | Verified: dedicated `BabyActivitiesPage` + thin route; Insights `growthEnabled = babyInsightsGrowthEnabled({ moreOpen })`; `next.config` timeline→Insights unchanged + e2e; Activities `breadcrumbs: []`. Nav Activities next to Insights; cue + Home href `/baby/activities` present. | — |

**Round notes:**

- Reviewed uncommitted draft vs `01-idea` / `03-design` / `04-tasks` + locks D1:1 D2:2 D3:2 D4:1. Did not write this draft.
- Checklist: Context ✓ · Correctness (hooks Critical) ✗ · Security (fixed hrefs, no `dangerouslySetInnerHTML`, reuse GraphQL) ✓ · Architecture (Option 1 page owner; sync moved) ✓ with pagination gap Major · Readability (move duplication expected) ✓ · Performance no new N+1 flagged · Deps untouched.
- Verdict: **Request changes** — fix Critical hooks; decide Major growth load-more on Insights.
- Fix ask: (1) move `handleRetryLoad` (and any other hooks) above the skeleton early-return, or drop `useCallback` and use a plain function / stable refs; (2) confirm or restore Insights More insights growth load-more; (3) optional copy + dead-helper cleanup.

### Fix round (quality) — 2026-09-18

**TDD:** Red (hooks-after-skeleton assert + Insights growth `fetchNextPage` wiring + Activities/insights copy asserts) → Green → Verify focused units.

| Finding | Change |
|---------|--------|
| Critical hooks | Moved `handleRetryLoad` `useCallback` (and list error helpers) **above** `showInitialSkeleton` early-return so cold skeleton → content does not change hook count. Unit locks no `use*` after that return. |
| Major growth paging | Insights when `moreOpen` / `growthEnabled`: auto-page growth up to `BABY_GROWTH_MAX_PAGES` + manual Load more (`baby-insights-growth-load-more`) past the auto cap. No Activity log / timeline sync restored. Ownership test now forbids timeline auto-page only; asserts growth auto-page + `fetchNextPage`. |
| Copy | EN/VI `activities.loadError` + `insights.about` use Activities wording (no “timeline” / “dòng thời gian”). E2e load-error matchers updated. |
| `deriveBabyInsightsKpis` | **Kept** (tests need it). Comment notes production uses `preferSeriesInsightCountKpis`; TDD skipped for docs-only. |
| Nits | Deferred: keep `babyInsightsTimelineListEnabled` contract stub; skip `pendingTimelineLink` key rename. |

**Tests run:** `npx tsx --import ./scripts/test-env.mjs --test components/baby-page-skeleton.test.ts lib/baby-activities-enable.test.ts lib/baby-i18n.test.ts lib/baby-insights-kpis.test.ts` — 36 pass.

**Result:** Quality Fix ask items closed; ready for Quality re-check. Do not self-approve.
**Tests/behavior changed:** yes (hooks order, Insights growth auto-page + load-more, Activities/insights copy).

### Round 2 (re-check) — 2026-09-18

Re-verified Fix claims against current production code + unit locks (fresh context; did not write this draft).

| Round 1 finding | Re-check |
|-----------------|----------|
| Critical hooks | **Closed.** `handleRetryLoad` `useCallback` at ~560 is **above** `showInitialSkeleton` early-return (~583). No `useCallback` / `useEffect` / `useMemo` / `useState` / `useTransition` after that return. Unit locks order (`baby-page-skeleton.test.ts` Rules of Hooks). Insights still keeps all hooks above its skeleton return. |
| Major growth paging | **Closed.** Insights: `growthEnabled = babyInsightsGrowthEnabled({ moreOpen })`; `useEffect` auto-pages via `babyInsightsShouldAutoFetchNextPage(..., BABY_GROWTH_MAX_PAGES)` when `growthEnabled`; manual Load more (`baby-insights-growth-load-more` → `growthQuery.fetchNextPage`) inside More insights panel. No timeline sync/auto-page restored. Source assert in `lib/baby-activities-enable.test.ts`. |
| Enhancement copy | **Closed.** EN/VI `activities.loadError` = Activities wording (no “timeline” / “dòng thời gian”); `insights.about` points to Activities / Measure. Locked in `lib/baby-i18n.test.ts`. |
| Enhancement `deriveBabyInsightsKpis` | **Closed (kept).** Still test-only; intentional keep per Fix notes. |
| Nits | Still deferred (`babyInsightsTimelineListEnabled` stub; `pendingTimelineLink` key rename). Not blocking. |

**Also spot-checked:** Activities owns list enable + sync/auto-page/load-more; shared RQ growth keys unchanged; Decision 2 `moreOpen` gate intact.

**Result:** Quality review: clean. Zero Critical / Major / Enhancement.

---

## Merged SPM (Security ‖ Performance ‖ Memory)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-security.md`, `05-lens-performance.md`, `05-lens-memory.md`.

**Round:** 1
**Result:** clean

### Winners (fix these)

| Severity | Sources (security/perf/memory) | Finding | Decision |
|----------|--------------------------------|---------|----------|
| — | security / perf / memory | No open Critical / Major / Enhancement from any lens. | No Fix ask. |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| Perf FYI: Activities cold visit auto-pages ≤8 timeline pages | — (not a finding) | Design-chosen bound; measure-first; not Critical/Major/Enhancement. |
| Perf FYI: Dual table + `@md:hidden` cards (~2× row nodes) | — (not a finding) | Same Option 1 layout residual; accept unless list lag appears. |
| Perf FYI: Delete pool caps parallelism, not RPM | — (not a finding) | Prior Money-parity residual; product busy window + settle Alert remain. |
| Memory Nit/FYI: re-check `cancelled` after `applyBabyTimelineSyncTruncate` before `setAllowTimelineAutoFetch(false)` | — (not a finding) | Rare setState-after-unmount; not a timer/listener leak; demoted Nit/FYI only. |
| Memory FYI: prior date-range RQ keys until TanStack GC | — (not a finding) | Normal GC; pages per key soft-capped. |

### Fix ask (for Fix agent)

*(empty — Result clean)*

**Round notes:**

- Merged Round 1 from three clean lens files (2026-09-18). Security: OWASP A01–A10 pass/N/A; no Critical/Major. Performance: bounded fetches, parallel Activities queries, Decision 2 growth-off-until-expand, no new N+1. Memory: sync/visibility cleanup, capped auto-page/soft max, selection Set scoped and pruned.
- No cross-lens conflicts (nothing asked for opposing changes). FYI/Nit residuals stay documented above; they do not enter the Fix ask.
- Dedup: none needed — lenses shared the same “clean / no open findings” verdict with complementary evidence only.

---

## Fix notes (TDD skipped)

- Quality Enhancement `deriveBabyInsightsKpis`: kept for unit tests; production Insights uses `preferSeriesInsightCountKpis` only — comment added; **TDD skipped** (docs/comment only).
