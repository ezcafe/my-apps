# Analysis: Baby home for fast night care

## What exists today

Baby home (`components/baby-home.tsx`) shows a **"Last care" strip first** (last feed / nap / diaper with "10 min ago" text) and then **four plain link buttons** that send the caregiver to separate form pages: `/baby/feed`, `/baby/sleep`, `/baby/diaper`, `/baby/measure`. Nothing can be logged from home.

The three care forms already hold most of the logic we need, just spread out:

- **Feed** (`components/baby-feed-form.tsx`) has a **local, in-memory timer** (Start / Stop, 250 ms tick, elapsed from `Date.now() - startedAt`) plus four method buttons (Breast L, Breast R, Formula, Pump) and optional ml / seconds inputs.
- **Sleep** (`components/baby-sleep-form.tsx`) has **no local timer**. It asks the server "is a nap open?" (`babyOpenSleep`), then Start / End call `startBabySleep` / `endBabySleep`. The open nap is a real database row with `ended_at IS NULL`.
- **Diaper** (`components/baby-diaper-form.tsx`) is three buttons: wet, dirty, mixed.

All writes go through one GraphQL route, `POST /api/graphql/baby` (`lib/graphql/baby-typeDefs.ts`, `features/baby/server/care-events.ts`). The mutations we need already exist and need **no schema change**:

| Action | Mutation | Notes |
|--------|----------|-------|
| Breast feed | `createBabyFeed(input: { method: "breast_l" \| "breast_r", durationSec })` | One closed event, duration stored in payload |
| Formula | `createBabyFeed(input: { method: "formula", amountMl })` | `amountMl` is a positive float, no value list on the server |
| Diaper | `createBabyDiaper(input: { kind: "wet" \| "dirty" \| "mixed" })` | |
| Sleep | `startBabySleep` / `endBabySleep` | Server keeps one open nap per baby |

Row 3 ("what happened last?") is already fed by `babyLastCareStatusQueryOptions()` in `lib/baby-query-options.ts`. It walks up to 3 timeline pages × 50 rows and reduces to last feed / sleep / diaper (`lib/baby-last-care-status.ts`). The server already builds a human summary like `Feed (Breast L) · 12m` and `Diaper (wet)` (`features/baby/server/timeline.ts`), and an open nap comes back with `endedAt == null`, which home already renders as "Napping now".

## Dependencies

**Same repo. Front-end plus three small server additions** (Option B, settled 2026-09-12; the third was added after design review round 1). No new HTTP route, no other repo. All three live on the existing `POST /api/graphql/baby` surface: the `babyHomeQuickStatus` query, the `babyQuickCare` mutation (the ordered auto-finalize chain, run server-side in one transaction), and the `updateBabyProfile` mutation.

**One migration, added after design review round 2:** a new `baby_quick_care_request` table that stores the ordered result of a quick-care press so the same request id always gets the same answer. No existing table, column, index, or enum changes. It follows `db/migrations/0038_baby_vaccine.sql` exactly, including `ENABLE`/`FORCE ROW LEVEL SECURITY` and a `workspace_id = app_current_workspace_id()` policy. Generated with `npm run db:generate`, applied with `npm run db:migrate`.

**Two existing care mutations get one mechanical change, also from round 2:** `startBabySleep` and `endBabySleep` run their bodies inside the shared nap lock. Inputs, outputs, and error codes are unchanged. Nothing else about the four existing care mutations moves.

