# Tasks: Baby home for fast night care

**Design:** [`03-design.md`](03-design.md) · **Option B** — one new server read (`babyHomeQuickStatus`), one new server write for the ordered care chain (`babyQuickCare`), one new server write for the birthday (`updateBabyProfile`), and **one additive migration** for the durable request record. Pure rules still live in `lib/`. Pending Gate 2.

**Updated after design review round 1 (2026-09-12).** The chain moved to the server (new Task 5c), skeleton parity moved into each row task, and tests were added for concurrent naps, count refresh, double-tap locking, impossible and leap dates, local-midnight and DST age boundaries, and localized field errors.

**Updated after design review round 2 (2026-09-12).** Four new tasks and one scope change:

- **New Task 5m** — the `baby_quick_care_request` table and its migration. **This pass now has one migration.**
- **New Task 5d** — one shared nap lock, taken by `babyQuickCare` **and** by the existing `startBabySleep` / `endBabySleep`. Their contracts do not change.
- **New Task 4a** — the pending-request store, so a reload can retry the exact press for bottle, diaper, sleep, and breast.
- **New Task 10b** — the pending-save bar and the local-midnight rollover in the page.
- **Task 4 shrank:** `expectedSteps` is deleted. One order model, on the server.
- **Tests upgraded:** live-database race and replay tests (Tasks 5c, 5d), replay tests per action shape, notify tests per step, reload tests for every action, and a midnight-rollover e2e with a controlled clock.

**Updated after design review round 3 (2026-09-12).** Four fixes, no new task file — folded into existing tasks:

- **Task 5d grew:** `updateBabyEvent` and `deleteBabyEvent` now take the shared lock **when the target is a sleep row**, with two live-database race tests. Feed/diaper corrections stay lock-free.
- **Task 4a grew:** a new pure classifier `lib/baby-quick-care-outcome.ts` decides clear-vs-keep by trusted error code, and the fail-closed verify equality is tested. `BAD_REQUEST` is ambiguous.
- **Task 8 grew:** the pending record is **verified after writing** — if it cannot be stored and read back, the request is not sent (fail-closed).
- **Task 5c grew:** an idle breast start (no timer, no open nap) returns **empty `steps`**, still stored and replayable. "A BREAST press writes a saveBreast row" is corrected.

**Updated after Gate 2 pause — next-due timers (2026-09-12).** New Task **1b** (`lib/baby-next-due.ts`) plus subtitle wiring in Tasks 8/9 and skeleton parity. Frequency bands use the earlier bound of each age range. Design review must re-run (docs changed after clean).

**Updated after design review round 5 (2026-09-12).** Task 1b: pump/null/unknown → `feedDefaultMinMs`, hold-last ≥1095. Tasks 8/9: ≥30s home clock + `visibilitychange`, shared next-feed string, skeleton subtitle placeholder. Task 12 + Checkpoint C: map the three `01` next-due success criteria to named tests. No `babyQuickCare` / `babyHomeQuickStatus` schema change.

**Rule for every task:** write the failing test first, then the code. The repo has no React testing library, so any rule that can save the wrong thing lives in a pure `lib/` module with `node:test` coverage. Components only wire.

**Commands**

| Purpose | Command |
|---------|---------|
| Unit tests | `npm test` |
| One file | `npm test -- --test-name-pattern "<name>"` (or the file path the script accepts) |
| Typecheck + lint | `npm run lint` |
| Build | `npm run build` |
| Generate the migration | `npm run db:generate` (then hand-add the RLS block, copying `db/migrations/0038_baby_vaccine.sql`) |
| Apply the migration | `npm run db:migrate` |
| Live-database tests | `DATABASE_URL=… npm test` — the `*.db.test.ts` suites skip themselves when it is unset, the same way `lib/workspace-reset.test.ts` does |
| e2e | `npx playwright test e2e/baby-care.spec.ts` |

**Boundaries**

- ✅ **Always:** test first; keep rules pure in `lib/`; add every new label to `messages/baby/en.ts` **and** `messages/baby/vi.ts` in the same commit; **update the matching `BabyHomeSkeleton` block in the same task that changes a row** (Tasks 8, 9, 9a, 10, 10a, 10b each own their slice).
- ✅ **In scope on the server, and only these:** the `babyHomeQuickStatus` query (Task 5a), the `updateBabyProfile` mutation (Task 5b), the `babyQuickCare` mutation (Task 5c), the shared nap lock (Task 5d), and the `baby_quick_care_request` table (Task 5m), with their Zod schemas.
- ✅ **One approved migration:** `0039_baby_quick_care_request.sql`, additive only — one new table, its foreign keys, its indexes, and its RLS policy. Task 5m owns it.
- ✅ **One approved change to existing care mutations:** Task 5d wraps `startBabySleep` and `endBabySleep` in the shared lock, and wraps `updateBabyEvent` / `deleteBabyEvent` in the same lock **only when the target row is a sleep row** (review round 3). **Their GraphQL inputs, outputs, and error codes must not change** — if a change needs more than a transaction handle, a type pre-read, and a lock call, stop and ask. Feed/diaper corrections keep today's lock-free path.
- ⚠️ **Ask first:** any **other** GraphQL field; any change to an existing Zod care schema; any change to `createBabyFeed` or `createBabyDiaper`; **any second migration**, and any migration that alters an existing table, column, index, or enum.
- 🚫 **Never:** add a motion library; hardcode a breakpoint; nest a `<button>` inside a `<button>`; add an Undo toast; change `lib/graphql/map-service-error.ts` (shared by Money, Loans, Investments); show a raw server or GraphQL message on a field; add a backdrop-click handler to `components/ui/modal.tsx`; hand-roll a focus trap; re-add a `payload->>'quickRequestId'` scan as the replay lookup; re-add a client step preview; auto-retry a pending press without the caregiver pressing Try again.

---

## Task 1: Calendar dates, age guide bands, and bottle defaults

**Description:** Two pure modules. First a real calendar-date parser, because `Date.parse` silently normalises impossible dates. Then the age band, the snap list of ml values, and the default amount, with the Gate 1 fallback when there is no birthday.

**Acceptance criteria — `lib/baby-calendar-date.ts`:**
- [x] `parseBabyCalendarDate` accepts `"2026-07-04"` and `"2024-02-29"`.
- [x] It returns `null` for `"2026-02-30"`, `"2026-04-31"`, `"2026-13-01"`, `"2026-00-10"`, `"2023-02-29"`, and `"2100-02-29"` — the parts must round-trip exactly.
- [x] It returns `null` for `"2026-7-4"`, `"04/07/2026"`, `"2026-07-04T00:00:00Z"`, `""`, `null`, and a non-string.
- [x] Surrounding whitespace is trimmed before parsing.
- [x] `babyCalendarDayNumber` gives consecutive integers for consecutive dates, including across a month end, a year end, and Feb 29.

**Acceptance criteria — `lib/baby-age-guide.ts`:**
- [x] `babyAgeInDays` counts whole **local calendar days**, built on `parseBabyCalendarDate` — never on `Date.parse` and never on elapsed milliseconds.
- [x] Born `2026-07-04`: at local `2026-07-04T23:59` the age is `0`; at local `2026-07-05T00:01` it is `1`.
- [x] The age advances by exactly 1 across a DST spring-forward night (23-hour local day) and a DST fall-back night (25-hour local day). Run with a `TZ` that has DST, and also with a fixed-offset zone.
- [x] A future birthday and an impossible date both return `null`, so the caller falls back like "not set".
- [x] `babyFeedGuideForAge` maps each day bound in the design table to the right band, including day 0, day 7, day 8, day 730, and day 900.
- [x] `babyFormulaSnapList` returns every multiple of 10 from `mlMin` to `mlMax` inclusive.
- [x] `babyFormulaDefaultMl` returns the mid-band value rounded to 10 and clamped inside the band.
- [x] `BABY_FEED_GUIDE_FALLBACK` is 60–150 ml with default 120 and no feeds/day cap.

**Verification:**
- [x] `npm test` — new `lib/baby-calendar-date.test.ts` and `lib/baby-age-guide.test.ts` pass.
- [x] `npm run lint` clean.

**Dependencies:** None · **Scope:** M · **Files:** `lib/baby-calendar-date.ts` + test, `lib/baby-age-guide.ts` + test

---

## Task 1b: Next-due clocks (feed / sleep / diaper)

**Description:** Pure module that turns age + last-event anchors into `next in …` / overdue / hidden. Due uses the **earlier** bound of each frequency range from `03-design.md`. Frequency bands live only here — not in `lib/baby-age-guide.ts`.

**Acceptance:**
- [x] `babyCareIntervalGuideForAge(null)` returns `null`.
- [x] Day-bound table matches design (0–1 mo breast 2h / formula 3h; 1–<2 mo feed 2.5h sleep 60m; 2–<3 mo sleep 1.5h; …; 1–3y feed 3h sleep 5h diaper 4h).
- [x] **Hold last:** `ageDays >= 1095` returns the same intervals as the 1–3y band (no new table).
- [x] **Method mapping:** newborn `breast_l`/`breast_r` → 2h; `formula` → 3h; **`pump`, `null`, and any unknown method → `feedDefaultMinMs`**. Older bands always use `feedDefaultMinMs` for every method.
- [x] `babyNextFeedDue`: no last feed or no age → `hidden`; last breast newborn → due at +2h; last formula newborn → +3h; past due → `overdue`.
- [x] `babyNextSleepDue`: `napOpen` → `hidden`; uses `lastSleepEndedAt` only; overdue after awake window.
- [x] `babyNextDiaperDue`: no last diaper → `hidden`; otherwise next/overdue from diaper interval.
- [x] `formatBabyNextDueLabel` returns null for hidden; uses compact duration; passes **`{ duration }`** into `home.nextIn` / `home.overdue`.
- [x] Unit tests cover: band edges; pump / null / unknown method; over-3y hold-last; a DST-safe injected `now` (no real clock).

**Verification:** `npm test` — `lib/baby-next-due.test.ts` · **Dependencies:** Task 1 · **Scope:** M · **Files:** `lib/baby-next-due.ts` + test

---

## Task 2: Bottle stepper, diaper cycle, and custom-ml validation

