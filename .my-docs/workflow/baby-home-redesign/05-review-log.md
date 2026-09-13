# Review log: baby-home-redesign

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `features/baby/server/care-events.db.test.ts`, `features/baby/server/quick-care.db.test.ts` | Live-DB suites were empty placeholders that passed with zero asserts when DATABASE_URL was set. | fixed |
| Major | `features/baby/server/quick-care.test.ts` | Missing unique-violation replay, mid-chain rollback, every-action-shape replay, and Telegram notify rules. | fixed |
| Major | `lib/validators/baby.test.ts`, `features/baby/server/profile.test.ts` | Missing updateBabyProfile validator + service tests (required key, null clear, leap/impossible/future/too-old, set/change/clear/reject-empty). | fixed |
| Major | `lib/baby-query-options.test.ts` | Missing clear-vs-keep / `babyQuickErrorClass` wiring for UNAUTHORIZED/FORBIDDEN/NOT_FOUND vs BAD_REQUEST/5xx/network. | fixed |
| Major | `features/baby/server/home-quick-status.test.ts` | Half-open window test was mock theater (stub args only). | fixed |
| Major | `components/baby-home.test.ts` | Missing pending bar / Try-again stored amount / no auto-retry / fail-closed saveBlocked markup/logic. | fixed |
| Major | `lib/graphql/baby-yoga.test.ts` | Missing babyQuickCare / babyHomeQuickStatus / updateBabyProfile wiring + notify filter. | fixed |
| Enhancement | Task 12 / `e2e/baby-care.spec.ts` | Task 12 e2e still deferred to my-test-workflow; do not claim Option B coverage from existing e2e. | fixed |
| Enhancement | `components/baby-custom-ml-modal.test.ts` | Missing error state + `aria-invalid` markup. | fixed |
| Enhancement | `lib/baby-home-day-window.test.ts` | Missing 23h/25h DST coverage for `msUntilNextLocalMidnight` / window length. | fixed |
| Nit | `lib/baby-age-guide.test.ts` | DST test comment mentions TZ but never sets it. | open |
| Nit | `lib/baby-quick-care-plan.test.ts` | No sub-second `durationSec` floor case. | fixed |
| FYI | Pure lib suites for calendar, steppers, breast timer, pending round-trip, outcome classifier, next-due bands, and shared auto-finalize fixture ↔ server order walk look solid and deterministic. | — | — |

**Result:** Round 2 — clean.

**Round notes:** Round 1 — not clean. Highest risk: empty live-DB placeholders greenwashing Tasks 5c/5d, plus missing unit coverage for unique-violation replay, all-or-nothing rollback, birth-date/quick-care validators, pending clear-vs-keep / fail-closed, and half-open count mock theater. Task 12 e2e gap is Enhancement only (deferred), but unit tests must not pretend that coverage exists.

**Round notes (Fix — adversarial-tests):** Round 2 fix pass.
- **Critical:** Replaced empty `*.db.test.ts` placeholders with real `{ skip: !hasDb }` suites (race/reopen/delete/replay/concurrency). Without `DATABASE_URL` they skip; they no longer pass empty. Task 5c/5d live acceptance stays claimed by real tests; `DATABASE_URL=… npm test` verification boxes remain unchecked until Checkpoint B runs them.
- **Major quick-care:** Added unique-violation → replay, mid-chain rollback (no rows / no request), every action-shape replay, and `babyQuickCareNotifyKinds` notify rules.
- **Major profile:** Validator cases for leap/impossible/future/too-old + service set/change/clear/reject-empty. Guarded `updateBabyProfileSchema` superRefine so invalid dates do not throw.
- **Major clear-vs-keep:** `babyQuickCareMutationOptions` stamps `babyQuickErrorClass` for definiteNoCommit vs ambiguous.
- **Major half-open:** Pure `isFeedInBabyDayWindow` / `countFeedsInHalfOpenWindow` plus SQL gte/lt source assert.
- **Major home markup:** Pending none/retryable/tooOld, saveBlocked seed, no auto-retry; pure `writeBabyQuickPending` / `babyQuickCareRetryPayload` helpers.
- **Major yoga:** Stub hooks for home quick status / update profile / quick care + notify filter wiring.
- **Enhancement custom-ml:** Error + `aria-invalid` via `initialErrorKey`.
- **Enhancement day-window:** DST 23h/25h subprocess under `TZ=America/New_York`.
- **Enhancement Task 12:** Status fixed as **deferred** to my-test-workflow — no e2e code change; do not claim coverage.
- **Nit:** Added planner `durationSec` floor case. Age-guide TZ subprocess left open (optional).

