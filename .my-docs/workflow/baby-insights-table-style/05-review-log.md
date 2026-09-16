# Review log: baby-insights-table-style

**Status:** review — all lenses clean (Adversarial → Quality → Security → Performance → Memory)  
**Updated:** 2026-09-14

## Build handoff (context)

- **Chosen design:** Option 1 (in-dashboard Table + mobile cards; today default).
- **04a Fix ask:** closed in Build (same-day bounds unit; Reset→today e2e; empty non-error + recovery i18n/e2e).
- **Focused tests claimed green:** `lib/baby-insights-default-range.test.ts`, `lib/baby-i18n.test.ts` empty recovery; Playwright Insights suite.

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `e2e/baby-care.spec.ts` empty/recovery | Empty / recovery asserts are page-wide (and `.first()`), not scoped under Growth / Timeline list sections. Charts reuse `insights.emptyGrowth` via `emptyLabel={growthEmptyLabel}`. So “No measurements…” and the Widen/Apply recovery sentence can pass from chart empty copy alone. | fixed |
| Enhancement | `e2e/baby-care.spec.ts` table chrome | Task 3a asks table **and** mobile card chrome. Specs only assert `getByRole("table")` count + cell text. Mobile card rows (`@md:hidden` `<ul>`/`<li>` with border cards) are never asserted. | fixed |
| Enhancement | `lib/baby-i18n.test.ts` empty recovery | Empty-copy checks use `/Widen\|Apply/i` OR regex. A string with only one token passes; Task 6 wants widen **and** Apply. | fixed |
| Enhancement | `e2e/baby-care.spec.ts` period chip | Period chip only asserts **not** “this month”. No positive same-day range check. | fixed |
| Enhancement | `e2e/baby-care.spec.ts` today/Reset GraphQL | Today / Reset path never inspects GraphQL `from`/`to`. Prefer assert intercepted bounds match local-today inclusive after load and Reset. | fixed |
| Nit | Tasks 3–4 show-more / load-more | List rewrite kept buttons; no automated click/regression for show-more or load-more after chrome change (04a treated as N/A). Optional follow-up if wiring risk worries you. | open |
| FYI | Skeleton parity | No automated CLS/skeleton test (matches 04a Enhancement → manual Checkpoint B). Not blocking this lens beyond noting it. | open |

**Fix notes (adversarial-tests Fix agent):**

- **Major empty/recovery:** Scoped Growth / Timeline list empty to section `h2` + direct child `<p>` (excludes chart-nested `emptyGrowth`). Recovery sentence asserted inside each list empty node.
- **Card chrome:** Asserted `ul > li` card rows under Growth/Timeline (count + text + `border` class) in shared-chips, table-chrome, and Breast L/R timeline specs.
- **i18n:** Require both Widen and Apply (EN) / Mở rộng and Áp dụng (VI) separately — not OR.
- **Period:** Positive same-day check on load (equal from/to display text); after Reset, period range text must match the initial today label (yesterday is also same-day).
- **GraphQL bounds:** Capture BabyTimeline/BabyGrowth `variables.from`/`to`. Assert today bounds on initial load; yesterday bounds after Apply; after Reset any new requests must be today (cache hit / staleTime 30s with no refetch is allowed because load+Apply already prove wiring).
- TDD: test-only remediations (stricter asserts against existing behavior); no production code change.

**Round notes (re-run after Fix):**

- Re-read `04-tasks.md` Tasks 1–6 / 04a Fix ask against `lib/baby-insights-default-range.test.ts`, `lib/baby-i18n.test.ts`, and Insights blocks in `e2e/baby-care.spec.ts` plus draft empty/`Table`/`ul > li` wiring in `baby-insights-dashboard.tsx`.
- Prior Critical/Major/Enhancement items verified fixed:
  - Empty/recovery: `insightsListSection` + `:scope > p` under Growth/Timeline; recovery inside those nodes; error copy count 0 (`e2e/baby-care.spec.ts` ~550–582). Chart reuse cannot satisfy the assert alone.
  - Card chrome: table count 2 + `ul > li` count/text + `toHaveClass(/border/)` in table-chrome (~728–752); shared-chips / Breast L/R also mount card rows.
  - i18n: separate Widen/Apply and Mở rộng/Áp dụng matches (`lib/baby-i18n.test.ts` ~126–140).
  - Period: same-day from/to display equality on load; Reset restores initial today period text (~534–540, ~625–627).
  - GraphQL: today on load, yesterday after Apply; Reset allows cache-hit or today-only new bounds (~542–647). Period/radios still catch Reset UI↔applied drift.
