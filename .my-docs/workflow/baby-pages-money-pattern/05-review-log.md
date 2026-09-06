# Review log: baby-pages-money-pattern

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/baby-query-options.ts:211-239` vs `lib/baby-query-options.test.ts` | Option B’s capped walk (`fetchBabyLastCareStatus`) has **no unit tests**. Helpers `lastCareStatusByType` / `shouldFetchNextCareStatusPage` are covered, but the orchestrator is not: accumulate across pages, early stop when all three types found, stop at `BABY_LAST_CARE_MAX_PAGES`, pass `nextCursor`, omit `from`/`to`. A broken walk (e.g. drop prior pages, never advance cursor) would still leave helper tests green. | fixed |
| Major | `e2e/baby-care.spec.ts:140-169`; capture forms | Tasks 6–8/12 require post-save → `/baby`. Capture e2e is `test.skip` unless `E2E_STORAGE_STATE` is set; there is **no unit/component test** that success calls `router.push("/baby")` (and not timeline). Default/CI runs without storage only exercise smoke UI — redirect regresses silently. | fixed |
| Major | `e2e/baby-care.spec.ts:157-168` | Sleep capture test is **non-deterministic**: after Start click it reads `page.url()` synchronously and branches into End→Start. Navigation/mutation may still be in flight, so the branch can mis-click End or race. Prefer a deterministic wait (URL, “in progress” copy, or explicit open-sleep setup) without sync URL branching. | fixed |
| Enhancement | `e2e/baby-care.spec.ts:29-42`, `143-148` | Task 12 asks status visibility **after** a care log (or empty then log). Smoke only checks labels/empty strip; auth capture tests only check `baby-home-status` visible — not that Feed/Diaper/Nap row left empty state or shows new summary / “in progress”. | fixed |
| Enhancement | `components/baby-home.tsx:81-116`; `components/baby-feed-form.tsx:70-86` (sleep/diaper peers) | Design failure modes untested: timeline/walk error still leaves CTAs usable (home never checks `isError`); mutation `catch` stays on form with no `router.push`. No negative unit or e2e for either path. | fixed |
| Enhancement | `lib/baby-query-options.ts:242-247` + invalidate tests | Task 5: home shares empty-bounds timeline key so care invalidation refreshes status. Care invalidate keys are tested, but nothing asserts `babyLastCareStatusQueryOptions().queryKey === babyKeys.timeline("", "")`. Easy to drift the home key and break refresh while helpers stay green. | fixed |
| Nit | `lib/baby-last-care-status.ts:43-45` | `hasAllCareStatuses` is used by the pager predicate but has no direct test (covered only indirectly via `shouldFetchNextCareStatusPage`). | fixed |
| FYI | `components/baby-home.tsx:35` | `toLocaleString()` without a fixed locale — fine today (e2e does not assert timestamps); would flake if content assertions add wall-clock strings. | open |
| FYI | Tasks 1–2, skeletons | shell-layout rename, SettingsSection move, and skeleton CLS rely on typecheck / manual glance — no automated layout assertions. Acceptable for this scope; not a test defect by itself. | open |
| Enhancement | `lib/baby-care-save-navigate.test.ts:17-22` vs feed/sleep/diaper forms | Round-1 “failure skips navigate” test is **mock theater**: local `if (saveOk)` never runs production `catch`. Forms could call `navigateAfterBabyCareSave` on error and unit tests stay green. Success → `/baby` is locked; mutation-negative path is not. | fixed |
| Enhancement | `lib/baby-query-options.test.ts:158-164` (`babyLastCareStatusQueryOptions`) | Only asserts `queryKey === babyKeys.timeline("", "")`. Does **not** assert `queryFn` uses capped walk (`fetchBabyLastCareStatus`). Swapping `queryFn` to a single-page timeline fetch would leave walk + key tests green while home silently drops Option B. | fixed |

**Round notes:**

- Helper tests in `lib/baby-last-care-status.test.ts` map well to Task 3 (empty, missing type, open sleep, growth/unknown, first-wins, pager continue/stop/cap/no-cursor). Not mock theater.
- `invalidateBabyQueries` tests assert real key contracts, not empty mocks — keep.
- i18n status keys covered in `lib/baby-i18n.test.ts` (EN/VI empty + in progress).
- Gaps cluster on **Option B walk integration**, **redirect enforcement without optional auth**, and **failure / post-log status assertions**.

**Fix round (adversarial-tests):**

- `fetchBabyLastCareStatus`: injectable `fetchPage` + unit tests for accumulate / early stop / max pages / cursor + omit from/to.
- `navigateAfterBabyCareSave` + `BABY_AFTER_CARE_SAVE_HREF`; feed/sleep/diaper forms use it; unit tests cover success → `/baby` and failure skips navigate.
- Sleep e2e: End-first settle via `expect.poll`, then `goto` sleep + Start (no sync `page.url()` branch).
- Capture e2e: assert status row left empty; sleep asserts “in progress”.
- `BabyHomeContent` SSR unit test: error/empty status still renders CTAs.
- Assert `babyLastCareStatusQueryOptions().queryKey === babyKeys.timeline("", "")`.
- Direct `hasAllCareStatuses` unit test.

**Re-verify round 2 (adversarial-tests):**

- Prior Majors verified closed: walk orchestrator unit tests; helper redirect destination; sleep e2e End-first + poll (no sync URL branch); post-log status not-empty / in-progress; queryKey contract; `hasAllCareStatuses` direct test; home CTAs on empty/error status via `BabyHomeContent`.
- Prior Enhancement on home error CTAs: closed (presentational test). Prior Enhancement on mutation-negative: **not fully closed** → new Enhancement (mock theater).
- Prior Enhancement on post-log status visibility: closed in auth capture e2e.
- New: home `queryFn` walk wiring untested (Option B entrypoint gap).
- FYIs unchanged (open, non-blocking).
- **Not clean** — 2 Enhancements open (0 Critical / 0 Major).

**Fix round 3 (adversarial-tests):**

- Replaced mock-theater `if (saveOk)` with `runBabyCareSaveThenNavigate`: real reject → `onError`, no `router.push`; success → `/baby`. Feed/sleep/diaper forms use the helper (shared catch contract).
- `babyLastCareStatusQueryOptions(walk?)`: `queryFn` invokes injectable walk; default `babyLastCareStatusWalkDefault === fetchBabyLastCareStatus`. Unit test awaits `queryFn` and asserts walk call + result.
- Focused tests: `lib/baby-care-save-navigate.test.ts`, `lib/baby-query-options.test.ts` — 17 pass / 0 fail.
- Writer does not self-approve — verifier must re-run adversarial-tests lens.

**Re-verify round 3 (adversarial-tests):**

- Enhancement `runBabyCareSaveThenNavigate` mock theater: **closed**. Helper `try/await mutate` is real; reject + `onSuccess` throw both assert `pushed === []` and `onError`; feed/sleep/diaper call the helper (no local `if (saveOk)` / bare `router.push`).
- Enhancement `babyLastCareStatusQueryOptions` queryFn walk wiring: **closed**. Test awaits `queryFn` with injectable walk (call count + result); `babyLastCareStatusWalkDefault === fetchBabyLastCareStatus`; production `queryFn: () => walk()`.
- No new Critical / Major / Enhancement on test quality. FYIs unchanged (open, non-blocking).
- Focused re-check: 17 pass / 0 fail.
- **Adversarial test review: clean.**

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-growth-chart.tsx:32-40`; `components/baby-page-skeleton.tsx:193-201` | Chart panels hand-roll Card chrome (`rounded-[var(--radius-md)] border border-border bg-surface`) instead of the `Card` primitive. Task 9 + DESIGN_GUIDE reserve **Cards** for chart panels; Money/Investments use `@/components/ui/card`. Skeleton mirrors the hand-roll, so both drift together. | fixed |
| Major | `components/baby-page-skeleton.tsx:163-190` (`BabySettingsSkeleton`) vs `components/baby-settings-page.tsx:100-174` | Settings skeleton does not mirror live `SettingsSection` chrome: no `border-b` heading block, weaker heading hierarchy, telegram-off path is a short bar vs muted copy under stack `gap-8`. Task 11 + mandatory skeleton parity (CLS). | fixed |
| Major | `components/baby-page-skeleton.tsx:34-38` vs `components/baby-home.tsx:121-140` | Home secondary link skeletons use `h-10` while live uses `Button size="lg"` (`py-3.5` + `text-lg`). Primary CTA row correctly uses `h-14` / `min-h-14`. Secondary row will shift when content loads. | fixed |
| Enhancement | `components/baby-home.tsx:148-149` + `statusText` empty path | Timeline/walk `isError` → `status` undefined → all three rows show `home.statusEmpty` (“None yet”), same as true empty. Design allows empty **or** short error text; error text would avoid false “no care yet” when fetch failed. CTAs still render (correct). | fixed |
| Enhancement | `components/baby-page-skeleton.tsx:16-23` vs `components/baby-home.tsx:60-76` | Status strip skeleton is three full-width bars; live rows are label + value flex with `border-b`. Order matches; structure does not — milder CLS than secondary height, still not exact parity. | fixed |
| Enhancement | `components/baby-settings-page.tsx:14-17` | Locale chips reuse `moneyQuickPickChipCls` / `moneyQuickPickGroupCls` (correct Money pattern). Gate 1 “generalize” renamed shell tokens + SettingsSection; chip helpers stay Money-named. Acceptable for this pass; rename later if desired. | fixed |
| Enhancement | `components/baby-page-skeleton.tsx:63`; `components/baby-feed-form.tsx:120-127` | Feed timer control skeleton is `h-11` + `rounded-[var(--radius-sm)]`; live is `Button size="lg"` (`py-3.5` + `text-lg` ≈ `h-14`, `rounded-[var(--radius-md)]`). Same class of CLS gap as the prior home-secondary Major; method grid already uses `h-14` / `radius-md`. | fixed |
| Enhancement | `components/baby-page-skeleton.tsx:152`; `components/baby-growth-page.tsx:221` | Growth add CTA skeleton is `h-12 w-28`; live add/save is `Button size="lg"` (~`h-14`). Field cells use `h-16`; button cell undersizes vs lg when content loads. | fixed |
| Nit | Tasks 7–8 acceptance “Field-based” vs sleep/diaper forms | Sleep/diaper are CTA-only grids (no inputs) — flat `SHELL_*` stack is fine; “Field-based” acceptance is vacuously N/A. | open |
| FYI | `lib/shell-layout.ts`; deleted `lib/money-layout.ts`; `docs/DESIGN_GUIDE.md` | `SHELL_*` string values match prior `MONEY_*`; production imports updated; DESIGN_GUIDE points at `shell-layout` + `settings-section`. Task 1 clean. | open |
| FYI | Option B surfaces | No `BabyPageBody`; seven surfaces compose `SHELL_FULL_SPAN` + `SHELL_DASHBOARD_STACK` per page; home uses capped walk via `fetchBabyLastCareStatus`; capture uses `runBabyCareSaveThenNavigate` → `/baby`. Matches Gate 2 Option B. | open |
| FYI | `components/settings/settings-section.tsx`; deleted `money-settings-shared.tsx` | SettingsSection / SettingsSubsectionHeading moved; callers (Money, Loans, Investments, global settings, api-help, Baby) import neutral path; no long-lived shim. Task 2 clean. | open |