**Round notes (Verifier — round 2):** Re-checked claimed fixes against real files and ran the suites (with `scripts/test-env.mjs` for yoga). All Round 1 Critical / Major / Enhancement items hold: live-DB suites are real `{ skip: !hasDb }` tests (not empty passes); quick-care unique-violation / rollback / action-shape replay / notify rules present; profile validator + service coverage present; clear-vs-keep stamps `babyQuickErrorClass`; half-open uses pure window helpers + SQL gte/lt source assert (not stub-arg theater); baby-home pending/fail-closed markup + pending retry payload keep stored amount; yoga wiring + notify filter pass; custom-ml `aria-invalid`; day-window DST 23h/25h subprocess passes. Task 12 stays deferred (Enhancement closed). Open Nit only: age-guide TZ comment (does not block). **Round 2 — clean.**

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Critical | `components/baby-home.tsx` (`runQuick`) | Retry / reuse path sets `localAfter: null` and applies breast follow-up only when `!reuse`. After a confirmed Retry or replay of a press that had `breastRunning` (stop / switch / bottle-with-breast), the running timer is **not** cleared. Design requires the timer and pending record to clear together on a confirmed response. Timer left running → next press sends a new `breastRunning` → a **second** breast feed. Idle breast + open nap Retry also skips `startBreastSide` when `steps` is non-empty (only the empty-`steps` branch starts the timer). | fixed |
| Major | `features/baby/server/quick-care.ts` (unique-violation branch) | Design: on `storeResult` unique violation, **roll back** then return the stored replay. Code returns `resultFromStored` **without** throwing, so care inserts already done in the same transaction can still **COMMIT** as orphans. The nap lock makes this rare, but the safety net is wrong and the stub test does not assert zero orphan writes. | fixed |
| Major | `components/baby-page-skeleton.tsx` (`BabySettingsSkeleton`) | Live `/baby/settings` gained `SettingsSection id="baby-profile"` (date Field + Save) above language. Skeleton still starts at language / telegram only — CLS / skeleton-parity miss for Task 10a + repo UI rules. | fixed |
| Enhancement | `lib/baby-quick-care-pending.ts` | Storage key is `baby.quickPending.v1`; design spells `baby.quickCare.pending.v1`. Behavior is fine; names drifted from the contract. | fixed |
| Enhancement | `components/baby-home.tsx` (home clock) | Next-due clock uses ≥30s interval + `visibilitychange` only. Midnight rollover also listens for `focus`; the display clock does not, so a wake path that skips visibility can leave next-due labels stale until the next tick. | fixed |
| Nit | `components/baby-home.tsx` | Ephemeral `message` / `saving` status sits between row 3 and the pending bar. Care rows stay put; pending / birth blocks can still shift when the status line appears. | fixed |
| Nit | `components/baby-home.tsx` (birth prompt) | Pending bar buttons use `min-h-11`; birth prompt “Add birthday” / “Not now” do not. | fixed |
| FYI | Order fixture, fail-closed pending, classifier, next-due, i18n, cards | Shared `BABY_AUTO_FINALIZE_TABLE` matches server breast→nap→action; pending write+read-back fail-closed; clear only UNAUTHORIZED/FORBIDDEN/NOT_FOUND; next-due bands + pump/null→default; EN/VI keys match; value cards are sibling buttons (no nest); no `fx-hit-40` on ≥44 px controls; home skeleton skips pending + birth by design. | — |

**Result:** Round 2 — clean.

**Round notes:** Round 1 — Quality review (independent verifier). Highest risk: Retry success that never applies `localAfter`, which can leave the breast timer running after a confirmed save and open a duplicate breast write. Next: unique-violation path that can commit orphan care rows instead of rolling back. Settings skeleton missing the new birth-date block. Nested buttons / hit-area overlap / EN+VI key parity / auto-finalize fixture order look fine.