- No mock theater on the today path (radios + period + intercepted `from`/`to`). Chrome/chip specs still mock payloads (by design) but assert real DOM roles/structure.
- No new Critical / Major / Enhancement. Nit/FYI remain open (non-blocking).
- **Adversarial test review: clean.**

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-insights-dashboard.tsx` timeline Duration cell (~847–850) | Missing duration renders `t("insights.sourceNone")` ("—"). Wrong key (meant for Source), and puts a dash before stop-clock text. Old list and mobile cards omit empty duration. Leave the cell blank (or a Duration-specific empty), matching cards. | fixed |
| Enhancement | `insights.emptyGrowth` → charts via `growthEmptyLabel` | Task 6 recovery sentence now also fills growth **chart** empty states. Quiet-day charts repeat “Widen… Apply” next to the list empty line. Prefer a chart-only empty string, or keep list recovery on list keys only. | fixed |
| Enhancement | `messages/baby/vi.ts` `insights.sourceWeb` | VI value is still English `"Web"` while Task 6 asks no new English hard-codes in Baby VI chrome. | fixed |
| Nit | Growth table header vs cell | Header uses `growth.kind` (“Kind”) while the cell is kind **plus** value/unit. Harmless; a “Measurement”/value-aware header would match better. | open |
| Nit | `BabyInsightsListSkeleton` table wrapper | Live uses `hidden min-w-0 @md:block`; skeleton drops `min-w-0`. Tiny CLS risk on narrow overflow. | open |
| FYI | `baby-insights-dashboard.tsx` size / Option 1 | File ~937 lines with duplicated table+card maps. Matches locked Option 1; extract later if a second Baby list needs the shell. | open |
| FYI | `insights.periodThisMonth` | Still unused legacy key (pre-existing). Period chip correctly uses `insights.showing` + formatted range. | open |

**Fix notes (quality Fix agent):**

- **Major Duration:** Timeline table Duration cell omits missing duration (`null` → nothing), same as mobile cards — no `insights.sourceNone` dash. E2E table-chrome asserts Duration cell for no-duration feed is not "—".
- **Enhancement chart empty:** New `insights.emptyGrowthChart` (EN/VI, short chart-only copy like `emptyCareCount`). `growthEmptyLabel` uses that; list still uses `insights.emptyGrowth` with Widen/Apply recovery. Unit asserts chart empty has no recovery tokens.
- **Enhancement VI sourceWeb:** `insights.sourceWeb` VI → `"Trang web"`; unit asserts VI ≠ `"Web"`.
- **Focused tests green:** `lib/baby-i18n.test.ts`; Playwright `insights growth and timeline use table chrome`.
- Do not self-approve — Quality verifier re-runs the same lens.

## Review checklist

- [x] Context understood (01-idea / 03-design Option 1 / 04-tasks 1–6)
- [x] Correctness + tests adequate (unit today + same-day bounds; e2e today/Reset/chrome/empty; Duration omit covered)
- [x] Security (no new deps, no unescaped HTML, authz untouched — Security lens separate)
- [x] Architecture (Option 1 in-dashboard; helper stop wrapping Money month default)
- [x] Readability (Duration no longer reuses sourceNone; chart vs list empty keys split)
- [x] Performance (double table+card row map — fine at list caps)
- [x] Deps/lockfile if touched — N/A
- [x] Verdict: **Approve** — Quality review: clean

**Round notes (pre-Fix reviewer):**

- Fresh review of uncommitted diffs vs 01-idea, 03-design (Option 1), 04-tasks.
- Spec match otherwise solid: today helper, both lists Table + `@md` cards, flat sections, `TableCaption` defaults to `sr-only`, skeleton list chrome updated, empty recovery i18n EN/VI, Reset via `defaultFilterState` → helper, Money month default untouched.
- Original verdict was Request changes (1 Major + Enhancements). Fix agent remediated Critical/Major/Enhancement rows above; Nits/FYI left open.

**Round notes (re-run after Fix — Quality verifier):**

- Re-read 01-idea / 03-design Option 1 / 04-tasks 1–6 against uncommitted diffs (dashboard, skeleton, default-range helper+tests, i18n EN/VI, baby-i18n tests, Insights e2e).
- Prior Critical/Major/Enhancement verified fixed:
  - **Duration:** table cell uses `{duration ? … : null}` only (~847–849); Source still owns `sourceNone` (~862). E2E table-chrome asserts no-duration feed Duration cell `not.toContainText("—")`.
  - **Chart empty:** `growthEmptyLabel` → `insights.emptyGrowthChart`; list empty → `insights.emptyGrowth` with recovery. Unit asserts chart copy has no Widen/Apply (EN) or Mở rộng/Áp dụng (VI).
  - **VI sourceWeb:** `"Trang web"`; unit asserts VI ≠ `"Web"`.
- Spec still matched: today helper (no Money `defaultAnalyticsFilters`), both lists Table + `@md` cards, flat sections (Card only on KPIs), `TableCaption` default `sr-only`, skeleton Table+cards, Reset via `defaultFilterState` → today, empty ≠ error.
- No new Critical / Major / Enhancement. Nit/FYI rows remain open (non-blocking).
- **Quality review: clean.**

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | clean |

**OWASP coverage (A01–A10):**

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 | pass | No new endpoints or IDs; GraphQL still workspace-gated (`requireBabyWorkspace`); UI only reuses existing queries |
| A02 | N/A | No secrets, tokens, or new sensitive URL params |
| A03 | pass | Cell/card text via React children; no `dangerouslySetInnerHTML`; no new SQL/shell |
| A04 | pass | Client “today” default is UX only; view-only tables; empty today ≠ error (matches design) |
| A05 | N/A | No CORS, headers, or debug-flag changes |
| A06 | pass | No new dependencies / lockfile changes in this diff |
| A07 | pass | Same session + Baby workspace cookie path; auth surface untouched |
| A08 | N/A | No webhooks, unsafe deserialization, or CI integrity changes |
| A09 | pass | No new logging of row/PII payloads |
| A10 | N/A | No server fetch of user-controlled URLs |

**Round notes:**

- Security-review subagent could not run (usage limit); verified uncommitted diff manually vs [OWASP Top 10](https://owasp.org/Top10/) and `03-design.md` Security / OWASP.
- **Surface:** Insights table restyle + today default — dashboard/skeleton UI, `babyInsightsDefaultRange`, i18n, unit/e2e tests only.
- **Design↔code:** Matches design callouts — authz unchanged, React-escaped cells, no new deps/secrets/SSRF/logging; client today spoof stays local UX (server still filters by ISO bounds under workspace auth).
- No Critical / Major / Enhancement.
- **Security review: clean.**

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | clean |

**Round notes:**

- Fresh Performance lens on uncommitted Insights table restyle + today default (`baby-insights-dashboard.tsx`, `baby-page-skeleton.tsx`, `baby-insights-default-range.ts`, i18n/tests). Skills: `performance-optimization`, `vercel-react-best-practices`.
- **N+1 / fetches:** No new GraphQL, resolvers, or query keys. Still parallel `useInfiniteQuery` for timeline + growth; sync truncate + auto-page caps unchanged (`BABY_TIMELINE_MAX_PAGES`, page limits 100/50).
- **Bounds:** Today default narrows the default window vs month (less data on first paint). Existing GraphQL limit validation + DOM `BABY_INSIGHTS_LIST_VISIBLE_CAP` (100) + show-more / load-more unchanged. Design non-goal: no new Money-style pagination.
- **Waterfalls:** No new await chain; bounds → shared `buildBabyInsightsQueryFns` → both infinite queries still start together.
- **Hot path / render:** Dual table + `@md` card maps (loans-style) mount both trees; CSS hides one. Bounded by list cap; typical today range is small. Not raised as Enhancement (locked Option 1; Quality already noted fine at caps).
- **Bundle:** Direct `@/components/ui/table` import (light local primitives). No new deps, charts, or barrel imports.
- No Critical / Major / Enhancement.
- **Performance review: clean.**

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | clean |

**Round notes:**

- Fresh Memory lens on uncommitted Insights table restyle + today default (`baby-insights-dashboard.tsx`, `baby-page-skeleton.tsx`, `baby-insights-default-range.ts`, i18n/tests). No SQL / money / sum-column changes in this diff.
- **Listeners / timers:** Visibility `visibilitychange` still removes on unmount. Sync `setInterval` still clears + sets `cancelled` on cleanup. Diff did not add listeners, subscriptions, or timers.
- **Caches / lists:** Query retention still soft-capped (`BABY_TIMELINE_SOFT_MAX_PAGES` / `BABY_GROWTH_SOFT_MAX_PAGES` = 20). Auto-fetch still hard-capped (`BABY_TIMELINE_MAX_PAGES` = 8). DOM show-more still capped (`BABY_INSIGHTS_LIST_VISIBLE_CAP` = 100). Sync truncate still drops deep timeline pages. No new unbounded module-level Map/list/cache.
- **Closures / long-lived refs:** No new module-level state. Default-range helper is a pure `toLocalDateString` call. Dual table + `@md` card maps double visible-row DOM only (≤ cap); same locked Option 1 pattern Performance already accepted — not a retention leak.
- **Whole result sets:** Today default narrows the first-paint window vs month (less retained query data by default). Design non-goal: no new Money-style pagination; existing page soft maxes remain.
- **Money/sum casts:** N/A — no Drizzle/`SUM`/`::int` changes.
- No Critical / Major / Enhancement.
- **Memory review: clean.**