**Description:** Pure value rules for the two stepper cards. The band stepper stays inside the age band; the exact custom value comes from a separate parser used by the Custom modal.

**Acceptance criteria:**
- [x] `stepBabyFormulaMl` moves by `BABY_FORMULA_STEP_ML` (10) inside the band and **clamps at both band edges** — it never steps outside the band.
- [x] It never returns a non-multiple of 10, and a starting value already outside the band snaps back into it.
- [x] `isBabyFormulaCustom` is false inside the band and true outside it (a value the modal produced).
- [x] `parseBabyCustomMl` returns `{ ok: true, ml }` for `"95"`, `"120"`, and `" 120 "`.
- [x] It returns `{ ok: false, reasonKey }` with the right key for: `""`, `"abc"`, `"12abc"`, `"1e3"`, `"Infinity"`, `"NaN"` → `home.customMlInvalid`; `"12.5"` → `home.customMlWhole`; `"0"` and `"-30"` → `home.customMlInvalid`; `"5"` → `home.customMlTooLow`; `"400"` → `home.customMlTooHigh`.
- [x] Bounds come from `BABY_FORMULA_HARD_MIN_ML` (10) and `BABY_FORMULA_HARD_MAX_ML` (300).
- [x] `stepBabyDiaperKind` cycles `wet → dirty → mixed → wet` forward and the reverse backward.

**Verification:**
- [x] `npm test` — new `lib/baby-quick-value-steppers.test.ts` passes.

**Dependencies:** Task 1 · **Scope:** S · **Files:** `lib/baby-quick-value-steppers.ts`, `lib/baby-quick-value-steppers.test.ts`

---

## Task 3: Breast timer store (same-device persistence)

**Description:** Pure serialize / parse / elapsed helpers for the running breast timer, plus the stale rule. No React, no direct `localStorage` calls inside the pure functions.

**Acceptance criteria:**
- [x] Serialize → parse round-trips `{ babyId, side, startedAt }`.
- [x] Parse returns `null` for `null`, empty, malformed JSON, a missing field, or a **different `babyId`**.
- [x] A record older than `BABY_BREAST_TIMER_STALE_MS` (6 h) is still returned, with `stale: true` — never dropped.
- [x] `babyBreastElapsedSec` computes from timestamps and never returns a negative value.

**Verification:**
- [x] `npm test` — new `lib/baby-breast-timer-store.test.ts` passes.

**Dependencies:** None · **Scope:** S · **Files:** `lib/baby-breast-timer-store.ts`, `lib/baby-breast-timer-store.test.ts`

---

## Task 4: Quick-care request planner (client half of the chain)

**Description:** The pure rule that turns a press into the `babyQuickCare` request plus the local follow-up. The **server** decides and runs the order (Task 5c); this module only builds the request and says what to change locally after the server confirms.

**Acceptance criteria:**
- [x] `planBabyQuickCare(action, { breast, now })` returns `{ request, localAfter }` — **exactly two keys**.
- [x] **`expectedSteps` does not exist**, and `napOpen` is **not** a parameter. Removed in review round 2: one order model, and it lives on the server. A test asserts the returned object has no third key, so it cannot creep back.
- [x] `request.breastRunning` is the running timer as `{ side, durationSec }`, with `durationSec` at least 1, derived from `now - startedAt`. It is `null` when no timer is running.
- [x] `request.action` carries exactly the fields the pressed kind needs: `side` for breast, `amountMl` for formula, `diaperKind` for diaper, nothing extra for sleep.
- [x] Pressing the running side sets `localAfter.clearBreastTimer = true` and `startBreastSide = null` — never a restart of the same side.
- [x] Pressing the other side sets `clearBreastTimer = true` and `startBreastSide` to the pressed side.
- [x] Every row of the auto-finalize table in `03-design.md` has a test asserting `request` and `localAfter`, reading the **same shared table fixture** the server test in Task 5c reads. Export the fixture from one file so the two suites cannot drift.
- [x] `babyQuickCareStepMessageKey` returns a distinct key per step name, and its doc comment says it is fed from the **server response** `steps`, never from a client guess.
- [x] `newBabyQuickRequestId()` returns a fresh `crypto.randomUUID()` per call. There is **no** standalone request-id storage key — the id lives in the pending record (Task 4a).

**Verification:**
- [x] `npm test` — new `lib/baby-quick-care-plan.test.ts` passes.
- [x] Read the test list against the design table and confirm no row is missing.
- [x] Grep: `expectedSteps` appears nowhere in the repo.

**Dependencies:** Tasks 2, 3 · **Scope:** S · **Files:** `lib/baby-quick-care-plan.ts` + test, `lib/baby-quick-care-request-id.ts` + test, the shared order-table fixture

---

## Task 4a: Pending-request store (a reload can retry the exact press)

**Description:** Pure serialize / parse / view helpers for the one pending press. Round 1 only kept a request id beside the breast timer, so a reload during a bottle, diaper, or sleep press knew an id but not what the press was. This module stores the whole request.

**Acceptance criteria:**
- [x] `BabyQuickPending` holds `{ babyId, requestId, request, state, startedAt }`, where `request` is the **exact** `BabyQuickCareRequest` that went on the wire — action fields **and** the `{ side, durationSec }` breast snapshot.
- [x] Serialize → parse round-trips all four action shapes: breast, bottle (including a Custom ml value), sleep, diaper — each with and without a breast snapshot.
- [x] Parse returns `null` for `null`, empty, malformed JSON, a missing field, or a **different `babyId`** — the same rule as the breast timer.
- [x] `state` is `"sending"` or `"unknown"`; any other value parses as `null`.
- [x] `babyQuickPendingView(pending, now)` returns `{ kind: "none" }` for `null`, `"retryable"` under `BABY_QUICK_PENDING_RETRY_MAX_AGE_MS` (30 minutes), and `"tooOld"` at or over it. Boundary cases at exactly 30 minutes are tested.
- [x] No React, no direct `localStorage` calls inside the pure functions, no `Date.now()` inside them — `now` is a parameter.
- [x] The module doc states the clear rules in one place, and they defer to the classifier below: cleared on any confirmed outcome (success or `replayed: true`) and on a **definite-no-commit** code; kept and marked `"unknown"` on every other error.
- [x] **Verify-before-send helper (review round 3):** a way to compare a parsed-back record against the intended one — `serializeBabyQuickPending(parsed) === serializeBabyQuickPending(record)`. A round-trip test for every action shape proves the equality holds, so the component's fail-closed read-back check is exact.

**Acceptance criteria — outcome classifier (new pure module, review round 3):**
- [x] `lib/baby-quick-care-outcome.ts` exports `BABY_QUICK_DEFINITE_NO_COMMIT_CODES = ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"]` and `classifyBabyQuickCareError(error): "definiteNoCommit" | "ambiguous"`.
- [x] It reads the GraphQL error's `extensions.code`. An allowlisted code → `definiteNoCommit`; everything else → `ambiguous`.
- [x] **`BAD_REQUEST` classifies as `ambiguous`**, with a test that names it — because `mapServiceError` (`lib/graphql/map-service-error.ts`) also uses `BAD_REQUEST` as the catch-all for unknown post-commit errors, so it does not prove "nothing committed".
- [x] `CONFLICT`, `DB_UNAVAILABLE`, `INTERNAL_SERVER_ERROR`, any 5xx, an unrecognised code, and a plain network/timeout/abort (no code) all classify as `ambiguous`.
- [x] Pure — no React, no `window`, no network.

**Verification:**
- [x] `npm test` — new `lib/baby-quick-care-pending.test.ts` and `lib/baby-quick-care-outcome.test.ts` pass.

**Dependencies:** Tasks 3, 4 · **Scope:** S · **Files:** `lib/baby-quick-care-pending.ts` + test, `lib/baby-quick-care-outcome.ts` + test

---

### Checkpoint A (after Task 4a)

- [ ] `npm test` and `npm run lint` clean.
- [ ] All the rule modules are pure — no React, no `window`, no network, no `Date.now()` inside a pure function.
- [ ] **Human review of the auto-finalize table before any UI work.** A wrong order here saves the wrong care event, and there is no Undo.
- [ ] The same order-table fixture is read by both the client planner test (Task 4) and the server chain test (Task 5c), so they cannot drift apart.
- [ ] **Human review of the pending clear / retry rules (Task 4a).** Getting "when do we keep the id" wrong is the one way this design can still write twice or lose a press.

---

## Task 5m: Migration — the `baby_quick_care_request` table

**Description:** One additive table that stores the ordered result of a quick-care press, so the same `clientRequestId` always gets the same answer with no time limit. This replaces the round-1 `payload->>'quickRequestId'` scan, which could not find an old ended nap and could not rebuild step order.