**Round notes (Fix — quality):** Round 1 fix pass.
- **Critical Retry localAfter:** Added `localAfterFromQuickRequest` (pure helper) and unit coverage against every auto-finalize row + breastRunning clear/start cases. `runQuick` now derives and applies `localAfter` on Retry the same as a first press (no empty-`steps` special case).
- **Major unique-violation:** `storeResult` 23505 now throws out of the care lock so the tx rolls back orphan care inserts; then re-reads and returns replay. Stub test asserts zero orphan rows / writes after the path.
- **Major settings skeleton:** `BabySettingsSkeleton` adds birth-date Field + Save block above language (order matches live settings).
- **Enhancement pending key:** Storage key is `baby.quickCare.pending.v1`; legacy `baby.quickPending.v1` is read once and migrated.
- **Enhancement home clock:** Next-due clock listens for `focus` alongside `visibilitychange`.
- **Nits:** Ephemeral message/saving moved below the pending bar; birth prompt actions use `min-h-11`.

**Round notes (Verifier — Quality round 2):** Re-checked claimed Round 1 fixes against real code (generation ≠ verification). All hold:
1. **Retry localAfter** — `runQuick` reuse path sets `localAfter: localAfterFromQuickRequest(reuse.request)` and applies clear/start after confirmed success with no `!reuse` / empty-`steps` skip (`components/baby-home.tsx`). Helper + fixture coverage in `lib/baby-quick-care-plan.ts` / `.test.ts`.
2. **Unique-violation** — `storeResult` 23505 propagates out of `withCareLock` so the tx rolls back; outer catch re-reads and returns `resultFromStored` (`features/baby/server/quick-care.ts`). Stub simulates rollback and asserts zero orphan rows/writes.
3. **Settings skeleton** — `BabySettingsSkeleton` birth Field + Save block sits above language, matching live `baby-profile` order.
4. **Pending key** — `baby.quickCare.pending.v1` with one-shot legacy migrate from `baby.quickPending.v1`.
5. **Home clock focus** — next-due interval effect listens for `focus` and `visibilitychange` (same as midnight).
Nits from Round 1 also look addressed; they do not block. **Round 2 — clean.**

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | — |

**Result:** Round 1 — clean.

**Round notes:** Security review (Senior Verifier). Subagent unavailable (usage limit); manual review against `security-and-hardening` for baby-home-redesign surfaces.

**Authz**
- `babyQuickCare` / `updateBabyProfile` use `requireBabyWriteWorkspace` + `runInWorkspace` (`lib/graphql/baby-resolvers.ts`).
- `babyHomeQuickStatus` uses `requireBabyWorkspace` (read) + `runInWorkspace`.
- Replay lookup is `(workspaceId, requestId)` only; `payload.quickRequestId` is trace-only (`features/baby/server/quick-care.ts`).
- Workspace id comes from verified membership context, not from the client body.

**RLS / DB**
- Migration `0039_baby_quick_care_request.sql`: ENABLE + FORCE RLS and `baby_quick_care_request_workspace_rls` with `USING`/`WITH CHECK` on `app_current_workspace_id()` — same shape as `0038_baby_vaccine.sql`. Asserted in `db/schema/baby.test.ts`.

**Injection / untrusted input**
- Edge validation via `babyQuickCareSchema`, `updateBabyProfileSchema` / `babyBirthDateSchema`, `babyHomeQuickStatusInputSchema` (ISO datetimes, `dayFrom < dayTo`, window ≤ 26h).
- Birth date: strict `YYYY-MM-DD` calendar parse; reject future / too-old.
- Queries use Drizzle `eq` / `and` / `gte` / `lt` — no string-built SQL from client fields.
- Care lock: `hashtext(${workspaceId + suffix})` is a single bound parameter.

**Pending localStorage / PII**
- Pending is UX/idempotency state (not session tokens). Fail-closed write + read-back; `babyId` must match before apply; Retry resends stored request; server re-validates.
- UI renders i18n / React text children (no `dangerouslySetInnerHTML`).
- No new secrets in repo or notify path; Telegram notify skips `endNap` and skips all steps when `replayed`.