**Round notes:**

- Verifier did not author the draft. Axes: correctness vs Option B / tasks, architecture (rename + move), DESIGN_GUIDE + skeleton parity, readability.
- Tasks 1–2 (shell-layout rename, SettingsSection move), Option B composition, Field/flat capture+growth+settings, post-save `/baby`, timeline flat divide-y rows look solid.
- Open quality gaps cluster on **Card primitive for growth charts** and **skeleton parity** (settings chrome + home secondary heights). No Critical.
- **Not clean** — 3 Major + 3 Enhancement open (0 Critical).

**Fix round (quality):**

- Growth chart + `BabyGrowthChartSkeleton`: use `Card` primitive (`p-4`) instead of hand-rolled border/surface chrome.
- `BabySettingsSkeleton`: mirror `SettingsSection` (`border-b` heading + `pt-1` body); telegram-on includes description bar under heading; telegram-off stays muted one-line bar in `gap-8` stack.
- `BabyHomeSkeleton` secondary links: `h-14` + `rounded-[var(--radius-md)]` to match `Button size="lg"`.
- Home status error: `home.statusError` i18n (EN/VI); `statusError` prop shows error text (not “None yet”); CTAs kept. Unit tests cover error vs empty.
- Home status skeleton rows: label + value flex with `border-b` (last row no border).
- Quick-pick helpers: canonical `quickPick*` names + Money-era `moneyQuickPick*` aliases; Baby settings imports `quickPick*`.
- Focused tests: baby-home, baby-i18n, money-quick-pick-chip-cls.
- Writer does not self-approve — verifier must re-run quality lens.