**Acceptance criteria:**
- [x] `babyQuickCareRequest` is added to `db/schema/baby.ts` with `id`, `workspaceId`, `babyId`, `requestId` (`text`), `result` (`jsonb`, typed `BabyQuickCareStoredResult`), and `createdAt` — exactly as spelled in the design.
- [x] Foreign keys to `workspace.id` and `baby_profile.id`, both `ON DELETE CASCADE`.
- [x] `uniqueIndex("baby_quick_care_request_uq")` on `(workspace_id, request_id)` and `index("baby_quick_care_request_created_idx")` on `created_at`.
- [x] `BabyQuickCareStoredResult` is exported with `v: 1`, an ordered `steps` array of `{ step, event: { id, type, occurredAt, endedAt, payload } }`, and an `openSleep` snapshot. All timestamps are ISO strings, and nothing in it is locale-dependent.
- [x] `npm run db:generate` produces `db/migrations/0039_baby_quick_care_request.sql`, and the RLS block is hand-added after generation: `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and a `baby_quick_care_request_workspace_rls` policy using `workspace_id = app_current_workspace_id()` — copied from `0038_baby_vaccine.sql`.
- [x] `db/migrations/meta/_journal.json` lists the new migration, and the diff contains **no** change to any existing table, column, index, or enum.
- [x] `npm run db:migrate` applies cleanly on a local database, and applying it twice is a no-op.

**Verification:**
- [x] `npm test` — a schema test asserts the table, both indexes, and the typed result shape; a file test asserts the migration SQL contains the `ENABLE`, `FORCE`, and `CREATE POLICY` lines.
- [x] `npm run lint` clean.
- [x] Read the generated SQL line by line before committing. A generated migration that touches anything else is a stop-and-ask.

**Dependencies:** None (run first, in parallel with Tasks 1 / 3 / 6) · **Scope:** S · **Files:** `db/schema/baby.ts` + test, `db/migrations/0039_baby_quick_care_request.sql`, `db/migrations/meta/_journal.json`

---

## Task 5d: One nap lock for every nap write path

**Description:** Round 1 locked only the new mutation. `startBabySleep` and `endBabySleep` take no lock and run no transaction, so a full-form nap start can land between the quick chain's nap read and its write — a diaper committed with a nap left open. One shared helper fixes all three paths.

**Acceptance criteria — the helper:**
- [x] New `features/baby/server/care-lock.ts` exports `withBabyCareLock(workspaceId, run, deps)` and `BABY_CARE_LOCK_SUFFIX = ":baby-care"`.
- [x] It opens one transaction, and `SELECT pg_advisory_xact_lock(hashtext($1 || ':baby-care'))` is the **first** statement inside it, before the callback runs.
- [x] `deps` are injectable (`transaction`, `acquire`) so the ordering is unit-testable without a database.
- [x] The doc comment names the rule: *every path that can start or end a nap runs inside this*.

**Acceptance criteria — existing sleep mutations:**
- [x] `startBabySleep` and `endBabySleep` run their whole bodies inside `withBabyCareLock`, reading and writing through the transaction handle instead of the bare `db`.
- [x] **Their GraphQL inputs, outputs, and error codes are unchanged.** `assertCanStartSleep`, `requireOpenSleepForEnd`, and `rethrowOpenSleepConflict` all stay — the open-nap unique index remains the backstop.
- [x] `createBabyFeed` and `createBabyDiaper` do **not** take the lock, and a test asserts that, because they never read or write a nap.
- [x] `CareEventDeps` gains whatever handle the locked path needs without breaking the existing stubbed tests in `features/baby/server/care-events.test.ts`.

**Acceptance criteria — correction mutations on a sleep row (review round 3):**
- [x] `updateBabyEvent` and `deleteBabyEvent` first read the target row's **`type`** (immutable, so this pre-read needs no lock).
- [x] When the row is a **sleep** row, the read-modify-write (or the delete) runs **inside `withBabyCareLock`** through the transaction handle. This closes the reopen race (`updateBabyEvent` setting `ended_at` back to `null`) and the delete-open-nap race.
- [x] When the row is a **feed or diaper** row, the mutation keeps today's direct, lock-free path. A test asserts a feed/diaper correction does **not** take the lock.
- [x] **Their GraphQL inputs, outputs, and error codes are unchanged** — the only additions are the type pre-read and the conditional lock.

**Acceptance criteria — live-database proof:**
- [x] A `{ skip: !hasDb }` suite (the `lib/workspace-reset.test.ts` shape) runs a **quick-care chain against a concurrent `startBabySleep`** in the same workspace and asserts they serialize: either the nap starts first and the chain ends it, or the chain finishes and the nap starts after. **Never** a diaper committed with a nap left open.
- [x] A second live test runs **two quick-care chains at once** (one pressing Diaper, one pressing Sleep) and asserts the end state has never two open naps.
- [x] **Nap reopen race (review round 3):** a quick-care chain (pressing Diaper) against a concurrent `updateBabyEvent` that sets an ended sleep row's `ended_at` back to `null` — assert they serialize; never a diaper committed alongside a freshly reopened nap, never two open naps.
- [x] **Nap delete race (review round 3):** a quick-care chain (pressing Diaper, nap open) against a concurrent `deleteBabyEvent` on that open sleep row — assert they serialize and the end state is consistent.
- [x] All live tests are repeated enough times to be meaningful (at least 20 rounds) and are stable.
- [x] A stubbed call-order test is kept for the helper, with a comment saying plainly that it does **not** prove the lock — only the live tests do.

**Verification:**
- [x] `npm test` — new `features/baby/server/care-lock.test.ts` and updated `features/baby/server/care-events.test.ts` pass with no database.
- [ ] `DATABASE_URL=… npm test` — the live race suites pass, including the reopen and delete races.
- [ ] `npx playwright test e2e/baby-care.spec.ts` — the existing `/baby/sleep` form coverage still passes, proving the contract did not move.
- [x] `npm run lint` clean.

**Dependencies:** None (run first) · **Scope:** M · **Files:** `features/baby/server/care-lock.ts` + test, `features/baby/server/care-events.ts` + test, `features/baby/server/care-events.db.test.ts`, `features/baby/server/quick-care.db.test.ts`

---

## Task 5a: Server read — `babyHomeQuickStatus` (Option B)

**Description:** One GraphQL query that answers the whole home page: last feed / nap / diaper, the open nap, the exact count of today's feeds, and `birthDate`. Reuses the existing summary and open-nap helpers so nothing drifts from the timeline.

**Acceptance criteria:**
- [x] `BabyHomeQuickStatus` type and the `babyHomeQuickStatus(dayFrom, dayTo)` query are added to `lib/graphql/baby-typeDefs.ts` exactly as spelled in the design.
- [x] `babyHomeQuickStatusInputSchema` requires both dates as ISO with an offset, rejects `dayFrom >= dayTo`, and rejects a window wider than 26 hours.
- [x] `getBabyHomeQuickStatus` returns `{ lastFeed: null, lastSleep: null, lastDiaper: null, openSleep: null, feedsToday: 0, birthDate: null }` for an empty workspace — nulls, not thrown errors.
- [x] Each last-of-type read is one `ORDER BY occurred_at DESC, id DESC LIMIT 1`, scoped by `workspaceId` **and** `babyId`.
- [x] `summary` comes from the shared `careSummary()` in `features/baby/server/timeline.ts` with the same arguments the timeline resolver passes — no second wording path.
- [x] `openSleep` comes from the existing `findOpenSleep()` — no second open-nap query.
- [x] `feedsToday` is `count(*)::int` over `type = 'feed'` in the **half-open** window: `gte(occurredAt, dayFrom)` and `lt(occurredAt, dayTo)`. Not `lte` — that is the bug from review round 1.
- [x] A feed exactly at `dayFrom` counts; a feed exactly at `dayTo` does not.
- [x] **Count refresh test:** read once, insert a feed later in the same local day through the stubbed store, read again with the **same** `dayFrom` / `dayTo`, and assert the count went up. This is the case the old "now as `dayTo`" window got wrong.
- [x] The resolver uses `requireBabyWorkspace`, `runInWorkspace`, `localeOf(ctx)`, and `mapServiceError(e, ctx.requestId)` — the same shape as `babyTimeline`.
- [x] Vietnamese locale produces Vietnamese summaries (cookie-driven, same as the timeline).

**Verification:**
- [x] `npm test` — new `features/baby/server/home-quick-status.test.ts` (injectable/stubbed reads, no live database) and a wiring case in `lib/graphql/baby-yoga.test.ts`.
- [x] `npm run lint` clean. Confirm no `SUM(...)::int` was introduced — `count(*)::int` is the only cast.

**Dependencies:** None · **Scope:** M · **Files:** `lib/graphql/baby-typeDefs.ts`, `lib/graphql/baby-resolvers.ts`, `lib/validators/baby.ts`, `features/baby/server/home-quick-status.ts` + test, `lib/graphql/baby-yoga.test.ts`

---

## Task 5c: Server write — `babyQuickCare` (the ordered chain)

**Description:** One mutation that runs the whole auto-finalize chain on the server, in one transaction, against current rows, behind the shared nap lock, with the ordered result stored so a replay of the same press is free. Highest-risk server task — build it with the shared order-table fixture from Task 4.

**Acceptance criteria — contract:**
- [x] `BabyQuickActionKind`, `BabyQuickActionInput`, `BabyQuickBreastInput`, `BabyQuickCareInput`, `BabyQuickCareStepResult`, `BabyQuickCareResult`, and `babyQuickCare(input)` are added to `lib/graphql/baby-typeDefs.ts` exactly as spelled in the design.
- [x] `BabyQuickCareStepResult` returns `{ step, event: BabyCareEvent! }` — the **whole committed row**, not an `eventId`. The resolver needs `type`, `payload`, `occurredAt`, and `endedAt` to build the Telegram summary without a second read.
- [x] `babyQuickCareSchema` requires `side` for BREAST, `amountMl` for FORMULA, `diaperKind` for DIAPER, and a `clientRequestId` of 8–64 characters after trimming.
- [x] `createBabyFeed`, `createBabyDiaper`, and their Zod schemas are **not changed**. The only edit to an existing care mutation in this pass is the lock in Task 5d.

**Acceptance criteria — order and freshness:**
- [x] `runBabyQuickCare` takes injectable deps, so the whole chain is unit-tested with recorded calls and no live database.
- [x] The body runs inside `withBabyCareLock` from Task 5d — **not** its own private lock and **not** a bare `db.transaction`. A test asserts the lock is acquired before the first read.
- [x] Every row of the auto-finalize table is asserted from the recorded write calls, **in order**, reading the same fixture as Task 4.
- [x] The open nap is read **inside** the transaction. A test where the client sent no open nap but the in-transaction read finds one proves `endNap` still runs before the pressed action.
- [x] The mirror test: the client thought a nap was open but the in-transaction read finds none — no `endNap` runs, and a pressed Sleep **starts** a nap instead of ending one.
- [x] A pressed BREAST **with a running timer** writes only the `saveBreast` row (plus `endNap` first if a nap is open). Starting the other side is client-local and writes nothing.
- [x] **Idle breast start (review round 3):** a pressed BREAST with `breastRunning: null` and **no open nap** writes **no** care row and returns **empty `steps`**. There is no unconditional `saveBreast` — the old "a BREAST press writes a saveBreast row" wording is wrong and must not appear.
- [x] A pressed SLEEP with a nap open ends it and stops; with no nap open it inserts one.
- [x] Each write `RETURNING`s its row, so the service never re-reads a row it just wrote.

**Acceptance criteria — durable exactly once:**
- [x] The replay lookup is `SELECT result FROM baby_quick_care_request WHERE workspace_id = $1 AND request_id = $2` — **one row lookup, no `occurred_at` filter, no time window**. A test asserts no time bound appears anywhere in the lookup.
- [x] The same `clientRequestId` twice returns `replayed: true`, the **same ordered `steps`**, the same `openSleep`, and **zero** new writes.
- [x] **Old-nap replay:** a stored record whose `endNap` step points at a sleep row that started hours earlier still replays. This is the exact round-1 bug and gets its own named test.
- [x] **Every action shape replays:** breast-only, bottle-only, diaper-only, sleep-start, sleep-end, and the full three-step chain each return an identical ordered result.
- [x] The result record is written **inside the same transaction** as the care rows, with `v: 1`, every step in order with its serialized row, and the `openSleep` snapshot — enough to rebuild the response with zero care-row reads.
- [x] **Empty result is stored and replays (review round 3):** an idle breast start stores a record with `steps: []`, and a second call with the same id returns `replayed: true` with empty `steps` and writes nothing. A named test covers it.
- [x] A unique violation on `(workspace_id, request_id)` is caught with `isPgUniqueViolation` from `lib/pg-unique.ts`, rolled back, and answered by re-reading the stored result as a replay — never surfaced as an error.
- [x] Every written care row still carries `payload.quickRequestId`, and a comment says it is a **trace key only**, never read for the replay decision.
- [x] **No expiry anywhere.** Grep the service for `interval`, `10 minutes`, and `minutes` and confirm zero hits.

**Acceptance criteria — all-or-nothing:**
- [x] A failing write rolls the whole transaction back: no feed row, no nap end, and **no request record** survive. Asserted from the recorded calls plus the rejected transaction.

**Acceptance criteria — Telegram matches today:**
- [x] The resolver uses `requireBabyWriteWorkspace`, `runInWorkspace`, `localeOf(ctx)`, and `mapServiceError`.
- [x] It notifies **only** for `saveBreast` (`feed`), `createFormula` (`feed`), `createDiaper` (`diaper`), and `startNap` (`sleep`), each built from the returned `event` with `careSummary()` / `t("summary.sleepStarted", locale)`.
- [x] **`endNap` notifies nothing**, matching `endBabySleep` in `lib/graphql/baby-resolvers.ts` today. A test asserts the three-step chain sends exactly **two** messages, and names which two.
- [x] A replay fires **zero** notifications, for every action shape.
- [x] An **idle breast start** (empty `steps`) fires **zero** notifications, because no care row was written.
- [x] Notifications fire only after the commit, and only when `replayed === false`.

**Acceptance criteria — live-database proof:**
- [x] `{ skip: !hasDb }` tests: commit a chain, call again with the same `clientRequestId`, and assert `replayed: true`, an identical ordered result, and an unchanged `count(*)` on `baby_care_event`.
- [x] Repeat after backdating the record's `created_at` by 30 days — still a replay, because there is no expiry.
- [x] Two concurrent calls with the **same** `clientRequestId` produce exactly one set of care rows and exactly one `baby_quick_care_request` row.
- [x] The race tests from Task 5d live in the same file.

**Verification:**
- [x] `npm test` — new `features/baby/server/quick-care.test.ts`, new cases in `lib/validators/baby.test.ts`, and a wiring case in `lib/graphql/baby-yoga.test.ts`.
- [ ] `DATABASE_URL=… npm test` — `features/baby/server/quick-care.db.test.ts` passes.
- [x] `npm run lint` clean. Confirm no raw JavaScript array is bound as a PG array and no `SUM(...)::int` was introduced.
- [x] Grep: `payload->>'quickRequestId'` does not appear in **any** `WHERE` clause.

**Dependencies:** Tasks 5m, 5d · **Scope:** M · **Files:** `lib/graphql/baby-typeDefs.ts`, `lib/graphql/baby-resolvers.ts`, `lib/validators/baby.ts` + test, `features/baby/server/quick-care.ts` + test, `features/baby/server/quick-care.db.test.ts`, `lib/graphql/baby-yoga.test.ts`

---

## Task 5b: Server write — `updateBabyProfile` (birth date)

**Description:** Nothing can write `birth_date` today. Add the mutation so the birthday can be set, changed, and cleared.

**Acceptance criteria:**
- [x] `UpdateBabyProfileInput { birthDate }` and `updateBabyProfile(input): BabyProfile!` are added to `lib/graphql/baby-typeDefs.ts`. **`displayName` is not part of this pass** — the input is `birthDate` only.
- [x] An input object with no `birthDate` key is **rejected** with `BABY_BIRTH_DATE_REQUIRED`, so a no-op cannot bump `updated_at`. Explicit `null` is accepted and clears the column. Both cases have a test.
- [x] `updateBabyProfileSchema` validates through `parseBabyCalendarDate` from Task 1 — no second date rule anywhere.
- [x] It accepts `"2026-07-04"` and `"2024-02-29"`, and rejects `"04/07/2026"`, `"2026-7-4"`, `"2026-02-30"`, `"2023-02-29"`, `"2100-02-29"`, a date more than one day in the future, and a date more than 10 years back.
- [x] Every rejection message is one of the stable tokens — `BABY_BIRTH_DATE_REQUIRED`, `BABY_BIRTH_DATE_INVALID`, `BABY_BIRTH_DATE_FUTURE`, `BABY_BIRTH_DATE_TOO_OLD` — asserted by string, never a free sentence.
- [x] `lib/baby-birth-date-errors.ts` maps each token to its i18n key. A Zod JSON blob, an `UNAUTHORIZED`, and a network failure all fall back to `settings.birthDateSaveFailed`.
- [x] The token list in the validator and the key map are asserted against each other, so renaming one without the other fails a test.
- [x] `updateBabyProfile` calls `ensureBabyProfile` first, then updates exactly one row by profile `id`, and bumps `updated_at`.
- [x] The resolver uses `requireBabyWriteWorkspace` (**not** the read-only guard), `runInWorkspace`, `serializeProfile`, and `mapServiceError`. `lib/graphql/map-service-error.ts` itself is **not** changed.
- [x] No Telegram notify is fired — a profile edit is not a care event.
- [x] No schema change for the birthday: `birth_date` stays nullable `text` holding `YYYY-MM-DD`. The only migration in this pass belongs to Task 5m.

**Verification:**
- [x] `npm test` — new cases in `lib/validators/baby.test.ts`, new `lib/baby-birth-date-errors.test.ts`, a service test for set / change / clear / reject-empty, and a wiring case in `lib/graphql/baby-yoga.test.ts`.
- [x] `npm run lint` clean.

**Dependencies:** Task 1 · **Scope:** M · **Files:** `lib/graphql/baby-typeDefs.ts`, `lib/graphql/baby-resolvers.ts`, `lib/validators/baby.ts` + test, `lib/baby-birth-date-errors.ts` + test, `features/baby/server/profile.ts` + test, `lib/graphql/baby-yoga.test.ts`

---

## Task 5: Client query wiring and the midnight window helper

**Description:** The local-day window plus the "how long until midnight" helper, the query options that call `babyHomeQuickStatus`, and the query-key work that keeps home out of the Insights cache slot. The page-level rollover timer that uses the helper lands in Task 10b.

**Acceptance criteria:**
- [x] `babyLocalDayWindow(now)` returns a **half-open** window: `from` at local midnight and `to` at the **next** local midnight, both ISO with an offset, plus a stable `dayKey` of `YYYY-MM-DD` in local time.
- [x] **Key completeness:** two different `now` values inside the same local day produce the **same** `from`, `to`, and `dayKey`. This is what makes the React Query key enough on its own, and it is the exact bug from review round 1.
- [x] A `now` right after local midnight and a `now` on a DST-shift day both produce a `from` that is still the same local day's midnight, and a `to` that is the next local midnight (23 or 25 hours later, not always 24).
- [x] **`msUntilNextLocalMidnight(now)`** returns the milliseconds to the next local midnight, derived from calendar parts — not `now + 24h`. Tested on a 23-hour local day, a 25-hour local day, and a fixed-offset zone.
- [x] It is **floored at 1000 ms**, so a `now` one millisecond before midnight cannot arm a timer with 1 ms and spin. Tested at exactly one millisecond before midnight and exactly at midnight.
- [x] It never returns 0 or a negative number, for any input.
- [x] `babyKeys.homeQuick(dayKey)` starts with `["baby","timeline"]` (so `invalidateBabyQueries(…, "care")` refreshes it) and is **not equal** to `babyKeys.timeline(from, to)` for the same day — asserted in a test.
- [x] `babyHomeQuickStatusQueryOptions(now)` sends the `BabyHomeQuickStatus` document with `dayFrom` / `dayTo` from the window, and takes an injectable request function so it can be tested without a network.
- [x] `babyProfileQueryOptions()` result type includes `birthDate: string | null` (the settings field reads it).
- [x] `BABY_CARE_AFTER_SAVE.homeQuick === "stay"`, asserted in a test.
- [x] `lib/baby-last-care-status.ts` and `babyLastCareStatusQueryOptions` are **left in place** — home stops calling them, nothing is deleted.

**Verification:**
- [x] `npm test` — new `lib/baby-home-day-window.test.ts` plus updated `lib/baby-query-options.test.ts` and `lib/baby-care-save-navigate.test.ts`.
- [x] `npm run lint` clean (type widening must not break other profile readers).

- [x] `babyQuickCareMutationOptions()` sends the `BabyQuickCare` document with the request from `planBabyQuickCare` plus a `clientRequestId`, and is injectable for tests. The document selects `steps { step event { id type occurredAt endedAt payload } }` — **not** `eventId`.
- [x] On an error it calls `classifyBabyQuickCareError` (Task 4a) to decide clear-vs-keep — it does **not** treat "a GraphQL error came back" as definite. A test asserts `UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` clear, while `BAD_REQUEST`, a 5xx, an internal error, an unknown code, and a network failure all keep the pending record as `"unknown"`.

**Dependencies:** Tasks 1, 4, 4a, 5a, 5c · **Scope:** M · **Files:** `lib/baby-home-day-window.ts` + test, `lib/baby-query-options.ts` + test, `lib/baby-care-save-navigate.ts` + test

---

## Task 6: Labels in English and Vietnamese

**Description:** Add every new home key to both message files and remove the four dead CTA keys.

**Acceptance criteria:**
- [x] All keys listed in the design's i18n section exist in `messages/baby/en.ts` — the home set (including **`home.nextIn`** / **`home.overdue`** with the shared `{duration}` var — EN examples `next in {duration}` / `{duration} overdue`; VI uses the **same** `{duration}` name), the **Custom ml modal set** (`home.formulaCustomOpen`, `home.customMlTitle`, `home.customMlLabel`, `home.customMlHint`, `home.customMlUse`, `home.customMlInvalid`, `home.customMlWhole`, `home.customMlTooLow`, `home.customMlTooHigh`), and the **birth-date set** (`home.birthDatePrompt`, `home.birthDateAdd`, `home.birthDateNotNow`, `settings.babyProfile`, `settings.birthDate`, `settings.birthDateHint`, `settings.birthDateSaved`).
- [x] The **birth-date error set** exists in both files, one per server token plus the generic fallback: `settings.birthDateRequired`, `settings.birthDateInvalid`, `settings.birthDateFuture`, `settings.birthDateTooOld`, `settings.birthDateSaveFailed`.
- [x] The **pending-save set** exists in both files: `home.pendingTitle`, `home.pendingRetry`, `home.pendingDiscard`, `home.pendingTooOld`, `home.pendingTimelineLink`, and `home.saveBlocked` (the fail-closed line when the device cannot store the pending record — review round 3). The wording asks, it does not scold — the caregiver did nothing wrong.
- [x] `home.saving` reads as a plain in-progress state ("Saving…") with **no step names**, because the client no longer previews the order.
- [x] Every key in `BABY_BIRTH_DATE_ERROR_KEYS` exists in `en.ts` — asserted in a test, not by eye.
- [x] `home.chainFailed` reads as all-or-nothing ("Nothing was saved. Try again."), because the chain is a single transaction.
- [x] `home.stepStartBreast` is **not** added — starting a breast timer writes no row and is never reported as a saved step.
- [x] `common.cancel` and `common.save` are **reused**, not duplicated.
- [x] `home.feedsTodayPartial` is **not** added — the server count is exact.
- [x] `messages/baby/vi.ts` has the same key set — typecheck passes (`vi.ts` is typed as `Record<BabyMessageKey, string>`).
- [x] `home.logFeed`, `home.logNap`, `home.logDiaper`, `home.logMeasure` are removed and no code still reads them.
- [x] No key contains "recommended", "should", or any wording that reads as medical advice. The birth-date prompt asks, it does not warn.

**Verification:**
- [x] `npm run lint` (typecheck catches any key present in one file only).
- [x] Grep the repo for each removed key and confirm zero hits.

**Dependencies:** None · **Scope:** S · **Files:** `messages/baby/en.ts`, `messages/baby/vi.ts`

---

## Task 7: Breast glyph and the stepper card primitive

**Description:** A new breast icon next to the existing bottle / moon / diaper glyphs, and one reusable card that renders `+` / centre save / `−` as three sibling buttons.

**Acceptance criteria:**
- [x] `IconBabyBreast` follows the existing glyph style in `components/icons/icon-baby-nav.tsx` and does not change any existing path (e2e asserts those shapes).
- [x] The card renders a `role="group"` container with **three sibling `<button>` elements**, or **four** when an optional extra control is passed (the bottle's Custom chip) — no nesting in either case.
- [x] `+` and `−` are 56 px tall; the centre is 80 px tall with `fx-press`; the optional chip is 44 px tall.
- [x] **No `fx-hit-40` anywhere on the card** — every control is already ≥ 44 px tall, so extending a hit area would only risk the overlap the design guide forbids.
- [x] `+` and `−` sit at opposite ends of the value, with the 80 px centre between them.
- [x] The optional chip carries `aria-haspopup="dialog"` when it opens a modal.
- [x] The card exposes a ref (or callback) for the centre save button, so the Custom modal can return focus there.
- [x] The card has one `aria-live="polite"` region announcing the current value and the Custom state.
- [x] Outer surface uses `rounded-[var(--radius-md)]`; chips use `rounded-[var(--radius-sm)]`. No hex, no `rounded-md`.
- [x] Every transition names its properties. No `transition` shorthand.

**Verification:**
- [x] `npm test` — markup test asserts three sibling buttons without the chip, four with it, and no `<button` nested inside a `<button` in either case.
- [ ] Manual: render at 320 px, 360 px, and 768 px container width; check light and dark from `/settings`.

**Dependencies:** Tasks 2, 6 · **Scope:** M · **Files:** `components/baby-quick-value-card.tsx`, `components/icons/icon-baby-nav.tsx`, test

---

## Task 8: Row 1 — breast cards with a persistent timer

**Description:** Two large breast cards wired to the timer store and the step planner. Elapsed time is always recomputed from the stored timestamp.

**Acceptance criteria:**
- [x] Tapping an idle card starts the timer and writes it to `localStorage` inside a `try/catch`.
- [x] The title shows elapsed time via `formatBabyDurationCompact`, ticking about every second.
- [x] Tapping the running card saves one feed with the correct side and duration, then returns to idle.
- [x] Tapping the other card runs the planner: the running side saves first, then the other starts.
- [x] Elapsed time is recomputed on `visibilitychange`, so it is right on the first frame after unlock.
- [x] A `storage` event from another tab updates or clears the card.
- [x] A stale timer (over 6 h) shows the note with the start clock time and still saves.
- [x] Both cards are disabled while a chain is saving.
- [x] Idle cards show the **shared next-feed** subtitle from Task 1b (same string on Left and Right). Running cards show elapsed only (no next line).
- [x] Next-feed is hidden when there is no birth date or no last feed (`lastFeed.at`).
- [x] **Home clock:** one shared visible-page timer (≥30s, or reuse an existing home clock) injects `now` into next-due helpers so idle subtitles move; also recompute on `visibilitychange` (next-due must not freeze until a refetch). Breast elapsed may still tick ~1s.
- [x] Anchors use `lastFeed.at` (TimelineItem), not a missing `occurredAt` field.
- [x] `IconSwap` handles the idle → running glyph change.
- [x] **The timer is cleared only after the server confirms** the chain. A failed `babyQuickCare` leaves the running timer exactly as it was, so nothing is lost and the same press can be retried.
- [x] **Synchronous in-flight lock:** the press handler starts with `if (inFlightRef.current) return; inFlightRef.current = true;` before any `await` and before `setSaving(true)`, and clears it in a `finally`. A React `saving` state alone is not accepted — it lands a render too late.
- [x] One fresh `clientRequestId` per accepted press, written into the pending record (Task 4a) **before** the request leaves, together with the full request. A retry reuses that id; nothing else ever does.
- [x] **Fail-closed persistence (review round 3):** after writing the pending record, read it straight back and verify it matches (via the Task 4a equality helper). If the write throws **or** the read-back does not match, **do not send** `babyQuickCare`: release the in-flight ref, leave the breast timer and card values exactly as they are, and show the `home.saveBlocked` line. The `localStorage` write and read-back sit in a `try/catch`.
- [x] **Idle breast start (review round 3):** pressing an idle breast still sends `babyQuickCare` (a nap may have opened server-side), and when the response `steps` is **empty** the card just starts the local timer and shows one confirmation — an empty `steps` is a success, not an error.
- [x] The pending record and the breast timer are cleared **together**, only on a confirmed outcome, so a kept record always still has its running timer and a retry resends the original `durationSec`.
- [x] While a chain is in flight the cards show only the generic `home.saving` wording. **No step preview** — `expectedSteps` is gone.
- [x] **Skeleton parity, same task:** the row 1 block of `BabyHomeSkeleton` is updated here — two cards, same grid template, gap, height, and `rounded-[var(--radius-md)]` as live. **Idle skeleton cards include a subtitle bar placeholder at the live next-due subtitle height.**

**Verification:**
- [x] `npm test` — markup test for idle, running, and stale states.
- [x] `npm test` — markup: idle Left and Right show the **same** next-feed string; hide with no birthDate / no last feed; running shows elapsed only (no next line).
- [ ] Manual: start a timer, lock the phone for a minute, unlock — the number jumped correctly.
- [ ] Manual: throttled reload — row 1 does not shift when real content lands.

**Dependencies:** Tasks 1b, 3, 4, 4a, 5, 7 · **Scope:** M · **Files:** `components/baby-home.tsx` + test, `components/baby-page-skeleton.tsx`

---

## Task 9: Row 2 — bottle, sleep, diaper

**Description:** Three cards in the settled order, wired to the age band, the diaper cycle, the open-nap query, and the step planner.

**Acceptance criteria:**
- [x] Order left to right is bottle, sleep, diaper.
- [x] The bottle opens at the age default and shows the band hint. `+` / `−` stay inside the band and clamp at its edges.
- [x] The bottle card shows the **Custom ml** chip as its fourth control (behaviour lands in Task 9a).
- [x] A value from the Custom modal shows the Custom state in place of the band hint.
- [x] After a successful bottle save the value resets to the age default (not the last used amount, and never a sticky custom value).
- [x] The diaper opens at `wet` and cycles `wet → dirty → mixed → wet`.
- [x] After a successful diaper save the value resets to `wet`.
- [x] Sleep reads `openSleep` from `babyHomeQuickStatus` for its **label**, and takes the authoritative `openSleep` from each `babyQuickCare` response afterwards. A failed read makes **only sleep** fail closed with a Retry, copying `components/baby-sleep-form.tsx` — bottle and diaper stay usable (see the failure table in the design).
- [x] There is **no client CONFLICT handling** for sleep. The server reads the open nap inside its transaction, so the old "treat CONFLICT as success" branch does not exist.
- [x] Every press sends exactly **one** `babyQuickCare` mutation. No chain of separate care mutations is issued from home.
- [x] The same synchronous `inFlightRef` from Task 8 guards all six controls; the `saving` flag only drives the visible disabled state.
- [x] A failed chain saves nothing: the message is the single all-or-nothing line, the bottle and diaper values are unchanged, and the breast timer still runs.
- [x] A response with `replayed: true` is treated exactly like a first success — one confirmation, no duplicate message.
- [x] The confirmation names the steps from the **server response** `steps`, via `babyQuickCareStepMessageKey`. Nothing on the page previews the order before the response.
- [x] The pending record is written (and verified — Task 8) before every press and cleared per the Task 4a rules via `classifyBabyQuickCareError` — cleared on success, on `replayed: true`, and on a definite-no-commit code (`UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND`); kept as `"unknown"` on `BAD_REQUEST`, a 5xx, an unknown code, or a network failure.
- [x] Every chain ends with `invalidateBabyQueries(queryClient, "care")` and never navigates.
- [x] Bottle idle shows the **same next-feed** subtitle as the breast cards (Task 1b) — one shared string on L+R+bottle. Sleep idle shows next-nap from `lastSleep.endedAt`; while napping / `napOpen` shows elapsed only (no next line). Diaper idle shows next-diaper from `lastDiaper.at`.
- [x] Next-due subtitles are hidden when there is no birth date or no matching last event.
- [x] **Home clock:** same shared ≥30s visible-page timer + `visibilitychange` as Task 8; recompute bottle/sleep/diaper next-due labels from injected `now`.
- [x] Long-press on `+` / `−` auto-repeats; single taps still reach every value.
- [x] Row 2 grid is `repeat(auto-fit, minmax(min(100%, 6rem), 1fr))` — no hardcoded breakpoint.
- [x] **Skeleton parity, same task:** the row 2 block of `BabyHomeSkeleton` is updated here — three cards at the stretched live height, same grid template, gap, and radii. **Idle skeleton cards include a subtitle bar placeholder at the live next-due subtitle height.**

**Verification:**
- [x] `npm test` — markup tests for default value, custom state, and the nap toggle labels.
- [x] `npm test` — markup: bottle next-feed equals breast next-feed; sleep/diaper idle show / hide as designed; napping sleep has no next line.
- [ ] Manual: 360 px width, Vietnamese, dark mode — three cards fit and no label is cut off.
- [ ] Manual: throttled reload — row 2 does not shift when real content lands.

**Dependencies:** Tasks 1b, 4, 4a, 5, 5c, 7 · **Scope:** M · **Files:** `components/baby-home.tsx` + test, `components/baby-page-skeleton.tsx`

---

## Task 9a: Custom ml modal

**Description:** The explicit custom path for the bottle. A modal with one numeric input. Confirm sets the value on the card; it does not save a feed.

**Acceptance criteria:**
- [x] Uses `components/ui/modal.tsx` (native `<dialog>` + `showModal()`). **No hand-rolled focus trap** — the browser gives the trap, the dimmed backdrop, and `aria-modal`.
- [x] The Custom chip on the bottle card opens it; the chip has `aria-haspopup="dialog"`.
- [x] The input opens prefilled with the current card value, focused, with its text selected.
- [x] `Enter` submits (the body is a `<form>`). **Three ways out, all through one `onClose`:** `Escape` (the primitive's `cancel` handler), the title-row ✕, and the Cancel button.
- [x] **No backdrop-click handling.** `components/ui/modal.tsx` has none, and this task does **not** add one — that would change every other modal caller. A backdrop click leaves the modal open, which is also the safer night behaviour.
- [x] Confirm (`home.customMlUse`) closes the modal, sets the ml on the card, shows the Custom state, and **moves focus to the card's centre save button** so the next tap is the save.
- [x] Confirm **does not save a care event**. The caregiver still presses the centre to log the feed.
- [x] Cancel leaves the card value exactly as it was.
- [x] Validation calls `parseBabyCustomMl` from Task 2 — no duplicated rules in the component.
- [x] An invalid value shows the inline `Field` error, sets `aria-invalid`, keeps focus in the input, and **keeps the modal open**. Confirm is never disabled.
- [x] Uses `Field`, `Input`, `Button`, and semantic tokens only. Chips use `rounded-[var(--radius-sm)]`; every transition names its properties.
- [x] Labels come from the Task 6 keys; `common.cancel` is reused.
- [x] The modal **body** is exported as its own component (`BabyCustomMlForm`) so it can be unit-tested without the `Modal` wrapper. `Modal` uses `createPortal` and returns `null` until mounted, so `renderToStaticMarkup` of the wrapper renders nothing — a test around the wrapper would assert an empty string and pass for the wrong reason.
- [x] **Skeleton parity, same task:** the Custom chip makes the bottle card taller, so the row 2 skeleton height from Task 9 is re-checked here and updated if it changed.

**Verification:**
- [x] `npm test` — markup test on `BabyCustomMlForm` alone: one input, a Cancel, a Confirm; the error state renders the message and `aria-invalid`.
- [ ] Manual: keyboard-only run (open, type, Enter, then Space on the save target). Confirm a backdrop click does **not** close it. Light and dark. Vietnamese labels do not overflow.

**Dependencies:** Tasks 2, 6, 7, 9 · **Scope:** M · **Files:** `components/baby-custom-ml-modal.tsx` + test, `components/baby-home.tsx`, `components/baby-page-skeleton.tsx`

---

## Task 10: Row 3 — the 3AM answer lines

**Description:** Rewrite the last-care strip into three scannable lines: feed with `n/N today`, nap with a live state, diaper with the result. All three read from `babyHomeQuickStatus`.

**Acceptance criteria:**
- [x] The feed line shows the side or the ml, the time ago, and `n/N today`, using the exact `feedsToday` from the server.
- [x] With no `birthDate` it shows `n today` with no `/N`.
- [x] There is **no `n+ today` partial state** — the count is exact, so the wording and the key are gone.
- [x] A count above the guide max renders plainly (`12/6 today`) with no warning, colour change, or advice wording.
- [x] An open nap shows "Napping now" plus how long it has run.
- [x] A closed nap shows its length and when it ended.
- [x] Load failure shows the short error line, and matches the failure table in the design: breast, bottle, and diaper **stay usable**; only **sleep fails closed** with a Retry; the birth-date prompt is hidden.
- [x] Empty state shows the "not logged yet" wording, not an error.
- [x] No home link CTAs remain; `lib/baby-home-actions.ts` and its test are deleted.
- [x] **Skeleton parity, same task:** the row 3 block of `BabyHomeSkeleton` is updated here — three text lines at the live heights and gaps.

**Verification:**
- [x] `npm test` — rewritten `components/baby-home.test.ts`: no `href="/baby/feed"`, rows in order, error state keeps the controls.
- [x] `npm run lint` clean after the deletion.
- [ ] Manual: throttled reload — row 3 does not shift when real content lands.

**Dependencies:** Tasks 5, 8, 9 · **Scope:** M · **Files:** `components/baby-home.tsx`, `components/baby-home.test.ts`, `components/baby-page-skeleton.tsx`, delete `lib/baby-home-actions.ts` + `lib/baby-home-actions.test.ts`

---

## Task 10a: Birth date — settings field and home prompt

**Description:** Wire the new `updateBabyProfile` mutation into `/baby/settings`, and add the quiet home prompt shown while the birthday is unset.

**Acceptance criteria — settings:**
- [x] A new `SettingsSection id="baby-profile"` sits **above** the language section in `components/baby-settings-page.tsx`.
- [x] `Field` + `<Input type="date" max={todayIso} />`, prefilled from `babyProfileQueryOptions()`.
- [x] Save follows the existing `startTransition` + `notify.success` / `notify.error` pattern already used by the Telegram block, and is disabled while pending.
- [x] Success calls `invalidateBabyQueries(queryClient, "care")`, so the profile **and** the home quick status both refresh.
- [x] A server validation error is routed through `babyBirthDateErrorKey` (Task 5b) and shown as a **local English or Vietnamese sentence** on the field. The raw message is never rendered — it is a JSON blob of Zod issues.
- [x] Each token has a test: `BABY_BIRTH_DATE_INVALID`, `BABY_BIRTH_DATE_FUTURE`, `BABY_BIRTH_DATE_TOO_OLD`, `BABY_BIRTH_DATE_REQUIRED`, plus an unrecognised failure falling back to the generic sentence.
- [x] Clearing the field sends an explicit `birthDate: null` and succeeds. Saving with nothing picked never sends an empty input object.

**Acceptance criteria — home prompt:**
- [x] Renders only when `babyHomeQuickStatus.birthDate` is `null` **and** the dismissal has expired.
- [x] It is the **last block on the page**, after row 3, so it can never push the care controls down as data lands.
- [x] "Add birthday" links to `/baby/settings#baby-profile`.
- [x] "Not now" writes `baby.birthDatePrompt.dismissedUntil` (now + 7 days) to `localStorage` inside a `try/catch`, and the line returns after that.
- [x] The pure dismissal rule lives in `lib/` with its own test (`shouldShowBabyBirthDatePrompt({ birthDate, dismissedUntil, now })`) — never inline in the component.
- [x] It is an informational line, not an error and not a dialog. Nothing on home is disabled while the birthday is unset.
- [x] While unset: the bottle uses `BABY_FEED_GUIDE_FALLBACK` (60–150, default 120), the feed line hides `/N`, and the Custom modal still works over the full 10–300 range.
- [x] **Skeleton parity, same task:** confirm the skeleton still draws nothing for the prompt, and leave a comment saying why — it is the last block on the page, so it shifts nothing.

