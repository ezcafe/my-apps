# Review log: baby-care

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `lib/graphql/baby-yoga.test.ts:8-52` | **Mock theater GraphQL.** Test title says `babyProfile` succeeds with mock context, but it builds a fresh Yoga schema with **stub resolvers** that hard-return `"Ada"`. It never loads `babyResolvers`, never calls `executeBabyGraphQLForTest` (already exported from `lib/graphql/baby-yoga.ts:111`), and never asserts auth. Task 5 acceptance (real query + unauthorized error) is not covered; the suite only proves mocks return mocks. | fixed (round 1) |
| Major | `features/baby/server/care-events.test.ts:34-38`, `features/baby/server/profile.test.ts:5-9` | **Sole service behavior tests silently skip.** Sleep conflict (Task 10) and `ensureBabyProfile` twice→one row (Task 4) use `{ skip: !hasDb }`. Default `pnpm test` does not load `DATABASE_URL` (`scripts/test-env.mjs`; confirmed in `00-run.md`). CI stays green without proving open-sleep conflict or profile idempotency. Prefer always-on tests (pure conflict helper / injected deps) or fail when DB is required. | fixed (round 1) |
| Major | `features/baby/server/care-events.test.ts:8-31` | **Mislabeled Zod re-tests, not service tests.** “service edge” only calls `createBabyFeedSchema` / `createBabyDiaperSchema` (duplicates `lib/validators/baby.test.ts`). Never calls `createBabyFeed` / `createBabyDiaper`. Task 8 “valid breast_l creates row” and Task 9 service acceptance are unmet. | fixed (round 1) |
| Major | `features/baby/server/timeline.ts` (no `*.test.ts`) | **Timeline critical path untested.** No tests for merge care+growth, time-desc sort, cursor paging, bad cursor, or workspace scoping. Task 11 lists those acceptances; only an unchecked DB integration note exists. Cursor encode/decode + merge are non-trivial and easy to break. | fixed (round 1) |
| Major | `app/api/telegram/webhook/route.ts:15-28`; `lib/telegram/config.ts:27-34` | **Webhook failure modes missing.** Task 15 marks `503` + `telegram_disabled` when off; Task 18 marks bad secret → 401/403. No route or `verifyTelegramWebhookSecret` tests. These are deterministic without a live bot (inject env + call `POST`). | fixed (round 1) |
| Major | `features/baby/server/notify.ts`; `features/baby/server/telegram-link.ts`; `lib/telegram/send.test.ts:7` | **Task 16/17 coverage claimed but wrong layer.** No tests for link → get chat id / unlink clears. `maybeNotifyBabyCareCreated` (enabled + linked vs no link) is untested. `send.test.ts` only hits `sendTelegramMessage` and is named “enabled+linked” though it never checks a link. | fixed (round 1) |
| Major | `lib/graphql/baby-resolvers.ts` + `lib/graphql/baby-context.ts:165-186` | **Authz failure modes for Baby GraphQL untested.** Task 5: unauthorized → auth error. No test with `userSub: null` or `workspaceMembershipVerified: false` through real resolvers (`UNAUTHORIZED` / `FORBIDDEN`). Helper `executeBabyGraphQLForTest` exists unused. | fixed (round 1) |
| Enhancement | `features/baby/server/care-events.ts:143-168` | **Sleep happy path + `endBabySleep` NOT_FOUND missing.** Task 10 “end closes it” and end-with-no-open → `NOT_FOUND` have no tests (only second-start conflict, and that is DB-skipped). | fixed (round 1) |
| Enhancement | `lib/baby-i18n.test.ts:10-12` | **Weak “fallback to en”.** Unknown key returns the key string; does not assert a key present in `en` but missing in `vi` returns the English string (Task 6 wording). | fixed (round 1) |
| Enhancement | `lib/baby-home-actions.test.ts:7-15` | **Not RTL.** Task 7 asks for RTL three action labels; test only asserts `BABY_HOME_ACTIONS` constants. Fine as smoke for the map, but does not exercise UI/render. | fixed (round 1) |
| Enhancement | `lib/validators/baby.test.ts` | **Thin negative Zod coverage.** Missing cases: `durationSec` ≤0, bad `occurredAt`, empty `chatId` (`linkBabyTelegramSchema`), timeline `limit` 0 / >100, growth kinds outside enum beyond empty string. | fixed (round 1) |
| Enhancement | `lib/telegram/send.ts:37-42`; `lib/baby-telegram/commands.ts:57-109` | **Send/command handler failure modes thin.** No assert for HTTP non-OK / network → `{ ok: false }`. `handleBabyTelegramCommand` (unlinked → `handled: false`) never tested—only `parseBabyTelegramCommand`. | fixed (round 1) |
| Nit | `lib/graphql/baby-yoga.ts:111-139` | `executeBabyGraphQLForTest` exists for real-schema tests but unused by the suite. | fixed (round 1) |
| FYI | `04-tasks.md` Tasks 11/18 | Some DB/bot integration tests correctly left unchecked; findings above are about **false green** on marked-done items and untested pure failure modes. | — |
| Enhancement | `features/baby/server/notify.test.ts:11-56`; `telegram-link.ts:75-80` | **Link replace branch untested.** Suite covers first link (insert) + unlink. When a link already exists, `linkBabyTelegramChat` updates `chatId` (Task 16 “replace”). No second-link call asserting the new chat id wins. | verified (round 2) |
| Enhancement | `features/baby/server/care-events.test.ts:133-151`; `care-events.ts:266-268` | **`endBabySleep({ eventId })` path untested.** Happy/open and no-open → `NOT_FOUND` are covered; `getSleepById` branch (wrong/missing id → `NOT_FOUND`, valid id closes) is never called. | verified (round 2) |
| Enhancement | `lib/baby-i18n.test.ts:11-19` | **Shared-module mutation flake risk.** Fallback test deletes `babyVi["home.logFeed"]` then restores. Under parallel `pnpm test` file workers, other suites that call `t("home.logFeed", "vi")` (e.g. `lib/baby-home-actions.test.ts`) can race. Prefer inject/override without mutating the exported map. | verified (round 2) |
| Nit | `features/baby/server/timeline.test.ts:111-129` | “Workspace isolation” case only asserts caller-supplied items round-trip — tautology. Real DB scoping stays unchecked integration (Task 11); fine as FYI, not a reopen. | — |