**Re-verify round 2 (quality):**

- Prior Majors **closed**: growth chart + chart skeleton use `Card` (`p-4`); `BabySettingsSkeleton` mirrors `SettingsSection` (`border-b` / `pt-1`, telegram description bar, off path muted bar); home secondary skeletons `h-14` + `radius-md`.
- Prior Enhancements **closed**: `statusError` → `home.statusError` (not “None yet”); status strip skeleton label+value + `border-b`; Baby settings imports `quickPick*`.
- New Enhancements (skeleton CLS leftovers): feed timer control `h-11`/`radius-sm` vs `Button size="lg"`; growth add CTA `h-12` vs `Button size="lg"`.
- Nits/FYIs unchanged (open, non-blocking). No Critical / no Major open.
- **Not clean** — 2 Enhancement open (0 Critical / 0 Major).

**Fix round 3 (quality):**

- Feed timer skeleton: `h-14` + `rounded-[var(--radius-md)]` to match `Button size="lg"`.
- Growth add CTA skeleton: `h-14` + `rounded-[var(--radius-md)]` (was `h-12` / `radius-sm`).
- Scanned other Baby skeletons in same file: home/diaper/sleep/method grids already `h-14`/`radius-md`; settings language chips stay `h-11`/`radius-sm` (quick-pick, not lg Button); telegram link already `h-14`/`radius-md`. No further mismatches.
- TDD skipped — no behavior.
- Writer does not self-approve — verifier must re-run quality lens.