**Verification:**
- [x] `npm test` — the dismissal rule test, the error-key mapping tests, plus markup tests for prompt shown / hidden.
- [ ] Manual: save a birthday and confirm the bottle default moves to the new band without a reload.
- [ ] Manual: throttled reload on a workspace with no birthday — the prompt appearing last shifts nothing above it.

**Dependencies:** Tasks 1, 5, 5b, 6, 10 · **Scope:** M · **Files:** `components/baby-settings-page.tsx`, `components/baby-home.tsx`, `lib/baby-birth-date-prompt.ts` + test, `components/baby-page-skeleton.tsx`

---

## Task 10b: Pending-save bar and local-midnight rollover

**Description:** The two page-level behaviours from review round 2. The bar gives a press with an unknown outcome a visible way back. The rollover stops a page left open overnight from showing yesterday's feed count.

**Acceptance criteria — pending-save bar:**
- [x] On mount, home reads the pending record inside a `try/catch` and renders from `babyQuickPendingView` (Task 4a). Nothing is computed inline in the component.
- [x] `kind: "retryable"` shows one quiet line with **Try again** and **Discard**.
- [x] `kind: "tooOld"` shows the "we could not confirm this" line with a link to the timeline and **Discard** only — **no Try again**, so an old press cannot be stamped at "now".
- [x] **Try again resends the stored `request` and the stored `requestId`** — never the current card value. A test proves that stepping the bottle card after a pending press and then pressing Try again still sends the **stored** amount.
- [x] Try again goes through the same in-flight ref lock as a normal press.
- [x] **Discard clears the record only.** The breast timer, the bottle value, and the diaper value are all left exactly as they are.
- [x] **Nothing auto-retries.** A test asserts no mutation fires on mount when a pending record exists.
- [x] The bar renders **between row 3 and the birth-date prompt** — below every care control, so it can never push a card down as `localStorage` is read.
- [x] It is informational, not an error and not a dialog. No care control is disabled by it.
- [x] Labels come from the Task 6 keys: `home.pendingTitle`, `home.pendingRetry`, `home.pendingDiscard`, `home.pendingTooOld`, `home.pendingTimelineLink`.
- [x] Tokens only: outer surface `rounded-[var(--radius-md)]`, buttons `rounded-[var(--radius-sm)]`, transitions name their properties.