**FYI (do not block):** `clientRequestId` allows any 8–64 char string (UI uses UUID); `updateBabyProfile` WHERE is by profile id under RLS (care updates also filter `workspaceId`); request-table retention is a documented follow-up, not this pass; `amountMl` stays unbounded positive by design (same as `createBabyFeed`).

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-home.tsx` (`BabyHome` day effect) | `babyHomeQuickStatus` is keyed by `BabyHome`’s `dayKey`, but that day only rolls on `setTimeout`. Wake handlers (`visibilitychange` / `focus`) live only on `BabyHomeContent`, where `day` drives `data-day-key` and never the query. After backgrounding past local midnight, the home query can keep yesterday’s `[dayFrom, dayTo)` (stale `feedsToday`) until a throttled timer fires; Content’s wake work does not refetch. Design required the same wake signals on the day that owns the query. | fixed |
| Enhancement | `features/baby/server/home-quick-status.ts` + `db/schema/baby.ts` | Hot home read runs three `ORDER BY occurred_at DESC, id DESC LIMIT 1` last-of-type queries. Index `baby_care_event_baby_type_idx` is only `(baby_id, type)` — no `occurred_at` — so Postgres cannot do a true index top-1; it must collect/sort matching rows as history grows. Design claimed “indexed LIMIT 1”; a `(baby_id, type, occurred_at DESC)` (or workspace-scoped equivalent) would match the query shape. | fixed |
| Enhancement | `lib/graphql/baby-resolvers.ts` (`babyQuickCare` notify loop) | Each non-`endNap` step calls `scheduleNotifyBabyCareCreated`, and each call re-reads the Telegram link (`getLink` → DB) before send. A breast→diaper (or breast→formula) press does the link lookup twice in parallel fire-and-forget work. | fixed |
| Enhancement | `lib/baby-query-options.ts` (`invalidateBabyQueries` `"care"`) | Every successful quick care invalidates `babyKeys.profile()` as well as the timeline/`homeQuick` prefix. Birth date almost never changed on that path — extra profile GraphQL round-trip after every press. | fixed |
| Enhancement | `components/baby-home.tsx` (home clock) | While a breast timer runs, one shared `setInterval(…, 1000)` re-renders the whole `BabyHomeContent` tree (next-due labels, relative “when”, pending age, nap elapsed). Design allows breast ~1s and next-due ≥30s; isolating the elapsed tick would cut 1 Hz full-tree work. | fixed |
| Enhancement | `components/baby-home.tsx` | Two midnight schedulers (`BabyHome` + `BabyHomeContent`). Content’s copy is unused for fetching — pure hot-path waste beside the Major wake/query gap. | fixed |

**Result:** Round 2 — clean.

**Round notes:** Performance review (Senior Verifier) against `performance-optimization` + `vercel-react-best-practices` for baby-home-redesign hot paths.

**What looks good**
- `getBabyHomeQuickStatus`: profile then `Promise.all` of five bounded reads (no client waterfall; no N+1 loop).
- Home client: single `useQuery` for status; day window capped by schema (≤26h); last-of-type / open-sleep / feed count all `LIMIT 1` or `count(*)`.
- Quick care: point lookup by `(workspaceId, requestId)`; no time-window scan; lock hold is a short fixed chain (not unbounded list work).
- Default React Query `staleTime: 30_000`; care invalidation scopes to timeline prefix (includes `homeQuick`) without refetching sync/telegram.
- No new heavy chart/vendor bundle on home; custom-ml modal is small.

**Highest risk:** query `dayKey` does not wake with the page, so overnight background can serve yesterday’s `feedsToday` until a delayed timer. Next: last-of-type index shape vs `ORDER BY occurred_at`, then notify link re-read and avoidable profile invalidate / 1 Hz full-tree ticks.

**Round notes (Fix — performance):** Round 1 fix pass (does not self-approve).
- **Major dayKey wake:** Extracted `attachBabyLocalDayRoll` + `nextBabyLocalDayIfChanged` (`lib/baby-home-day-window.ts`). `BabyHome` (query owner) arms midnight `setTimeout` **and** `visibilitychange`/`focus`. Content no longer owns a day scheduler; `dayKey` is passed down for `data-day-key` (single fetch source).
- **Enhancement last-of-type index:** **No migration 0040.** Comment on `defaultFindLastOfType`: existing `(baby_id, type)` + `LIMIT 1` is acceptable at family scale. Covering `(baby_id, type, occurred_at DESC)` needs Gate ask / second migration if product wants it later.
- **Enhancement notify:** `scheduleNotifyBabyCareCreatedMany` / `maybeNotifyBabyCareCreatedMany` — one `getLink` per mutation batch; `babyQuickCare` uses `notifyMany`.
- **Enhancement invalidate:** `"care"` invalidates timeline/`homeQuick` only; new `"profile"` scope (profile + timeline) used by settings birth-date save.
- **Enhancement clock + duplicate midnight:** Parent clock always ≥30s; `BabyBreastElapsedText` isolates 1 Hz breast elapsed. Content midnight scheduler removed.

**Round notes (Verifier — Performance round 2):** Re-checked claimed Round 1 fixes against real code (generation ≠ verification). All hold:
1. **Major dayKey wake** — `BabyHome` owns `attachBabyLocalDayRoll` (midnight `setTimeout` + `visibilitychange`/`focus`); `useQuery` keys off `day.dayKey` passed into Content. Content has no day scheduler (`doesNotMatch` attach / `msUntilNextLocalMidnight`).
2. **Enhancement last-of-type index** — **Deferred without migration** (no `0040_*.sql`). Comment on `defaultFindLastOfType` documents family-scale `(baby_id, type)` + `LIMIT 1`; covering index left as Gate/follow-up. Closed as fixed/deferred.
3. **Enhancement notify** — `maybeNotifyBabyCareCreatedMany` / `scheduleNotifyBabyCareCreatedMany` one `getLink` per batch; `babyQuickCare` calls `notifyMany(payloads)`.
4. **Enhancement invalidate** — `"care"` invalidates timeline prefix only; `"profile"` is separate (settings birth-date save). Unit tests assert care does not touch profile.
5. **Enhancement clock** — Content interval is `30_000`; `BabyBreastElapsedText` owns the 1 Hz breast tick.
6. **Enhancement duplicate midnight** — Content day roll removed; single fetch source on `BabyHome`.
No Critical / Major / Enhancement remain open. **Round 2 — clean.**

---


## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | — |

**Result:** Round 1 — clean.

**Round notes:** Memory review (Senior Verifier) against the stages checklist for baby-home timers, day-roll attaches, focus/visibility listeners, breast elapsed child, pending store, and quick-care lock.

**Timers / listeners / cleanup**
- `BabyBreastElapsedText`: `setInterval(1s)` + `visibilitychange`/`focus`; cleanup clears interval and both listeners. Mounted only while `breast` is set; unmount stops the tick.
- `BabyHomeContent` clock: `setInterval(30s)` + same wake pair; cleaned on unmount / when `nowMs` is injected.
- `attachBabyLocalDayRoll`: one midnight `setTimeout`, re-armed after each roll/wake; dispose clears timeout and removes visibility + focus. `BabyHome` effect returns that dispose (`[]` deps). Content no longer owns a day scheduler.
- Wake paths call `roll()` which `clearTimeout` then re-arms — no stacked timers.

**Stores / retained state**
- Breast timer + pending: single localStorage keys, one record each; fail-closed write/read-back; clear removes design + legacy pending keys. No in-memory list or module-level cache.
- Pending age is display-only (`babyQuickPendingView`); no growing client buffer.
- React Query `homeQuick(dayKey)`: one active day key; prior day becomes inactive and is GC’d by default `gcTime` (not unbounded SPA growth).

**Server lock / queries / casts**
- `withBabyCareLock`: `pg_advisory_xact_lock` inside the transaction — released on COMMIT/ROLLBACK; no process-held lock map.
- Home status: `LIMIT 1` last-of-type ×3, open sleep, `count(*)` for feeds — no full result-set retention.
- `count(*)::int` only (feed counts); no money/`SUM`→int4 casts in this pass.
- Notify batch: one `getLink` per mutation; fire-and-forget with Telegram send timeout — no module-level link cache.

**FYI (do not block):** `baby_quick_care_request` grows without prune by design (~11k rows/year busy family); 90-day DELETE is a documented follow-up (also Security FYI). Not an in-memory leak and not in scope for this pass.