**Re-verify round 3 (quality):**

- Enhancement feed timer skeleton: **closed**. `BabyFeedSkeleton` timer control is `h-14 w-32 rounded-[var(--radius-md)]`; live `Button size="lg"` (same radius on Button base).
- Enhancement growth add CTA skeleton: **closed**. `BabyGrowthPageSkeleton` CTA cell is `h-14 w-28 rounded-[var(--radius-md)]`; live add/save is `Button size="lg"`.
- Prior Majors/Enhancements from rounds 1–2 remain closed (Card charts, settings SettingsSection mirror, home secondary `h-14`, statusError, status strip rows, quickPick*).
- Fresh scan (Option B / tasks / DESIGN_GUIDE / skeleton parity): no new Critical / Major / Enhancement. Remaining open rows are Nit/FYI only (non-blocking).
- **Quality review: clean.**

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings in this pass. | clean |

**Round notes:**

- Security-review subagent unavailable (usage limit); Senior Verifier reviewed uncommitted/branch Baby UI + related GraphQL client walk manually.
- Scope: shell-layout rename, Baby page chrome, home last-care status walk, timeline/home summary rendering; also spot-checked GraphQL HTTP authz path used by the walk.
- **XSS / unsafe HTML:** Home `statusText` and timeline `{item.summary}` are React text children only. No `dangerouslySetInnerHTML` / `innerHTML` / `eval` in Baby components or `lib/baby-*`. Sleep notes may land in `summary` (server `careSummary`) but stay escaped in the DOM.
- **Authz:** Home walk calls existing `fetchBabyTimelinePage` → Baby GraphQL. Resolvers use `requireBabyWorkspace` / `requireBabyWriteWorkspace`; timeline SQL scopes by `workspaceId`. No new public endpoint; empty `from`/`to` is intentional last-ever (still membership-checked). CSRF + rate limit remain on `handleBabyGraphQLHttp`.
- **Secrets:** No secrets in UI/layout diffs. Telegram bot/webhook secrets stay env-only. `e2e/.auth/*` gitignored (`.gitkeep` only); auth helper documents no password bypass.
- **Injection / untrusted input:** Client cursor walk only forwards API `nextCursor` to the same GraphQL page fetch; page cap 3. Validators still cap notes/payload size. No SQL string concat in the UI pass.
- **Security review: clean.**

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings in this pass. | clean |

**Round notes:**