**Acceptance criteria — midnight rollover:**
- [x] Home holds the day window in state and arms a timer for `msUntilNextLocalMidnight(new Date()) + 1000`, then re-arms after each rollover.
- [x] `visibilitychange` and `focus` both recompute the window as a backup, because a sleeping phone throttles timers.
- [x] A recompute that lands on the **same `dayKey`** keeps the previous state object, so an early or repeated wake-up causes no refetch. Tested.
- [x] A new `dayKey` produces a new React Query key, so the new day fetches on its own with no manual `invalidateQueries`.
- [x] Every listener and timer is cleaned up on unmount. No leaked `setTimeout`.
- [x] **Skeleton parity, same task:** confirm the skeleton draws **nothing** for the pending bar, and leave a comment saying why — it sits below every care control, so it shifts nothing. The bottom-of-page order is row 3 → pending bar → birth-date prompt.

**Verification:**
- [x] `npm test` — markup tests for the three bar states (none, retryable, too old) and a rollover test that drives the window function directly.
- [ ] Manual: start a press with the network offline, reload, and check the bar. Press Try again with the network back and confirm one save.
- [ ] Manual: set the device clock to 23:58, leave `/baby` open, and confirm the feed count moves to the new day by itself.
- [ ] Manual: throttled reload — the rows do not shift when the bar appears.