**Round notes:**

- Reviewed baby-related tests vs `04-tasks.md` and draft services/resolvers/webhook (2026-09-06).
- Strong unit islands: registry, app key, schema unique index name, Zod happy/sad basics, i18n VI string, sync interval + hidden tab, growth series mapper, Telegram send no-op when disabled, command parser.
- Gaps cluster on GraphQL mock theater, skippable DB service tests, timeline/notify/link/webhook, and authz negatives.
- Adversarial test review: **not clean** — Fix required before re-run.

**Fix round 1 (2026-09-06):**

- Replaced GraphQL stub Yoga with `executeBabyGraphQLForTest` + real `babyResolvers`; authz UNAUTHORIZED/FORBIDDEN; success via `babyProfileQuery` test seam.
- Always-on service tests with injected/memory deps: feed/diaper create, sleep conflict/end/NOT_FOUND, profile `resolveEnsuredRow` idempotency.
- Timeline: exported cursor + `mergeAndPageBabyTimeline`; unit tests for merge, paging, bad cursor, scoped items.
- Webhook route: 503 disabled + 403 bad secret; notify/link/unlink; renamed send tests + HTTP/network fail; unlinked command path.
- Enhancements: i18n en fallback when VI key missing; home three CTAs + VI labels (no RTL lib); Zod negatives.
- Verifier should re-run adversarial-tests lens (Fix does not self-approve).

**Verifier re-run (2026-09-06, after Fix round 1):**

- Confirmed prior Critical/Major/Enhancement/Nit rows as **truly fixed** (real Yoga + authz; no `skip: !hasDb`; service create/sleep; timeline merge/page/cursor; webhook 503/403; notify/link/unlink; send fail modes; command unlinked; Zod/i18n/home).
- Ran baby-focused suite with `scripts/test-env.mjs`: **59 pass, 0 skip, 0 fail**.
- New open items are Enhancements only (link replace, sleep `eventId`, i18n mutate race). No Critical/Major reopen.
- Adversarial test review: **not clean** — Fix round 2 for open Enhancements, then re-run this lens.

**Fix round 2 (2026-09-06):**

- Telegram link: second `linkBabyTelegramChat` asserts replace overwrites `chatId` (Task 16).
- Sleep: `endBabySleep({ eventId })` wrong id → `NOT_FOUND`; valid id closes via `getSleepById`.
- i18n: exported `lookupBabyMessage`; fallback test uses a VI copy (no shared `babyVi` mutation).
- Verifier should re-run adversarial-tests lens (Fix does not self-approve).

**Verifier re-run (2026-09-06, after Fix round 2):**

- Confirmed all three Enhancements **truly fixed**:
  1. `notify.test.ts` “second link replaces chatId” — insert then update; stored `chatId` becomes `chat-second` (matches `telegram-link.ts` update branch).
  2. `care-events.test.ts` — `endBabySleep({ eventId })` wrong id → `NOT_FOUND`; valid id closes via `getSleepById` (memory deps wire that path).
  3. `baby-i18n.test.ts` — fallback uses `viCopy` + `lookupBabyMessage`; asserts shared `babyVi["home.logFeed"]` still `"Ghi bú"` (no shared-map delete).