- Skills: `performance-optimization` + `vercel-react-best-practices` (React/Next UI).
- Scope: Option B home last-care walk, query sharing, Baby surfaces touched by this workflow (home / capture / growth / timeline / settings / shell layout).
- **Capped walk (`fetchBabyLastCareStatus`):** `BABY_LAST_CARE_MAX_PAGES = 3`, `BABY_LAST_CARE_PAGE_LIMIT = 50`; early stop via `shouldFetchNextCareStatusPage` / `hasAllCareStatuses`; omits `from`/`to`; advances `nextCursor`. Serial page awaits are required for cursor paging (not a fixable parallel waterfall). Server `listBabyTimeline` stays bounded (`limit` + keyset) and parallelizes care+growth reads (`Promise.all`). No N+1.
- **Home query sharing:** `babyLastCareStatusQueryOptions` uses `babyKeys.timeline("", "")` so care invalidation (`[...babyKeys.all, "timeline"]`) refreshes status. Day timeline uses ISO day bounds (different key) — no live cache-shape clash. Cached value is reduced `LastCareStatusByType` (walk in `queryFn`); intentional Option B, not a raw page share. Default `staleTime` 30s from `getQueryClient` applies; acceptable for this scope (sync config alone opts into 60s).
- **Re-renders / client fetch:** Home is a thin `useQuery` → presentational `BabyHomeContent`; uses `isLoading` (not `isFetching`) so background refetch does not blank the strip. Locale context is memoized. Feed timer `setInterval` 250ms is intentional live UX while running — not a status/home defect. No Suspense/prefetch of home status (Money-style client fetch); accepted.
- **Pagination / unbounded:** Growth infinite query capped (`BABY_GROWTH_MAX_PAGES` / `babyGrowthNextPageParam`). Timeline load-more is day-bounded (natural cap). GraphQL validators `limit` max 100.
- **Bundle:** Growth chart is `next/dynamic` + `ssr: false` (visx off home/capture paths). Home does not import charts. `MoneyAppMenu` in Baby chrome matches Loans/Investments shell pattern — not a new Baby-only barrel.
- **Hot-path invalidate:** Care scope invalidates timeline (+ unused `profile` options never subscribed — no extra network). Growth invalidate refreshing timeline/home is correct (growth rows share the union feed and can displace care types within the walk window).
- **Performance review: clean.**

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings in this pass. | clean |

**Round notes:**

- Scope: Option B home last-care walk, feed timer, query cache keys; also spot-checked timeline sync interval, growth infinite cap, locale/nav listeners, Baby SQL for money/sum casts.
- **Walk accumulator (`fetchBabyLastCareStatus`):** Temporary `collected` capped at `BABY_LAST_CARE_MAX_PAGES` × `BABY_LAST_CARE_PAGE_LIMIT` (3×50). Early stop via `shouldFetchNextCareStatusPage`. `queryFn` returns only `LastCareStatusByType` (three refs); page buffers are not retained in the QueryClient cache.
- **Query cache keys:** Home uses `babyKeys.timeline("", "")` with reduced status (not raw pages). Day timeline uses ISO bounds (different key / infinite pages). Growth uses `babyGrowthNextPageParam` / `BABY_GROWTH_MAX_PAGES = 4`. Care invalidation prefixes `["baby","timeline"]` — refreshes home without duplicating walk buffers. `babyTimelineQueryOptions` is unused (no live empty-bounds shape clash).
- **Timers / listeners:** Feed `setInterval` (250ms) clears on stop/unmount (`baby-feed-form.tsx`). Timeline visibility listener + sync interval use `clearInterval` + `cancelled` flag; sync replaces infinite data with first page only (`replaceBabyTimelineFirstPage`). Locale `useSyncExternalStore` subscribe removes `storage` / custom events.
- **Module-level / long-lived:** Browser `QueryClient` singleton is expected SSR pattern; no growing Maps/lists in Baby UI libs. Yoga `WeakMap`s are request-scoped (out of this UI pass; not new retention).
- **Money/sum casts:** No `SUM` / `::int` on Baby schema or `features/baby` (N/A for this workflow).
- **Memory review: clean.**

---

## Fix notes (TDD skipped)

List any docs-only items where TDD was skipped:

- Skeleton / Card chrome parity (growth Card, settings SettingsSection mirror, home secondary `h-14`, status label+value rows): TDD skipped — layout/CLS only.
- Quick-pick `quickPick*` rename + Money aliases: behavior unchanged; alias equality covered in unit test.
- Feed timer + growth add CTA skeleton `size="lg"` parity (`h-14` / `radius-md`): TDD skipped — no behavior.