**Dependencies:** Tasks 4a, 5, 8, 9, 10, 10a · **Scope:** M · **Files:** `components/baby-home.tsx` + test, `components/baby-page-skeleton.tsx`

---

## Task 11: Final skeleton parity check

**Description:** The skeleton is **not** written here. Each row task (8, 9, 9a, 10, 10a) already updated its own block in the same change, per the repo rule. This task is only the whole-page read-through and the throttled reload that proves zero layout shift after the final UI tweaks.

**Acceptance criteria:**
- [ ] Order matches live: row 1 → row 2 → row 3.
- [ ] Row 1 draws two cards at the live height; row 2 draws three cards at the **stretched** live height (the bottle is tallest because of the Custom chip, so all three use that height); row 3 draws three text lines.
- [ ] **Idle care-card skeletons include the next-due subtitle bar placeholder** at the live subtitle height (Tasks 8/9 own the draw; this task confirms it).
- [ ] Grid templates, gaps, and radii match the live rows, re-read side by side after the last UI tweak.
- [ ] Outer blocks use `rounded-[var(--radius-md)]`, inner ones `rounded-[var(--radius-sm)]`.
- [ ] The skeleton does **not** draw the pending-save bar or the birth-date prompt — both sit below every care control, so they shift nothing. The comment explaining that is present.
- [ ] Bottom-of-page order is row 3 → pending bar → birth-date prompt, and the live page matches.
- [ ] No skeleton block is left over from the old four-CTA layout.
- [ ] If this task has to **change** anything, that is a miss in the row task that owned it — note which one, so the habit is fixed rather than patched at the end.