- Baby-focused suite (`tsx` + `scripts/test-env.mjs`): **52 pass, 0 skip, 0 fail**.
- No new Critical / Major / Enhancement. Remaining unchecked items are intentional DB/bot/browser integration (Task notes).
- **Adversarial test review: clean.** Next lens: Quality.

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `features/baby/server/timeline.ts:103-156` | **Cursor page can skip rows.** Each side loads only `limit + 20`, then merges in memory. Deep pages (or a busy day with many care rows) never see older rows past that window, so Task 11 “pagination via cursor” can return wrong/incomplete pages. Fix needs a correct union page (keyset across both tables, or fetch enough then page with a proven bound). | fixed (Quality Fix round 1) · verified (re-run) |
| Major | `db/schema/baby.ts` / `0037_baby.sql`; `care-events.ts` `startBabySleep` | **Open-sleep conflict is check-then-insert only.** No partial unique index (e.g. one open sleep per baby). Two caregivers can both pass `findOpenSleep` and insert two open sleeps — breaks the design conflict rule under concurrency (Gate 1 multi-caregiver). | fixed (Quality Fix round 1) · verified (re-run) |
| Major | `components/baby-growth-page.tsx`; Task 13 | **Growth edit/delete missing in UI.** GraphQL has `updateBabyGrowth` / `deleteBabyGrowth`, but the page only creates. Task 13 acceptance “each kind creatable/**editable/deletable**” is unmet for caregivers. | fixed (Quality Fix round 1) · verified (re-run) |
| Major | `components/baby-page-skeleton.tsx`; `app/(shell)/baby/layout.tsx`; `loading.tsx` | **Skeleton parity broken (CLS).** Home live UI has locale row + three primary CTAs + three secondary links; skeleton has title + three CTAs + one short bar. Layout `Suspense` and route `loading` always use `BabyHomeSkeleton` for feed/sleep/timeline/growth/settings — wrong shape. Timeline skeleton omits back + title row. No per-route skeletons. Violates project UI skeleton parity rule + Task 7/12/19. | fixed (Quality Fix round 1) · verified (re-run) — listed routes OK; see new diaper Enhancement |
| Major | `components/baby-locale-provider.tsx`; `baby-workspace-provider.tsx`; `lib/features/registry.ts` | **EN/VI preference incomplete vs Task 6 / date-format pattern.** Provider always starts `initialLocale = "en"`; never reads `baby_locale` cookie/storage on load (unlike root layout → `PreferencesProvider` for date format). Shell nav label stays hardcoded `"Baby Care"` — `messages/baby` `nav.label` / VI `"Chăm bé"` unused. Reload loses VI. | fixed (Quality Fix round 1) · verified (re-run) |
| Major | `components/baby-feed-form.tsx:64-72`; `baby-growth-page.tsx`; `baby-settings-page.tsx`; `baby-growth-chart.tsx`; `timeline.ts` `careSummary` / resolvers notify strings | **Hardcoded English UI + English timeline summaries.** Feed “Amount (ml, optional)”, growth Kind/Value/Unit/Weight/Height, settings “Settings” / “Chat id” / “Linked” / model-B copy, chart “No data yet.”, and server timeline/notify summaries never go through `t()`. Gate 1 + Task 6 require EN↔VI for Baby Care strings. | fixed (Quality Fix round 1) · verified (re-run) — residuals below as Enhancements |
| Major | `components/baby-feed-form.tsx`; Idea Gate 1 / Task 8 | **Feed timers / `durationSec` absent from UI.** Idea MVP: feeding with timers/counters; schema + Zod + service support `durationSec`. UI only offers optional amount (ml) + method taps — no duration or timer. Partial Task 8 / Gate 1 feeding surface. | fixed (Quality Fix round 1) · verified (re-run) |
| Enhancement | `lib/graphql/baby-typeDefs.ts` Mutation block | **`updateBabyEvent` missing** vs design GraphQL sketch (`updateBabyEvent` / `deleteBabyEvent`). Delete exists; care-event edit does not. OK to defer if product is create-only, but contract and tasks should match. | fixed (Quality Fix round 1) · verified (re-run) |
| Enhancement | `components/baby-timeline.tsx`; `lib/baby-query-options.ts` | **Timeline UI never uses `nextCursor`.** Query asks for `nextCursor` but UI has no load-more; only first page (`limit: 50`). Fine for quiet days; busy day silently truncates. | fixed (Quality Fix round 1) · verified (re-run) |
| Enhancement | `components/app-shell.tsx`; `components/money-section-tabs.tsx` | **Duplicate `IconBaby` SVG** copied into two shell files. Prefer one shared icon map (or registry-driven) to avoid drift. | fixed (Quality Fix round 1) · verified (re-run) |
| Nit | `features/baby/server/care-events.ts`; `growth.ts` | **`parseOrThrow` copied** in two services. Extract one small helper. | fixed (Quality Fix round 1) · verified (re-run) |
| Nit | `lib/graphql/baby-resolvers.ts:352-353` | **`void requireBabyAuth`** dead silence for unused import. Remove or use. | fixed (Quality Fix round 1) · verified (re-run) |
| FYI | Diff size (~baby feature tree + tests) | Large greenfield draft (~3k+ LOC baby paths). Split later PRs if review/merge pain grows; acceptable for first feature cut if Fix closes Majors. | — |
| Enhancement | `app/(shell)/baby/diaper/loading.tsx`; `components/baby-page-skeleton.tsx` | **Diaper skeleton wrong shape.** Route loading reuses `BabyFeedSkeleton` (two field bars + four method slots). Live diaper UI is back + title + three kind CTAs only — CLS vs Task 19 / skeleton parity. | fixed (Quality Fix round 2) · verified (re-run) |
| Enhancement | `components/baby-diaper-form.tsx:42`; `components/baby-sleep-form.tsx:44,62` | **Residual hardcoded `"Failed"`** on error fallbacks. Feed/growth/settings use `t("common.failed")`; diaper/sleep still English-only when `e` is not an `Error`. | fixed (Quality Fix round 2) · verified (re-run) |
| Enhancement | `components/baby-timeline.tsx:95` | **Hardcoded `" · Telegram"`** source suffix not in message maps — VI timeline still shows English token. | fixed (Quality Fix round 2) · verified (re-run) |
| Nit | `components/baby-growth-chart.tsx:16` | Default `emptyLabel = "No data yet."` still English; growth page passes `t("growth.noData")`. Safe today; prefer `t`-only or no English default if chart is reused. | fixed (Quality Fix round 2) · verified (re-run) |
| Nit | `BabyFeedSkeleton` vs `baby-feed-form.tsx` | Live feed has duration field **+ timer Start/Stop button**; skeleton has two fields and no timer control — minor CLS. | fixed (Quality Fix round 2) · verified (re-run) |

**Round notes:**

- Quality lens (2026-09-06): independent review of uncommitted Option B draft vs `01-idea`, `03-design`, `04-tasks`. Adversarial tests already clean — this lens is product/architecture/UI fit, not re-litigating unit coverage.
- Strong: workspace key + registry + separate Yoga bag; schema/RLS sketch; Zod edges; env sync + hidden-tab pause; shared `TELEGRAM_ENABLED` module; visx + `colorByIndex`; invalidate-on-mutate; no prediction/PDF/CRDT/public API.
- Gaps cluster on **timeline page correctness**, **sleep concurrency**, **growth CRUD UI**, **skeleton CLS**, and **EN/VI completeness** (hydrate + strings + nav).
- **Quality review: not clean** — Fix required for Critical/Major (none Critical; seven Majors), then re-run this lens.

**Quality Fix round 1 (2026-09-06):**

- Timeline: union keyset paging (`mergeKeysetSources` — `limit` per side after cursor); deep-page unit test (80 interleaved rows, no skips).
- Open sleep: partial unique `baby_care_event_open_sleep_uq` in schema + `0037_baby.sql`; `rethrowOpenSleepConflict` on 23505 in `startBabySleep`.
- Growth UI: edit/delete list + mutations wired; feed durationSec + start/stop timer.
- Skeletons: home locale+CTAs+secondary; per-route `loading.tsx`; layout Suspense removed (cookie locale hydrate).
- Locale: cookie/SSR hydrate + root `babyLocaleInitInlineScript`; shell nav `nav.label` via `useBabyNavLabel`; UI/settings/chart/summary/notify via `t()` EN+VI.
- Enhancements: `updateBabyEvent` mutation + service; timeline infinite query load-more; shared `components/icons/icon-baby.tsx`.
- Nits: `lib/parse-or-throw.ts`; removed dead `void requireBabyAuth`.
- Verifier should re-run Quality lens (Fix does not self-approve).

**Verifier re-run (2026-09-06, after Quality Fix round 1):**

- Confirmed all prior Critical/Major/Enhancement/Nit rows **truly fixed** (no reopen of Majors):
  1. Timeline — `listBabyTimeline` keyset per side + `mergeKeysetSources`; deep-page test present.
  2. Open sleep — `baby_care_event_open_sleep_uq` in schema/SQL + `rethrowOpenSleepConflict` on 23505.
  3. Growth — edit/delete list + `updateBabyGrowth` / `deleteBabyGrowth` mutations.
  4. Skeletons — home locale+CTAs+secondary; per-route loaders for feed/sleep/timeline/growth/settings; layout cookie hydrate (no Suspense home-only).
  5. Locale — SSR cookie + root inline script; `useBabyNavLabel` / `nav.label`.
  6. i18n — forms/settings/summaries/notify via `t()`; EN/VI key parity.
  7. Feed — `durationSec` + start/stop timer.
  8. Enhancements/Nits — `updateBabyEvent`, infinite timeline load-more, shared `IconBaby`, `parseOrThrow`, no dead `void requireBabyAuth`.
- New open items are **Enhancements + Nits only** (diaper skeleton, residual `"Failed"` / `" · Telegram"`, chart default, feed timer skeleton). No Critical/Major reopen.
- **Quality review: not clean** — Fix round 2 for open Enhancements (Nits optional), then re-run this lens. Next after clean: Security.

**Quality Fix round 2 (2026-09-06):**

- Diaper: `BabyDiaperSkeleton` (back + title + 3 CTAs); `diaper/loading.tsx` wired.
- Feed skeleton: duration row + timer Start/Stop control mirror live form.
- i18n: diaper/sleep error fallbacks use `t("common.failed")`; timeline `timeline.sourceTelegram`; chart `emptyLabel` required (no English default).
- i18n unit test for `common.failed` + `timeline.sourceTelegram` EN/VI.
- Skeleton/layout parity: TDD skipped (structural UI); behavior keys covered by i18n test.
- Verifier should re-run Quality lens (Fix does not self-approve).

**Verifier re-run (2026-09-06, after Quality Fix round 2):**

- Confirmed all five open Enhancement/Nit rows **truly fixed** (no reopen):
  1. Diaper — `BabyDiaperSkeleton` (back + title + 3 CTAs); `diaper/loading.tsx` imports it (not feed skeleton).
  2. Diaper/sleep — error fallbacks use `t("common.failed")`.
  3. Timeline — source suffix via `t("timeline.sourceTelegram")` (EN/VI maps + i18n test).
  4. Chart — `emptyLabel: string` required; callers pass `t("growth.noData")`.
  5. Feed skeleton — duration row + timer control beside field; matches live form order.
- Spot-check: prior Majors still hold (keyset timeline, open-sleep unique, growth edit/delete, per-route skeletons, locale hydrate, feed timer, `updateBabyEvent`, shared `IconBaby`, `parseOrThrow`).
- Baby-focused suite (`tsx` + `scripts/test-env.mjs`): **70 pass, 0 skip, 0 fail**.
- No new Critical / Major / Enhancement.
- **Quality review: clean.** Next lens: Security.

---


## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/telegram/config.ts:27-34` | **Webhook secret compare is not constant-time.** `verifyTelegramWebhookSecret` uses `provided === expected`. This is the sole auth gate for internet writes into baby care (feed/diaper/sleep/health). Prefer `crypto.timingSafeEqual` on equal-length buffers (same pattern as password verify in `lib/api-auth.ts`). | fixed (Security Fix round 1) · verified (re-run) |
| Major | `app/api/telegram/webhook/route.ts:15-60` | **Public webhook lacks rate limit and body size bound.** Unlike baby GraphQL (`enforceRateLimit` + Yoga armor) and Money mutating routes, the Telegram POST path calls unbounded `request.json()` with no `enforceRateLimit` / `readJsonBounded`. Enables cheap DoS and, if the secret leaks, unlimited care-event writes. | fixed (Security Fix round 1) · verified (re-run) — see new Enhancement on CL omission |
| Enhancement | `lib/graphql/baby-resolvers.ts:166-168` | **`babySyncConfig` is unauthenticated.** Returns env-derived `intervalMinutes` with no `requireBabyAuth` / workspace check. Low sensitivity, but every other baby query requires membership; gate it the same way to avoid free schema probing. | fixed (Security Fix round 1) · verified (re-run) |
| Enhancement | `lib/graphql/baby-resolvers.ts:171-185`; `features/baby/server/profile.ts:35-57` | **`ensureBabyProfile(displayName)` has no length/Zod cap.** GraphQL accepts any `String`; first insert stores unbounded `display_name`. Cap like other baby strings (e.g. notes max). | fixed (Security Fix round 1) · verified (re-run) |
| Enhancement | `lib/validators/baby.ts:70-75`; `features/baby/server/care-events.ts:309-333` | **`updateBabyEvent.payload` is `z.record(z.string(), z.unknown())`.** Arbitrary JSON merge into care `payload` jsonb with no per-type schema or size cap (notes elsewhere max 2000). Prefer typed payload patches or strict allowlists. | fixed (Security Fix round 1) · verified (re-run) |
| Enhancement | `features/baby/server/telegram-link.ts:67-87`; settings UI | **Chat link has no ownership proof.** Any workspace member can set any `chatId`; notifies and bot writes then target that chat. Model B allows manual id, but a one-time deep-link / confirm code would stop mistaken or malicious redirect of family care PII. | fixed (Security Fix round 2) · verified (re-run) — pending until confirm; bypass confirm + write gate; notifies require `confirmedAt` |
| Enhancement | `app/api/telegram/webhook/route.ts:20-22` | **Extra secret header `x-telegram-secret`.** Official Telegram header is `x-telegram-bot-api-secret-token` only. Alternate header widens verify surface for little gain; drop it unless a documented proxy needs it. | fixed (Security Fix round 1) · verified (re-run) |
| Nit | `features/baby/server/care-events.ts:151-160`; `growth.ts:85-100` | **Update-by-id omits `workspaceId` in WHERE** after a workspace-scoped read. RLS + prior get make this OK today; defense-in-depth would keep `workspace_id` in the update predicate. | fixed (Security Fix round 1) · verified (re-run) |
| FYI | GraphQL baby + `0037_baby.sql` + webhook flow | Authz/RLS look sound for MVP: session CSRF + RPM on `/api/graphql/baby`, `requireBabyWorkspace` / write scope, API keys forced null workspace, FORCE RLS + `runInWorkspace`, webhook secret + unique chat link then `runInWorkspace` (bypass only for chat lookup/confirm). No Critical cross-tenant bypass found. | — |
| Major | `features/baby/server/telegram-link.ts:48-69`; `lib/baby-telegram/commands.ts:100-112` | **Telegram confirm under FORCE RLS never persists; writes ignore pending.** Chat lookup uses `withBypassRls`, but `defaultConfirmByChatId` updates/selects by `chat_id` with **no** bypass and **no** `runInWorkspace`. Under `FORCE ROW LEVEL SECURITY`, confirm returns null, so `confirmed_at` stays null. Handler still runs care mutations when `confirmedAt` is null (no post-confirm gate). Fix round 1 ownership claim (“first message confirms”; “confirm required before bot writes”) is not met in production. | fixed (Security Fix round 2) · verified (re-run) |
| Enhancement | `lib/request-guards.ts:11-19`; webhook route | **`readJsonBounded` only enforces when `Content-Length` is present.** Omit/lie about length → still unbounded `request.json()`. Shared Money helper gap now on the public Telegram path. | fixed (Security Fix round 2) · verified (re-run) |
| Enhancement | `lib/baby-telegram/commands.ts:100-112` | **No explicit `confirmedAt` write gate.** Even if confirm is fixed, best-effort confirm + fall-through allows care writes while still pending when confirm returns null. Prefer `if (!link.confirmedAt) return { handled: false }` after confirm (or confirm-only on non-commands). | fixed (Security Fix round 2) · verified (re-run) |

**Round notes:**

- Security lens (2026-09-06): Senior Verifier. `security-review` subagent unavailable (usage limit ×2); manual review of uncommitted Baby Care paths vs `security-and-hardening` checklist (authz, injection, secrets, untrusted input, RLS, webhook).
- Strong: separate Yoga bag with armor + introspection guard; CSRF + rate limit on GraphQL; membership via `getBabyWorkspaceIdForUser` + `verifyMoneyWorkspaceAccess`; session-only (API keys blocked); RLS FORCE + policies; Zod on service edges; Telegram gated by `TELEGRAM_ENABLED` + token + secret; unique `chat_id`; no secrets in repo (`.env.example` placeholders only).
- Gaps cluster on **webhook secret compare**, **webhook DoS controls**, and smaller input/auth consistency items.
- **Security review: not clean** — Fix required for Critical/Major (none Critical; two Majors), then re-run this lens.

**Security Fix round 1 (2026-09-06):**

- Webhook secret: `timingSafeEqual` on equal-length buffers; tests for match / mismatch / length mismatch.
- Webhook route: `enforceRateLimit` (`telegram-webhook`) + `readJsonBounded`; drop `x-telegram-secret` (official header only); 413 on oversized body; rate-limit memory fallback when `DATABASE_URL` unset.
- `babySyncConfig`: `requireBabyWorkspace` gate.
- `ensureBabyProfile`: `babyDisplayNameSchema` max 100.
- `updateBabyEvent.payload`: strict per-type Zod patches + 4096 char size cap.
- Telegram Model B ownership: link stores `confirmed_at` null (pending); first webhook message from that `chatId` confirms; notifies only when confirmed; numeric chatId + `TELEGRAM_ENABLED` required.
- Care/growth updates: `workspaceId` in UPDATE WHERE.
- Verifier should re-run Security lens (Fix does not self-approve).

**Verifier re-run (2026-09-06, after Security Fix round 1):**

- Confirmed truly fixed: timing-safe secret; webhook RPM + 413 (with CL); `babySyncConfig` gated; displayName max 100; strict `updateBabyEvent` payloads + size cap; official secret header only; care/growth UPDATE includes `workspaceId`. Spot-check suite (config/webhook/validators/yoga/notify/commands): **40 pass**.
- **Not truly fixed:** ownership Enhancement — `maybeNotifyBabyCareCreated` correctly requires `confirmedAt`, but `defaultConfirmByChatId` lacks `withBypassRls` (lookup has it), so confirm cannot stick under FORCE RLS; command handler does not refuse writes while pending.
- New open: 1 Major (confirm RLS + write fall-through), 2 Enhancements (CL-omit body bound; explicit confirmedAt write gate). No Critical. No cross-tenant GraphQL bypass found.
- **Security review: not clean** — Fix round 2 for open Major (+ Enhancements), then re-run this lens. Do not start Performance until Security is clean.

**Security Fix round 2 (2026-09-06):**

- `defaultConfirmByChatId`: wrap update/select-by-`chat_id` in `withBypassRls` so `confirmed_at` sticks under FORCE RLS (same pattern as chat lookup).
- `handleBabyTelegramCommand`: after confirm attempt, `if (!link.confirmedAt) return { handled: false }` — no care-write fall-through while pending.
- `readJsonBounded`: stream-read body with max-byte cap even when `Content-Length` is omitted; early reject when CL > max.
- Tests (TDD Red→Green): confirm persists in store after confirm; unconfirmed + failed/still-pending confirm cannot run `/feed`/`/diaper`; oversized body without CL → throw / webhook 413.
- Verifier should re-run Security lens (Fix does not self-approve).

**Verifier re-run (2026-09-06, after Security Fix round 2):**

- Confirmed all three Fix round 2 claims **truly fixed** (no reopen):
  1. `defaultConfirmByChatId` — update + select-by-`chat_id` wrapped in `withBypassRls` (`telegram-link.ts:52-71`); unique `baby_telegram_link_chat_uq` keeps bypass scoped to one workspace; notify test asserts `confirmedAt` sticks in store after confirm.
  2. Care writes refuse while pending — `commands.ts:105-108` explicit `if (!link.confirmedAt) return { handled: false }` after confirm attempt; tests cover confirm-fail + still-pending `/feed`/`/diaper` → `handled: false` (no write fall-through).
  3. `readJsonBounded` — stream-read with running byte total rejects when over max even with CL omitted; early reject when CL > max; unit + webhook “without Content-Length → 413” pass.
- Spot-check prior Security Fix round 1 still holds: timing-safe secret; webhook RPM + official header only; `babySyncConfig` gated; displayName max 100; strict `updateBabyEvent` payloads; care/growth UPDATE includes `workspaceId`; notifies require `confirmedAt`.
- Spot-check suite (request-guards + commands + notify + webhook + config): **27 pass, 0 fail**.
- No new Critical / Major / Enhancement. Residual Model B: wrong numeric `chatId` stays pending until that chat messages (no PII notify/writes until confirm) — acceptable for MVP, not a reopen.
- **Security review: clean.** Next lens: Performance.

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `features/baby/server/growth.ts:40-64`; `lib/graphql/baby-resolvers.ts:132-145`; `components/baby-growth-page.tsx:70-71,246-285` | **Unbounded growth fetch + DOM.** `listBabyGrowthEntries` has no `limit` / cursor (unlike timeline’s Zod `limit` 1–100). GraphQL returns every row for the workspace; the growth page maps the full list into charts and an edit/delete list. Years of weight/meds entries → large payloads, slow TTFB, and unbounded list render. Cap + page (or `from`/`to`) like timeline. | fixed (Performance Fix round 1) · verified (re-run) |
| Major | `features/baby/server/timeline.ts:192-205` | **Sequential care + growth queries (waterfall).** Independent selects await one-after-another instead of `Promise.all`. Every `babyTimeline` page pays ~2× DB RTT. Parallelize the two capped keyset reads (`async-parallel`). | fixed (Performance Fix round 1) · verified (re-run) |
| Major | `lib/graphql/baby-resolvers.ts:206-211,228-233,250-255,317-325`; `features/baby/server/notify.ts:29-41` | **Telegram notify blocks mutation response.** After feed/diaper/sleep/growth create, resolvers `await maybeNotifyBabyCareCreated` → link lookup + `fetch` to `api.telegram.org` before returning the care row. User-felt write latency tracks Telegram RTT/timeouts when enabled + linked. Fire-and-forget / `waitUntil` (or equivalent) after the DB commit; keep mutations DB-bound only. | fixed (Performance Fix round 1) · verified (re-run) |
| Enhancement | `components/baby-growth-page.tsx:6`; `components/baby-growth-chart.tsx:3-8` | **Visx charts not route-lazy.** Growth page statically imports `BabyGrowthChart`, which pulls `@visx/*`. Money/Loans chart UIs use `next/dynamic`. Prefer dynamic import so the form/list chunk is not gated on the chart bundle (`bundle-dynamic-imports`). | fixed (Performance Fix round 1) · verified (re-run) |
| Enhancement | `lib/baby-query-options.ts:145-149`; feed/diaper/sleep/growth forms | **Broad invalidate on every mutate.** `invalidateBabyQueries` hits `babyKeys.all` (profile, timeline, growth, telegram, sync). A diaper log can refetch sync config and growth even when those queries are mounted elsewhere. Prefer targeted keys (e.g. timeline + profile) for the write kind. | fixed (Performance Fix round 1) · verified (re-run) |
| Enhancement | `components/baby-timeline.tsx:41-48` | **Interval refetch + infinite pages.** `refetchInterval` on `useInfiniteQuery` refetches all loaded pages each tick. After several “Load more” pages, background sync multiplies timeline GraphQL cost. Cap active pages, refetch first page only, or reset to page 1 on interval. | fixed (Performance Fix round 1) · verified (re-run) |

**Round notes:**

- Performance lens (2026-09-06): Senior Verifier vs `performance-optimization` + `vercel-react-best-practices` (waterfalls, unbounded lists, hot-path I/O, bundle). Draft only — no Fix this round.
- Strong: timeline keyset + Zod limit; day-bounded client `from`/`to`; indexes on `(workspace_id, occurred_at)` / `(workspace_id, recorded_at)`; sync pause when tab hidden; no classic GraphQL field N+1; home is static (no bootstrap waterfall).
- Gaps cluster on **unbounded growth list**, **timeline dual-query waterfall**, and **awaited Telegram on write path**.
- **Performance review: not clean** — Fix required for Critical/Major (none Critical; three Majors), then re-run this lens. Do not start Memory until Performance is clean.

**Performance Fix round 1 (2026-09-06):**

- Growth: `babyGrowthListInputSchema` (limit 1–100) + keyset cursor; GraphQL `BabyGrowthConnection`; pure `pageBabyGrowthEntries` tests; UI infinite query + load more (no unbounded single fetch).
- Timeline: care + growth selects via `Promise.all`; existing merge/paging tests still pass.
- Notify: `scheduleNotifyBabyCareCreated` fire-and-forget + error log; create mutations no longer `await` Telegram; test asserts return before slow send finishes.
- Chart: `next/dynamic` (`ssr: false`) for `BabyGrowthChart` like Money charts.
- Invalidate: scopes `care` / `growth` / `telegram` / `all` — care → timeline+profile; growth → growth+timeline.
- Timeline sync: interval refreshes first page only via `replaceBabyTimelineFirstPage` (drops deeper pages); keeps `BABY_SYNC_INTERVAL_MINUTES` + hidden-tab pause.
- TDD skipped: dynamic chart import (bundle/UI structure).
- Verifier should re-run Performance lens (Fix does not self-approve).

**Verifier re-run (2026-09-06, after Performance Fix round 1):**

- Confirmed all six Fix round 1 claims **truly fixed** (no reopen):
  1. Growth — `babyGrowthListInputSchema` limit 1–100; keyset list; GraphQL connection; UI `useInfiniteQuery` + load more (no unbounded single fetch).
  2. Timeline — care + growth keyset selects via `Promise.all` (`timeline.ts` ~193–206).
  3. Notify — create mutations call `scheduleNotifyBabyCareCreated` (no `await`); test proves return before slow send finishes.
  4. Chart — `next/dynamic` (`ssr: false`) for `BabyGrowthChart` on growth page.
  5. Invalidate — scopes `care` / `growth` / `telegram` / `all`; care skips growth/sync; growth skips sync/telegram (unit-covered).
  6. Timeline sync — interval uses `replaceBabyTimelineFirstPage` (first page only; drops deeper pages).
- Spot-check suite (growth / notify / timeline / query-options / growth-series / sync-interval): **27 pass, 0 fail**.
- No new Critical / Major / Enhancement. FYI only: charts derive from loaded mixed-kind pages (page-bounded by design); bare `void` notify (vs `after()`/`waitUntil`) matches the finding’s fire-and-forget option — serverless delivery reliability is out of scope for this lens.
- **Performance review: clean.** Next lens: Memory.

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `components/baby-growth-page.tsx:81-91,93-114,277-315`; `lib/baby-query-options.ts` | **Growth infinite pages accumulate without a client window.** Server pages are capped (limit 1–100), but the UI `useInfiniteQuery` has no `maxPages` / reset. Each “Load more” keeps every prior page in the singleton `QueryClient`, then `pages.flatMap` feeds the full edit list and weight/height chart series. Mixed-kind paging means chart completeness pushes more pages. Timeline sync drops deeper pages via `replaceBabyTimelineFirstPage`; growth never windows. Cap pages, virtualize the list, or use a separate bounded series query for charts. | fixed (Memory Fix round 1) · verified (re-run) |
| Enhancement | `features/baby/server/notify.ts:48-59`; `lib/telegram/send.ts:27-36`; resolvers create paths | **Fire-and-forget Telegram notify has no fetch timeout.** `scheduleNotifyBabyCareCreated` voids `maybeNotifyBabyCareCreated` → `fetch` with no `AbortSignal` / timeout. If `api.telegram.org` stalls, each write (within GraphQL RPM) retains an in-flight promise + closures on long-lived Node until hang resolves. Bound concurrency or abort after N seconds so notifies cannot pile up unboundedly. | fixed (Memory Fix round 1) · verified (re-run) |
| Nit | `components/baby-timeline.tsx:57-74` | Sync `setInterval` does not abort or serialize in-flight `fetchBabyTimelinePage`. Cleanup clears the timer, but a slow tick can overlap the next; unmount still allows `setQueryData` on the shared client (usually fine). Prefer AbortController or an in-flight guard. | fixed (Memory Fix round 1) · verified (re-run) |
| FYI | `lib/rate-limit.ts:15-74` | Memory fallback `memoryBuckets` is hard-capped (`MEMORY_BUCKET_MAX_KEYS = 10_000`), prunes entries older than 5 minutes under pressure, then fail-closes. Baby GraphQL + Telegram webhook share this path when DB/`DATABASE_URL` is down. Not a leak for this lens. | — |
| FYI | Baby SQL / `features/baby/server/*` | No `SUM` / `::int` money-style casts on baby paths; lists use keyset `.limit(...)`. | — |
| FYI | Timeline / feed / nav providers | `visibilitychange` + sync interval, feed timer interval, and `useBabyNavLabel` `useSyncExternalStore` all remove listeners / `clearInterval` on cleanup. Yoga request `WeakMap`s are request-scoped. | — |

**Round notes:**

- Memory lens (2026-09-06): Senior Verifier vs checklist (listeners/timers, unbounded caches, module state, full result retention, bigint/SUM casts, long-lived refs). Focus: timeline sync, providers, telegram/notify, GraphQL, growth infinite query, rate-limit memory fallback.
- Strong: timer/listener cleanup; rate-limit Map bounded + fail-closed; GraphQL WeakMaps + per-request loaders; timeline day bounds + first-page sync reset; no baby SUM/int4 casts; server growth/timeline keyset caps.
- Gaps: growth client page accumulation (no window vs timeline reset); notify fire-and-forget without Telegram fetch timeout.
- **Memory review: not clean** — Fix required for Enhancements (none Critical/Major), then re-run this lens. Do not start merge/test until Memory is clean.

**Memory Fix round 1 (2026-09-06):**

- Growth: `BABY_GROWTH_MAX_PAGES` (4) + `babyGrowthNextPageParam` stops load-more once the newest window is full; `windowBabyGrowthInfiniteData` defensive trim; growth UI uses the next-page helper (keeps newest pages — unlike TanStack `maxPages`, which drops the start).
- Telegram: `sendTelegramMessage` always passes `AbortSignal.timeout` (default 8s); abort → `{ ok: false, error: "telegram_timeout" }`; fire-and-forget notify inherits the bound.
- Timeline sync: serialize with `babyTimelineSyncShouldFetch` + `cancelled` on unmount so overlapping first-page fetches / post-unmount `setQueryData` are skipped.
- TDD: query-options window/sync helpers + send timeout test.
- Verifier should re-run Memory lens (Fix does not self-approve).

**Verifier re-run (2026-09-06, after Memory Fix round 1):**

- Confirmed all three Fix round 1 claims **truly fixed** (no reopen):
  1. Growth — `BABY_GROWTH_MAX_PAGES = 4`; `babyGrowthNextPageParam` returns `undefined` once `allPages.length >= maxPages`; growth page `getNextPageParam` uses it (`baby-growth-page.tsx` ~87). Cap ≈ 4×50 rows in QueryClient / charts / edit list. `windowBabyGrowthInfiniteData` remains a tested defensive helper (not required on the happy path once next-page stops).
  2. Telegram — `sendTelegramMessage` always applies `AbortSignal.timeout` (`TELEGRAM_SEND_TIMEOUT_MS` 8s, overridable); abort → `telegram_timeout`; `scheduleNotifyBabyCareCreated` → `sendTelegramMessage` inherits the bound. Hung-fetch unit test passes.
  3. Timeline sync — `babyTimelineSyncShouldFetch(inFlight)` serializes ticks; `cancelled` skips `setQueryData` after unmount; `clearInterval` on cleanup (`baby-timeline.tsx` ~59–85).
- Spot-check suite (`lib/baby-query-options.test.ts` + `lib/telegram/send.test.ts`): **11 pass, 0 fail**.
- No new Critical / Major / Enhancement. Residual FYI: timeline load-more can accumulate until the next first-page sync reset (already mitigated by `replaceBabyTimelineFirstPage`); unused-in-UI `windowBabyGrowthInfiniteData` is Nit-only.
- Spot-check prior Memory FYIs still hold: rate-limit Map capped + fail-closed; feed timer / visibility / nav-label cleanups; Yoga WeakMaps; no baby SUM/int4 casts.
- **Memory review: clean.** All review lenses clean → parent orchestrator: Gate 3 / `my-merge-workflow` next (after `my-test-workflow` if that stage is still pending).

---

## Fix notes (TDD skipped)

List any docs-only items where TDD was skipped:

- Quality Fix round 2: skeleton parity (`BabyDiaperSkeleton`, feed timer row) — structural UI; verified by matching live layout. Behavior i18n keys covered by `lib/baby-i18n.test.ts`.
- Security Fix round 1: settings pending-hint copy + `confirmedAt` GraphQL field — UI/i18n; ownership confirm covered by `notify.test.ts` + `commands.test.ts`. Residual risk: until first message, a wrong numeric `chatId` only blocks notifies/commands (no PII sent); confirm still required before bot writes target that chat.
- Security verifier re-run after Fix round 1: residual above **was incorrect for production** — confirm lacked RLS bypass and write gate; closed in Fix round 2.
- Security Fix round 2: behavior covered by TDD — confirm persist assert in `notify.test.ts`; write gate in `commands.test.ts`; CL-omit bound in `request-guards.test.ts` + webhook 413.
- Security verifier re-run after Fix round 2: ownership + body-bound claims **verified**; residual Model B wrong-`chatId`-until-confirm remains FYI only (no Critical/Major/Enhancement reopen).
- Performance Fix round 1: dynamic chart import — TDD skipped (bundle/UI structure); behavior covered by growth paging + invalidate + notify schedule + timeline first-page helper tests.
- Performance verifier re-run after Fix round 1: all 6 Performance findings **verified**; lens **clean**.
- Memory Fix round 1: behavior covered by TDD (growth window helpers, telegram timeout, timeline sync serialize helper).
- Memory verifier re-run after Fix round 1: all 3 Memory findings **verified**; lens **clean**. All review lenses clean.

---

## UI polish quality (2026-09-06)

**Scope:** Hamburger Baby entry; Money-style chrome (no shell rail); language EN/VI moved to settings. Key files: `lib/app-section-nav.ts`, `lib/money-tabs-chrome-path.ts`, `lib/baby-app-header.ts`, `components/baby-route-layout.tsx`, `app/(shell)/baby/layout.tsx`, page/form heading cleanup, `components/baby-settings-page.tsx`, skeletons, `money-section-tabs.tsx`, e2e, messages.

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Enhancement | `components/baby-settings-page.tsx` (language buttons) | **Language exclusive choice ignores settings radiogroup pattern.** Theme/date-format settings use `role="radiogroup"` + `role="radio"` + `aria-checked` (and quick-pick chips). Baby language uses two plain `Button`s with primary/secondary only — selected state is mostly color, no accessible checked state. Match `theme-settings.tsx` / `date-format-settings.tsx`. | fixed |
| Enhancement | `components/money-section-tabs.tsx` (Apps list / `OtherAppsJumpLinks`); `use-baby-nav-label.ts` | **Hamburger Baby label stays English after VI.** Page titles use `t()`; `useBabyNavLabel` exists for `nav.label`, but is only called from `MenuFooterLink` (core Help/Settings — never `id === "baby"`). Apps switcher and Other apps links still render `APP_SECTION_NAV.baby.label` ("Baby Care"). Wire the live label into those links (and any Baby section heading). | fixed |
| Enhancement | `components/baby-page-skeleton.tsx` `BabySettingsSkeleton`; `baby-settings-page.tsx` | **Settings skeleton ≠ telegram-off live UI (CLS).** Skeleton always paints language card + Telegram card. When `telegramEnabled` is false, live UI is language card + one muted line (`telegram.off`). Route `loading.tsx` cannot branch on env today — either mirror the off path (short bar) for the common disabled case, or keep a stable Telegram-section shell in the live off state. | fixed |
| Nit | `lib/app-section-nav.ts` baby items | Sleep uses icon `"bills"`, diaper uses `"import"` — reused Money glyphs that do not read as nap/diaper in the hamburger. Prefer dedicated icons or neutral reuse (e.g. `new` / `settings`-adjacent) if new assets are out of scope. | open |
| Nit | `messages/baby/en.ts`, `vi.ts` | `common.back` is unused after in-page Back removal (breadcrumbs replace it). Drop or keep only if a Back control returns. | open |
| FYI | Chrome wiring | `isBabyChromePath` + `hidesShellRailChrome`, `APP_SECTION_ORDER`/`APP_SECTION_NAV.baby`, registry icon, `BabyRouteChrome` + `resolveBabyAppHeader` match Loan/Money heading + breadcrumb pattern; home/forms lost duplicate h1/back; e2e covers hamburger → Baby, CTAs, settings EN↔VI. | — |
| FYI | `docs/DESIGN_GUIDE.md` | Rail-hide copy still lists Money/Investments/Loans only — docs lag code (Baby now hides rail). Out of polish code scope. | — |

**Round notes:**

- Strong: Money-style `PageHeading` + `MoneyAppMenu`; shell rail hidden on `/baby/**`; language removed from home and placed on settings; per-route skeletons drop in-page title rows (heading in layout); unit tests for section path + chrome path + header resolver; e2e updated for settings locale.
- **Fix round 1:** Language → radiogroup + `moneyQuickPickChipCls`; hamburger Apps/Other apps + menu aria use `useBabyNavLabel` via `appSectionDisplayLabel`; `BabySettingsSkeleton({ telegramEnabled })` + settings `loading.tsx` reads `isTelegramEnabled()`.
- **UI polish quality: clean** (Enhancements fixed; Nits left open).