- **Cache key coupling:** home status lives under `babyKeys.timeline("", "")` today. Under Option B home moves to `babyKeys.homeQuick(dayKey)`, still inside the `["baby","timeline"]` prefix so `invalidateBabyQueries(queryClient, "care")` keeps refreshing it, but no longer sharing a slot with the Insights infinite query. Every care write must still call that invalidation or row 3 goes stale.
- **Post-save navigation must change:** `lib/baby-care-save-navigate.ts` pushes the user to `/baby` after a save. On home itself the save must **stay** (`afterSave: "stay"`), so `BABY_CARE_AFTER_SAVE` needs a home-quick-save entry.
- **Sleep is server state, not local state.** The open nap is enforced by a unique partial index `baby_care_event_open_sleep_uq` on `(baby_id) WHERE type='sleep' AND ended_at IS NULL` (`db/schema/baby.ts`). A second Start returns `CONFLICT`. The new home sleep button and the existing `/baby/sleep` form will both drive the same single row — see blocking question 1.
- **Breast feed has no server session.** A feed is one closed event with `durationSec`. So the breast timer must be client-side only, which matches the Gate 1 "local persist" pick.
- **i18n is a two-file contract:** `messages/baby/vi.ts` is typed `Record<BabyMessageKey, string>`, and `BabyMessageKey` comes from `messages/baby/en.ts`. Any new key added to `en.ts` **fails typecheck** until `vi.ts` has it too.
- **Telegram notify still fires.** Care writes go through `features/baby/server/notify.ts`. Quick saves from home will send the same family-chat messages as the forms. That matches the "no Telegram changes" non-goal, but the message volume will go up.
- **Existing e2e will break.** `e2e/baby-care.spec.ts` asserts home has `link` roles named "Log feed" / "Log nap" / "Log diaper" / "Log measurement" and that they navigate. If those links move or change, those tests must be updated in the same change.
- **Skeleton parity is mandatory.** `BabyHomeSkeleton` in `components/baby-page-skeleton.tsx` (used by `app/(shell)/baby/loading.tsx`) currently draws the old strip + four buttons and must be rewritten to the new three rows.

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-home.tsx` | The file to rewrite. Keep the `BabyHomeContent` (pure, props-in) + `BabyHome` (query wrapper) split — the unit test renders the pure one. |
| `components/baby-feed-form.tsx` | Copy the timer shape: `startedAt` timestamp + `setInterval` tick + elapsed from `Date.now()`. Copy the `useTransition` pending → disable pattern. |
| `components/baby-sleep-form.tsx` | Copy the open-nap check, fail-closed disable, retry button, and `data-check-pending` test hook. Also shows the `CONFLICT` error handling. |
| `components/baby-diaper-form.tsx` | Simplest save path: mutate → `invalidateBabyQueries(…, "care")` → `notify.success`. |
| `lib/baby-care-session-state.ts` | The house style for interactive logic: **pure functions in `lib/`, unit-tested**. New stepper / timer / breast-switch rules belong here, not inline in the component. |
| `lib/baby-care-save-navigate.ts` | `runBabyCareSaveThenNavigate` + `BABY_CARE_AFTER_SAVE`. Add the home "stay" contract here so a test can lock it. |
| `lib/baby-query-options.ts` | `babyLastCareStatusQueryOptions`, `invalidateBabyQueries`, `babyKeys`. Row 3 data source. |
| `lib/baby-last-care-status.ts` | `lastCareStatusByType` shape that row 3 consumes (`type`, `at`, `endedAt`, `summary`). |
| `lib/baby-format-care-when.ts` | "10 min ago" / "Yesterday · 2:15 AM" wording, locale-aware, already 12-hour and easy to scan. |
| `lib/baby-format-duration.ts` | `formatBabyDurationCompact` → `12m`, `1h 5m`. Reuse for the running timer title. |
| `components/baby-page-skeleton.tsx` | `BabyHomeSkeleton` must mirror the new rows exactly (order, grid, radii). |
| `components/ui/button.tsx` | `Button` / `buttonClassName`. Note `iconOnly` adds the 44×44 hit area automatically. |
| `components/ui/icon-swap.tsx` | Required primitive for any play/pause-style icon change on the breast and sleep controls. |
| `components/icons/icon-baby-nav.tsx` | Existing bottle / moon / diaper SVGs (`IconBabyFeed`, `IconBabySleep`, `IconBabyDiaper`). e2e asserts these exact path shapes. Breast needs a new glyph. |
| `components/baby-locale-provider.tsx` | The repo's `localStorage` + try/catch write pattern to copy for timer persistence. |
| `messages/baby/en.ts` + `messages/baby/vi.ts` | Add every new label to both. Vietnamese labels are long ("Ngực phải", "Sữa công thức") — plan for text wrap. |
| `components/baby-home.test.ts` | Unit test style: `node:test` + `renderToStaticMarkup`, assert on the HTML string. |
| `e2e/baby-care.spec.ts` | Playwright patterns to extend: GraphQL `page.route` mocks, `getByTestId("baby-home-status")`, and the "3AM eye flow" checks that assert control height ≥ 56 px and top-to-bottom order. |
| `docs/DESIGN_GUIDE.md` | Non-optional. Token names, concentric radii, transition specificity, hit-area rules. |
| `components/ui/modal.tsx` | The Custom ml modal must use this. It is a native `<dialog>` with `showModal()`, so the focus trap, the dimmed backdrop, `aria-modal`, and Escape (via the `cancel` event → `onClose`) all come free. Do not hand-roll a trap. **It has no backdrop-click handler** and it renders through `createPortal`, returning `null` until mounted — so a `renderToStaticMarkup` test of the wrapper sees nothing. Test the modal body on its own. See R6 and R7. |
| `components/loan-pay-modal.tsx` | A working example of `Modal` + `Field` + `Input` + confirm/cancel buttons. Copy the shape. |
| `components/ui/field.tsx` | Has an `error` prop that takes precedence over `hint` — used for the Custom ml validation message and the birth-date error. |
| `components/baby-settings-page.tsx` | Where the birth-date field goes. Copy its `SettingsSection` + `startTransition` + `notify.success` / `notify.error` pattern from the Telegram block. |
| `features/baby/server/profile.ts` | `ensureBabyProfile` / `getBabyProfile`. `updateBabyProfile` lands next to them. |
| `features/baby/server/timeline.ts` | `careSummary()` — the new `babyHomeQuickStatus` service must reuse it so home wording never drifts from the timeline or Telegram. |
| `features/baby/server/care-events.ts` | `findOpenSleep()` — reuse for `openSleep`; do not write a second open-nap query. |
| `lib/graphql/baby-typeDefs.ts` + `lib/graphql/baby-resolvers.ts` | Where the two new fields go. Resolvers show the house pattern: `requireBabyWorkspace` / `requireBabyWriteWorkspace` → `runInWorkspace` → serialize → `mapServiceError`. |
| `lib/validators/baby.ts` | Where the two new Zod schemas go, next to the existing care schemas. |
| `lib/graphql/baby-yoga.test.ts` | The convention for testing a resolver through the real schema with the service stubbed. All three new fields need a case here. |
| `db/migrations/0038_baby_vaccine.sql` | The template for the one new migration: create table, foreign keys, indexes, then `ENABLE` + `FORCE ROW LEVEL SECURITY` and a `workspace_id = app_current_workspace_id()` policy. drizzle-kit does not emit the policy — it is hand-added after `npm run db:generate`. |
| `lib/pg-unique.ts` | `isPgUniqueViolation`, already used for the open-nap conflict. Reused for the unique-key fallback on the new request table. |
| `lib/workspace-reset.test.ts` | The live-database test pattern: `const hasDb = Boolean(process.env.DATABASE_URL)` plus `{ skip: !hasDb }`. The lock and replay race tests copy it. |
| `features/baby/server/notify.ts` | `scheduleNotifyBabyCareCreated({ workspaceId, kind, summary, source })`. `kind` is `feed | diaper | sleep | growth`, so quick care has nothing new to add — it just calls it for the right steps. |
| `lib/graphql/baby-resolvers.ts` | Also the source of truth for **which** writes notify today: `createBabyFeed`, `createBabyDiaper`, and `startBabySleep` do; `endBabySleep` does **not**. See R17. |

## Constraints and risks

**No React testing library in this repo.** `npm test` is `node:test` + `renderToStaticMarkup` over `lib/**`, `components/**`, `db/**`, `features/**`. Clicks and long-press cannot be unit tested. So the stepper list walk, diaper cycle, breast-switch rule, and timer restore **must be pure functions in `lib/`** with their own tests; the component only wires them. Real interaction proof comes from Playwright.

**Nested buttons are invalid HTML.** A "+ / − with a center save" control cannot be a `<button>` inside a `<button>`. It has to be one container with three sibling controls (− , save, +) that only *looks* like one big card. This is the single easiest thing to get wrong in Build.

**No duplicate protection on the server today.** `createBabyFeed` and `createBabyDiaper` have no idempotency key, and the open-nap unique index only protects sleep. Gate 1 rejected Undo. Disabling the control while the mutation is in flight is **not** enough on its own, because React sets `disabled` a render later — see R4 below. The design adds a per-press request id on the new quick-care mutation, taken under the shared nap lock, and (after round 2) **stores the ordered result** in a small new table so a replay returns the first answer instead of writing again. That is the one migration in this pass — see R13.

**Nothing in the Baby feature runs in a transaction today.** Every function in `features/baby/server/care-events.ts` calls `db` directly. `startBabySleep` reads the open nap, then inserts; `endBabySleep` reads it, then updates. Both are check-then-act with no lock, which is why round 2 found that a form save could still break the quick-care order — see R12.

**There is a working pattern for live-database tests.** `lib/workspace-reset.test.ts` guards a real-Postgres suite with `const hasDb = Boolean(process.env.DATABASE_URL)` and `{ skip: !hasDb }`. The lock and the replay cannot be proved with stubs, so the new concurrency tests copy that shape.

**Timer must be time-based, never a counter.** Phone lock, tab backgrounding, and throttled timers make interval counting drift. Store the start timestamp and always recompute `Date.now() - startedAt`. Local knowledge (`Work/Dev/Js/Javascript features.md`) points at the **Page Visibility API** (`visibilitychange`) to refresh the display immediately when the screen comes back, which is exactly the Gate 1 "survives lock" criterion.

**Two tabs on one device can show two timers.** `localStorage` is shared, so each tab must read the stored start on mount rather than keep private state. Local knowledge also lists **`BroadcastChannel`** (supported in Safari) if we want live cross-tab agreement without a server. Gate 1 only requires same-device survival, so this is a "don't create a second timer" correctness point, not a new feature.

**No ml whitelist on the server.** `createBabyFeedSchema.amountMl` is any positive number. Settled (Q4, 2026-09-12): it **stays** that way. The age band and the Custom modal's 10–300 bounds are caregiver guard rails in the UI, not a server check.

**Cases found in design review round 1 (2026-09-12).** Each one is a concrete way the first design could save the wrong thing. The last column says whether Design must fix it or may accept it.

| # | Case | What goes wrong | Fix or accept |
|---|------|-----------------|---------------|
| R1 | **Stale open nap.** The client plans the chain from a cached `openSleep`. The other caregiver starts a nap after that read and before the press lands. | The pressed action is saved without ending the open nap. The confirmed order breaks, and a nap stays open through a feed. | **Must fix.** Decide and run the ordered steps on the server, against current rows, in one transaction. |
| R2 | **Split mutations.** Even with fresh data, four separate mutations leave a check-then-act gap between every step, and a mid-chain failure leaves a half-done chain. | Partial saves the caregiver has to reason about at 3AM, with no Undo. | **Must fix.** One request, one transaction, all-or-nothing. |
| R3 | **Stale `dayTo`.** `babyLocalDayWindow(now)` put "now" in `dayTo`, but the React Query key only held `dayKey`. A feed saved after the first read falls outside the cached upper bound. | `feedsToday` is quietly low, so `n/N today` is wrong — the one number the caregiver uses to decide the next bottle. | **Must fix.** Use a half-open local-day window `[local midnight, next local midnight)` so the key fully determines the window. |
| R4 | **React `saving` flag is not synchronous.** `setSaving(true)` does not disable the button until React re-renders, so two fast taps can both enter the handler. | Two feeds or two diapers from one press. There is no idempotency key on the server today. | **Must fix.** Synchronous in-flight ref lock on the device, plus a per-press request id the server recognises on replay. |
| R5 | **`Date.parse` accepts impossible dates.** JavaScript normalises `2026-02-30` to March 2 and `2023-02-29` to March 1. | An invalid birthday is stored, then silently picks the wrong age band and the wrong bottle default. | **Must fix.** Validate year, month, and day as calendar parts and round-trip them exactly. |
| R6 | **`components/ui/modal.tsx` has no backdrop-click handler.** It handles the `cancel` event (Escape), a ✕ close button, and whatever buttons the body renders. Clicking the backdrop does nothing. | The design and its tests promised backdrop-to-cancel, which would fail. | **Must fix the contract**, not the primitive. Drop backdrop cancel; keep Escape, ✕, and Cancel. Changing the shared primitive would touch every other modal caller and is out of scope. |
| R7 | **`Modal` renders through `createPortal` and returns `null` until mounted.** `renderToStaticMarkup` sees nothing. | A "modal markup" unit test would pass while asserting an empty string. | **Must fix the test plan.** Unit-test the modal **body** component on its own; prove the dialog wiring in Playwright. |
| R8 | **Raw server error text is JSON.** `parseOrThrow` throws `Validation failed: <Zod issues JSON>` and `mapServiceError` passes that string through as `BAD_REQUEST`. | Showing it on a field would print a JSON blob in both languages. | **Must fix.** Server emits a stable token; the client maps the token to a local English or Vietnamese string and never renders the raw message. |
| R9 | **Age across midnight and DST.** Elapsed-milliseconds age and calendar-day age disagree by one day around local midnight and on DST-shift days. | The bottle default jumps a band for no visible reason. | **Must fix.** Define age as a calendar-day difference in the caregiver's local zone. |
| R10 | **No server bound on `amountMl`.** Unchanged from today (Q4). | A bad client can post any positive amount. | **Accept.** UI guard rail only, same as today. |
| R11 | **Telegram volume goes up.** Quick saves reuse the same notify path. | Noisier family chat. | **Accept.** Non-goal says no Telegram changes. |

**Cases found in design review round 2 (2026-09-12).** Round 1 added the right pieces, but each one was scoped too narrowly to keep its promise.

| # | Case | What goes wrong | Fix or accept |
|---|------|-----------------|---------------|
| R12 | **The lock covered only the new mutation.** `startBabySleep` and `endBabySleep` take no lock and run no transaction, so a full-form nap start can land between the quick chain's nap read and its write. | A diaper or feed is committed with a nap left open. The confirmed order is still not guaranteed with two caregivers, which was the whole reason the chain moved to the server. | **Must fix.** One shared lock helper used by every path that can start or end a nap, including the existing sleep mutations. Prove it with live-database race tests — a stubbed call-order test cannot prove a lock. |
| R13 | **The replay lookup scanned care rows by `occurred_at`.** Ending a nap adds the request id to a row whose `occurred_at` never moves, and the rows carry no step name or order. | A retry of a nap-only press writes a second chain. A multi-step chain cannot be rebuilt in the same order. And a 10-minute expiry is not "exactly once" at all. | **Must fix.** Store the full ordered result keyed by workspace + request id, with no time filter. That is one small additive table with RLS — the single migration in this pass. |
| R14 | **Only the breast timer's request id was persisted.** A bottle, diaper, or sleep press stored no request body. | After a reload the device knows an id but not what the press was, so it can neither retry nor tell the caregiver anything. The stated exactly-once promise covered duplicates but left a silent miss. | **Must fix.** Persist one scoped pending record with the whole request, plus explicit clear and retry rules and a visible Retry-or-Discard line. Narrow the promise in `01-idea.md` to match: no duplicates, not no misses. |
| R15 | **The day window never rolled over.** `babyHomeQuickStatusQueryOptions(now)` only changes on a render. | A home page left open on a bedside phone keeps yesterday's `dayKey`, so `feedsToday` and `n/N today` are wrong after midnight — the one number that decides the next bottle. | **Must fix.** A local-midnight timer that recomputes the window and the query key, with `visibilitychange` and `focus` as the backup for a throttled timer. |
| R16 | **Two order models.** The server returned the real steps, but the client still built `expectedSteps` from a cached `napOpen` and used it in labels. | A tired caregiver can be shown a step preview that the server then does not do. No required behaviour needs the preview. | **Must fix.** Remove `expectedSteps`. Show generic wording while saving and the server's committed steps afterwards. |
| R17 | **Telegram behaviour was described two ways.** "Unchanged" and "notify once per committed step" disagree, because `endBabySleep` notifies nothing today. `BabyQuickCareStepResult` also returned only an id, which is not enough to build a summary. | A nap ending would start being announced as a side effect of a quick-log redesign, and the resolver would need an extra read per step. | **Must fix.** Notify for feed, diaper, and started nap only. Return the committed row in each step result. A behaviour change for `endNap` is a separate product choice. |

**Cases found in design review round 3 (2026-09-12).** Round 2 got the shapes right but left four holes.

| # | Case | What goes wrong | Fix or accept |
|---|------|-----------------|---------------|
| R18 | **Sleep-row corrections stayed outside the lock.** `updateBabyEvent` can set a sleep row's `ended_at` back to `null` (reopen a nap) and `deleteBabyEvent` can delete an open sleep row (`features/baby/server/care-events.ts`). Neither took the shared lock. | A correction landing between the quick chain's in-transaction nap read and its write can leave a diaper committed with a nap freshly reopened, or two open naps. The design's claim that these mutations "cannot change the open-nap answer" was false. | **Must fix.** Take the shared lock when the target is a sleep row (a type pre-read decides). Keep feed/diaper corrections lock-free. Add live-database reopen and delete race tests. |
| R19 | **Pending write had no fail-closed rule.** The record was "written before the request leaves", but nothing said what happens when `localStorage.setItem` throws or the value cannot be read back. | Sending the request anyway leaves an unknown press with no Retry bar after a reload — a silent miss, breaking the "never silently lost" promise. | **Must fix.** Persist, read back, and verify. If it cannot be stored and verified, do not send; keep local values and show a local save-blocked line. Test with `setItem` forced to throw. |
| R20 | **Clear rule trusted response shape, not error code.** Task 5 treated any returned GraphQL error as definite. But `mapServiceError` turns unknown post-commit errors into `BAD_REQUEST`, and an `INTERNAL_SERVER_ERROR` can arrive after the transaction committed. | Clearing the pending record on such a code removes the only safe replay path for a press that did commit. | **Must fix.** Classify by trusted code. Clear only for `UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND`; keep `BAD_REQUEST`, 5xx, internal, and unknown as ambiguous. One classifier shared by Task 5 and the e2e. |
| R21 | **"Empty steps is impossible."** The API contract and Task 5c said a BREAST press always writes a `saveBreast` row and that an empty result cannot happen. | An idle breast start with no open nap writes no row, so the server stores an empty result — contradicting the contract and the tasks, and leaving the empty-replay case untested. | **Must fix.** Allow an empty `steps`, store and replay it, and test it on the server and the client. Remove the "empty is impossible" and unconditional-`saveBreast` wording. |

**Gate 2 pause addition (2026-09-12) — next-due button subtitles.** Idle care controls show countdown/overdue from last event + age frequency table (earlier bound). Pure `lib/baby-next-due.ts`. Shared next-feed on L/R/bottle. Sleep uses awake time since last nap **ended**. No birthDate → hide next lines. Solids schedules stay out of scope. See `01-idea.md` / `03-design.md` “Next-due subtitles”.

**Design system hard rules that apply here:**
- Semantic tokens only; outer surfaces `rounded-[var(--radius-md)]`, nested chips/steppers `rounded-[var(--radius-sm)]`.
- Name transition properties exactly (`transition-[opacity,transform]`), never the `transition` shorthand.
- Icon-only controls need a ≥ 44×44 hit area (`iconOnly` on `Button`, or `fx-hit-40` on raw elements) and **two extended hit areas must not overlap** — a real risk with − and + close together on a one-third-width control.
- No hardcoded breakpoints. Use `repeat(auto-fit, minmax(...))` and container queries. Local CSS knowledge (`Work/Dev/CSS/CSS tips.md`) backs this: intrinsic grid + `clamp()` + `@container` for structure changes, and `@media` reserved for capability and preference (`pointer: coarse`, `prefers-reduced-motion`).
- Microinteractions are CSS-only (`fx-press`, `fx-fade-in`, `IconSwap`). No motion library.
- Must survive light/dark switching in `/settings`.

**Accessibility is a stated non-goal to break.** The value control must work with touch, keyboard, and a screen reader. Long-press auto-repeat has no keyboard equivalent, so keyboard and assistive tech need a single-step path that reaches every value, and the shown value needs a polite live announcement.

**Three large controls in one row is tight.** Row 2 is formula + sleep + diaper, and two of them carry a − / value / + stepper. In Vietnamese the labels are longer than English. Use container queries so row 2 can stack when its own width is small, instead of guessing a viewport width.

**Existing e2e "3AM eye flow" expectations.** Current tests require care controls at least 56 px tall (`min-h-14`) and in reading order. Keep that floor or higher for the new rows.

## Settled decisions (do not relitigate)

Copied from `01-idea.md` → "Settled after Gate 1 (2026-09-11)".

- **Row 1 — breast:** Left and right breast. Tap starts the timer, shown in the control's title. Tap the same control again saves the feed. Tapping the other breast while one is running **saves the running side, then starts the other side**.
- **Timer persistence:** Survives phone lock and page reload **on the device that started it**. The live timer is **not** synced to another caregiver's phone.
- **Row 2 order:** formula bottle, sleep, diaper.
- **Formula amounts:** Superseded by Q7 and the 2026-09-12 design decision. `+` / `−` step by 10 inside the **age band** and clamp at its edges; the default is the mid-band value. An explicit **Custom** control opens a modal for an exact whole-ml value between 10 and 300. Return to the age default after a successful save (do not remember the last amount). With no birth date on file, the fallback band is 60–150 ml with default 120. No medical or "doctor recommended" wording.
- **Diaper:** Default wet. Cycle order wet → dirty → mixed → wet.
- **Undo:** None. Disable the control while saving so a second press cannot create a duplicate.
- **Sleep:** Large sleep button in row 2, after the bottle, before the diaper. Tap starts a timer in the title; tap again records the session. Independent from the breast timer.
- **Value change (formula and diaper):** Visible **+ / − stepper** on the large control. Center tap saves. Long-press on + / − repeats. Drag is **not** the primary control.
- **Row 3:** Last feed, how long ago, last sleep, last diaper — readable at 3AM.
- **Keep** the existing full forms and history for detailed entry and corrections.

## Analyze Q&A (settled 2026-09-12)

- **Q1 Sleep:** **A** — reuse `startBabySleep` / `endBabySleep` (server open nap). Live nap is shared across caregivers. Gate 1 “same device only” applies to the **breast** timer.
- **Q2 Home links:** **B** — drop the four home link CTAs. Full forms (including measurement) stay reachable from the Baby menu only.
- **Q3 Breast stamp time:** working default — **save time** (today’s server “now”).
- **Q4 ml whitelist:** working default — **UI-only** on home for the age-band snaps and for the Custom modal's 10–300 bounds. The server still accepts any positive `amountMl`. Full feed form / Telegram can still store other amounts.
- **Q5 Breast timer elsewhere:** working default — **home only** (survives lock/reload/navigation back to home on this device).
- **Q6 Row 3 guide:** **A+C** — last-feed line shows `time ago · n/N today`; age ml band drives bottle default/range only (no long guide paragraph on row 3). Missing `birthDate`: show `n today` without `/N`, **and prompt the caregiver to add the birthday** (settled 2026-09-12).
- **Q7 Formula list:** **A + custom** — primary +/− snaps are the **current age band** (step 10), default = mid-band rounded to step, **clamped at the band edges**; after save return to age default. **Custom value** comes from an explicit Custom control that opens a **modal** for an exact whole-ml value between 10 and 300 (settled 2026-09-12). Stepping past the band edge is not the custom path.
- **Q8 Formula vs open breast:** **A** — save open breast first, then log formula.

## New requirements (user 2026-09-12)

**Auto-finalize open sessions before another care action:**

| User action | If breast timer running | If open nap exists |
|-------------|-------------------------|--------------------|
| Start/save breast or formula (feed) | (breast-switch rules still apply between L/R); formula saves open breast first | End nap first, then do the feed action |
| Start/end nap | Save breast feed first, then do nap | (normal nap start/end) |
| Log diaper | Save breast feed first | End nap first | then log diaper |

Order when both are open and diaper is pressed: **breast save → nap end → diaper create**.

**Updated 2026-09-12 (review round 1):** the order above is unchanged, but it is now decided and run **on the server**, in one transaction, against current rows — see R1 and R2. Failure is all-or-nothing: the transaction rolls back and nothing is saved, instead of a chain that stops halfway. The device keeps its breast timer until the server confirms, so a rolled-back chain loses nothing.

**Updated 2026-09-12 (review round 2):** the order is still unchanged. What changed is that **every** nap writer now runs behind one shared lock (R12), the replay is answered from a stored result rather than a row scan (R13), and the client no longer previews the order at all (R16).

**Age-based formula guidance** (caregiver-facing copy, not medical advice): use baby `birthDate` from profile to pick a band. Bands from user:

| Age | ml per feeding | feeds/day (guide) |
|-----|----------------|-------------------|
| 0–1 week | 30–60 | 8–12 |
| 1–4 weeks | 60–120 | 6–8 |
| 1–2 months | 90–120 | 6–7 |
| 2–3 months | 120–150 | 5–6 |
| 3–6 months | 150–180 | 5 |
| 6–9 months | 180–240 | 4–5 |
| 9–12 months | 180–240 | 3–4 |
| 12–18 months | 120–180 | 2–3 |
| 18–24 months | 120–180 | 1–2 |

Row 3 feed line: last feed + time ago + `n/N today` (guide max for age). Bottle: age-band snaps + custom.

**Profile dependency:** `birthDate` already exists as a nullable `text` column (`db/schema/baby.ts`) and is already exposed on the GraphQL read (`BabyProfile.birthDate`). **Nothing can write it** — there is no `updateBabyProfile` mutation, no Zod schema, and no field in `components/baby-settings-page.tsx`. Settled 2026-09-12: Design adds that write contract, `/baby/settings` gets a birth-date field, and home prompts while it is unset. Until it is set, show the feed count without `/N` and use the fallback bottle band (60–150 ml, default 120).

---

**Are the instructions and reference files clear enough to design?** Yes — Q1–Q8 settled. Proceed to Design.