**Verification:**
- [ ] Manual: throttle to Slow 3G, reload `/baby`, watch for any jump when real content lands — including a workspace with no birth date, where the prompt appears last.
- [ ] `npm run build` clean.

**Dependencies:** Tasks 8, 9, 9a, 10, 10a, 10b · **Scope:** S · **Files:** `components/baby-page-skeleton.tsx` (check only; edits here mean a row task missed its own parity)

---

### Checkpoint B (after Task 11)

- [ ] `npm test`, `npm run lint`, `npm run build` all clean.
- [ ] `DATABASE_URL=… npm test` — the live-database race and replay suites pass, not skipped.
- [ ] The whole night flow works by hand: breast, switch sides, bottle, nap, diaper — no page change.
- [ ] Two devices by hand: start a nap on `/baby/sleep` on one, press Diaper on home on the other, and confirm the nap is ended before the diaper.
- [ ] Light and dark both survive a switch in `/settings`.
- [ ] No layout shift on a throttled reload.

---

## Task 12: End-to-end coverage

**Description:** Rewrite the home tests that asserted the four link CTAs, then add the quick-log, auto-finalize, and geometry proofs. This is where interaction correctness is actually proven, since clicks cannot be unit tested here.

**Status (adversarial review fix):** Deferred to `my-test-workflow`. Acceptance boxes stay unchecked. Do not treat existing `e2e/baby-care.spec.ts` green as Option B coverage.

**Acceptance criteria:**
- [ ] The old home-CTA tests (roughly `e2e/baby-care.spec.ts` lines 48–130) are rewritten: the forms are reached from the hamburger menu, not from home.
- [ ] The home GraphQL mocks are rewritten to answer **one** `BabyHomeQuickStatus` read and **one** `BabyQuickCare` mutation per press, instead of `BabyTimeline` + `BabyOpenSleep` + `BabyProfile` and a chain of care mutations.
- [ ] The `BabyQuickCare` mocks return `steps { step event { … } }`, matching the round-2 contract. A mock that still returns `eventId` must fail the test.
- [ ] The existing `/baby/sleep` form tests still pass unchanged, proving the Task 5d lock did not move the sleep contract.
- [ ] Breast: tap starts a timer, tap again saves exactly one feed with the right side.
- [ ] Breast switch: tapping the other side saves the first side and starts the second.
- [ ] Reload with a timer running keeps it running with roughly the same elapsed time.
- [ ] Bottle: `+` twice then save posts `amountMl` two steps above the age default; the value resets afterwards.
- [ ] Bottle stepper **clamps**: holding `+` at the band max never posts a value above the band.
- [ ] **Custom modal:** open it, type `95`, Confirm → the card reads 95 with the Custom state; the centre save posts `amountMl: 95`; the value then resets to the age default.
- [ ] **Custom modal cancel:** Escape, the title-row ✕, and Cancel each leave the card value unchanged.
- [ ] **Custom modal backdrop:** clicking the dimmed area does **not** close the modal and does not change the card value. The shared primitive has no backdrop handler and this pass does not add one.
- [ ] **Custom modal validation:** `12.5` and `400` keep the modal open and show the inline error; no mutation fires.
- [ ] **Custom modal focus:** after Confirm, focus is on the bottle's centre save button.
- [ ] Diaper: cycle to `dirty`, save, and confirm the value returns to `wet`.
- [ ] Sleep: toggle Start then End, driven by the `openSleep` each `BabyQuickCare` response returns.
- [ ] **Auto-finalize:** with a breast timer running and a nap open, pressing Diaper sends **one** `BabyQuickCare` carrying `breastRunning` and the diaper action, and the mocked response's `steps` render as `saveBreast` → `endNap` → `createDiaper`. No separate `createBabyFeed` / `endBabySleep` / `createBabyDiaper` request leaves the page.
- [ ] **Chain failure is all-or-nothing:** make `BabyQuickCare` fail and confirm the message is the single "nothing was saved" line, the breast timer is still running, and the diaper value is unchanged.
- [ ] **Exactly once — double tap:** two fast taps on a care control produce exactly **one** `BabyQuickCare` request. Assert on the intercepted request count, not on the visible disabled state.
- [ ] **Exactly once — replay:** answer a second identical request with `replayed: true` and the same `steps`, and confirm the UI shows one save and no duplicate message.
- [ ] **Reload mid-save, every action:** drop the `BabyQuickCare` response, reload, and confirm the pending bar appears after a **bottle**, a **diaper**, a **sleep**, and a **breast** press. Four separate cases — round 1 only covered breast.
- [ ] **Retry sends the same press:** Try again carries the **same** `clientRequestId`, the same action, and the same `durationSec` — asserted on the intercepted request **body**, not just the count.
- [ ] **Changed value cannot reuse an id:** leave a pending bottle at 120 ml, step the card to 150 ml, press Try again, and confirm the request carries **120** with the stored id. Then press the card and confirm a **new** id with 150.
- [ ] **Pending clear rules (code-based, review round 3):** a `NOT_FOUND` / `UNAUTHORIZED` / `FORBIDDEN` response clears the bar and shows the failure line; a `BAD_REQUEST`, a `500`/5xx, and a network failure each **keep** the bar as `unknown`; a successful Try again (answered `replayed: true`) clears it and shows **one** confirmation; Discard clears it and leaves a running breast timer alone.
- [ ] **Fail-closed persistence (review round 3):** override `localStorage.setItem` to throw (and, in a second case, to store a wrong value), press a care control, and assert **zero** `BabyQuickCare` requests leave the page, the `home.saveBlocked` line shows, and the breast timer and card values are unchanged.
- [ ] **Idle breast start (review round 3):** with no timer and `openSleep: null`, tap an idle breast; answer `BabyQuickCare` with empty `steps`; confirm the local timer starts, one confirmation shows, and a replayed retry does not start a second timer or show a duplicate.
- [ ] **Pending too old:** seed a pending record older than 30 minutes and confirm the bar offers only the timeline link and Discard — no Try again.
- [ ] **Nothing auto-retries:** with a pending record seeded, loading `/baby` fires **zero** `BabyQuickCare` requests until Try again is pressed.
- [ ] **Midnight rollover:** open home just before local midnight with `page.clock`, move the clock past midnight **without touching the page**, and confirm a second `BabyHomeQuickStatus` fires with the **new** `dayFrom` / `dayTo`. Repeat in a 23-hour and a 25-hour local-day timezone.
- [ ] **No step preview:** while a chain is in flight the page shows only the generic saving wording; step names appear **only** after the response and match the mocked `steps`.
- [ ] **Concurrent nap:** mock the read with `openSleep: null` but answer `BabyQuickCare` with an `endNap` step, and confirm the sleep card lands on "Start nap" from the response rather than from the stale read.
- [ ] **Count refresh:** first read returns `feedsToday: 3`, the refetch after a save returns `4`. Row 3 moves from `3/…` to `4/…`, and both requests carry the **same** `dayFrom` / `dayTo`.
- [ ] **Read failure:** force `babyHomeQuickStatus` to fail and confirm breast, bottle, and diaper still save while only sleep shows the Retry.
- [ ] **Birth date, unset:** with `birthDate: null` the prompt is the last block on the page and links to `/baby/settings#baby-profile`; the feed line shows `n today` with no `/N`; "Not now" hides the line; **all next-due subtitles are hidden**.
- [ ] **Birth date, set:** saving a date in `/baby/settings` posts `updateBabyProfile` with `birthDate` only, and back on home the bottle default matches the new age band.
- [ ] **Birth date, bad value:** force each server token (`BABY_BIRTH_DATE_INVALID`, `BABY_BIRTH_DATE_FUTURE`, `BABY_BIRTH_DATE_TOO_OLD`, `BABY_BIRTH_DATE_REQUIRED`) and confirm the field shows the matching local sentence. Assert the page text contains **no** `{`, no `"code"`, and no token string — a JSON leak must fail the test.
- [ ] **Next-due — shared next-feed (01 success):** with a last feed and birthDate mocked, idle Left, Right, and bottle show the **same** next-feed subtitle text (`next in …` or overdue). Covered in e2e here; pure math stays in Task 1b (`lib/baby-next-due.test.ts`); shared-string markup also asserted in Tasks 8/9 verification.
- [ ] **Next-due — sleep awake-from-ended (01 success):** idle sleep shows next-nap after an ended nap; while `openSleep` / napping, sleep shows elapsed only (no next line). Markup hide/show also in Task 9 verification; interval math in Task 1b.
- [ ] **Next-due — diaper (01 success):** idle diaper shows next-diaper when last diaper + birthDate exist; hides when either is missing. Markup in Task 9 verification; interval math in Task 1b.
- [ ] 3AM geometry: every **care** control is at least 56 px tall and rows appear in top-to-bottom order. The Custom chip (44 px) is excluded from that check by an explicit selector, not by loosening the floor.
- [ ] The full flow passes in Vietnamese, including the Custom modal, the birth-date prompt, and every birth-date error sentence.

**Verification:**
- [ ] `npx playwright test e2e/baby-care.spec.ts` green.
- [ ] Confirm no test still looks for a `link` role named "Log feed" on home.

**Dependencies:** Tasks 8–11 (including 9a, 10a, and 10b) · **Scope:** M · **Files:** `e2e/baby-care.spec.ts`, `e2e/helpers/*` if a GraphQL call recorder is worth extracting

---

## Task 13: Low-light timed usability check

**Description:** Prove — or fail — the `01-idea.md` metric: at least 90% of logging attempts correct within 5 seconds in low light. Automated tests cover correctness, not speed in the dark, so this is one short manual run with a written script. It is the only place the headline metric is measured.

**Acceptance criteria:**
- [ ] The script from `03-design.md` → "Low-light timed check" is followed exactly: lights off, lowest brightness, dark theme, one hand, thumb only, `/baby` already open, a workspace with a birthday and some history.
- [ ] 20 attempts, shuffled: 5 breast, 5 bottle, 5 sleep, 5 diaper.
- [ ] Timing runs from handing the phone over to the success message appearing. A page change, a wrong saved value, or a correction afterwards counts as failed, however fast it was.
- [ ] The full set is run once in English and once in Vietnamese.
- [ ] Every attempt is recorded with its time; every failure gets a one-line reason.
- [ ] The device model, date, tester, and both language results are written into `06-test-log.md`.
- [ ] **Pass rule:** at least 18 of 20 correct and under 5 seconds, in each language.

**Verification:**
- [ ] `06-test-log.md` contains the table and a clear pass or fail line per language.
- [ ] A fail is reported as a finding for the next design round, not quietly rounded up.

**Dependencies:** Task 12 · **Scope:** S · **Files:** `.my-docs/workflow/baby-home-redesign/06-test-log.md`

---

### Checkpoint C (after Task 12) — ready for review

- [ ] Unit, lint, build, and e2e all green, plus the live-database suites with `DATABASE_URL` set.
- [ ] Every success criterion in `01-idea.md` maps to a passing test, and the 90% / 5 s metric has a recorded result from Task 13.
- [ ] **Next-due criteria map (explicit):** shared L/R/bottle next-feed → Task 12 e2e + Tasks 8/9 markup + Task 1b unit; sleep awake-from-`endedAt` → Task 12 e2e + Task 9 markup + Task 1b unit; diaper next-due → Task 12 e2e + Task 9 markup + Task 1b unit. No unmarked 01 next-due bullet.
- [ ] The **only** GraphQL and Zod additions are `babyHomeQuickStatus`, `babyQuickCare`, and `updateBabyProfile`. `lib/graphql/map-service-error.ts` and `components/ui/modal.tsx` are untouched.
- [ ] **Exactly one migration**, `0039_baby_quick_care_request.sql`, additive only, with RLS enabled, forced, and a workspace policy. No other schema change.
- [ ] **The only change to existing care mutations is the shared nap lock:** inside `startBabySleep` and `endBabySleep`, and inside `updateBabyEvent` / `deleteBabyEvent` **only on a sleep row** (review round 3). Their inputs, outputs, and error codes are byte-for-byte the same, and the existing `/baby/sleep` tests prove it. `createBabyFeed`, `createBabyDiaper`, and feed/diaper corrections are untouched.
- [ ] Grep: no `expectedSteps`, no `payload->>'quickRequestId'` in a `WHERE`, no `interval '10 minutes'`.
- [ ] Skeleton parity re-checked after the final UI tweaks (Task 11), including idle next-due subtitle placeholders, and no row task needed a late patch.
- [ ] Grep the built pages: no raw GraphQL or Zod message is rendered to a user.

---

## Task index

| # | Task | Scope | Depends on |
|---|------|-------|------------|
| 1 | Calendar dates, age bands, bottle defaults | M | — |
| 1b | **Next-due clocks (feed / sleep / diaper)** | M | 1 |
| 2 | Bottle stepper, diaper cycle, custom-ml validation | S | 1 |
| 3 | Breast timer store | S | — |
| 4 | Quick-care request planner *(no `expectedSteps`)* | S | 2, 3 |
| 4a | **Pending-request store** | S | 3, 4 |
| — | **Checkpoint A — human review of the order rules and the pending rules** | — | 4a |
| 5m | **Migration — `baby_quick_care_request`** | S | — |
| 5d | **One nap lock for every nap write path** | M | — |
| 5a | **Server read — `babyHomeQuickStatus`** | M | — |
| 5b | **Server write — `updateBabyProfile`** | M | 1 |
| 5c | **Server write — `babyQuickCare` (the ordered chain)** | M | 5m, 5d |
| 5 | Client query wiring + midnight window helper | M | 1, 4, 4a, 5a, 5c |
| 6 | Labels in English and Vietnamese | S | — |
| 7 | Breast glyph and stepper card primitive | M | 2, 6 |
| 8 | Row 1 — breast cards with timer *(+ next-feed subtitle + row 1 skeleton)* | M | 1b, 3, 4, 4a, 5, 7 |
| 9 | Row 2 — bottle, sleep, diaper *(+ next-due subtitles + row 2 skeleton)* | M | 1b, 4, 4a, 5, 5c, 7 |
| 9a | **Custom ml modal** *(+ row 2 height re-check)* | M | 2, 6, 7, 9 |
| 10 | Row 3 — the 3AM answer lines *(+ row 3 skeleton)* | M | 5, 8, 9 |
| 10a | **Birth date — settings field and home prompt** | M | 1, 5, 5b, 6, 10 |
| 10b | **Pending-save bar + midnight rollover** | M | 4a, 5, 8, 9, 10, 10a |
| 11 | Final skeleton parity **check** | S | 8, 9, 9a, 10, 10a, 10b |
| — | **Checkpoint B — full night flow by hand, two devices** | — | 11 |
| 12 | End-to-end coverage | M | 8–11 |
| 13 | **Low-light timed usability check** | S | 12 |
| — | **Checkpoint C — ready for review** | — | 13 |

**Order note.** The server contract is what everything else waits on, so run the server tasks **first**, in parallel with Tasks 1, 3, and 6. Inside the server group the order is fixed: **5m** (the table) and **5d** (the lock) before **5c**, because 5c uses both. 5a and 5b are independent of all three.

**Riskiest tasks, in order.** **5d** — it edits two shipped care mutations, and a lock that is wrong or missing is invisible until two caregivers collide. **5c** — it owns the order, the freshness, and the durable exactly-once promise. **4a** — the clear and retry rules are the one place this design can still write twice or silently lose a press. Give all three a human read before the UI is wired.

**Live-database note.** Tasks 5c and 5d each carry a `*.db.test.ts` suite that needs `DATABASE_URL`. They skip themselves without it, so **Checkpoint B explicitly runs them with a database**. A green `npm test` alone does not prove the lock.

**Skeleton note.** There is no "write the skeleton later" task any more. Tasks 8, 9, 9a, 10, 10a, and 10b each update their own slice of `BabyHomeSkeleton` in the same change, per the repo rule. Task 11 only reads the whole page and reloads it throttled.

**Sequencing.** Tasks 1, 3, 5m, 5d, 5a, and 6 are independent and can run in parallel. Tasks 8, 9, 9a, 10, 10a, and 10b all edit `components/baby-home.tsx` **and** `components/baby-page-skeleton.tsx`, so they must run in sequence.
