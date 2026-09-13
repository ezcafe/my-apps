# Review log: baby-home-controls-polish

## Adversarial test review

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `features/baby/server/quick-care.test.ts` (bad session id matrix) | **Bad-id matrix incomplete.** Task 4 / Checkpoint A require stable error (no insert) for missing / wrong type / wrong workspace / wrong baby. Only missing UUID → `NOT_FOUND` is covered. No negative cases for a diaper/sleep id, a feed owned by another `babyId`, or a foreign workspace id. Production checks type + babyId (`quick-care.ts`); those branches are untested failure modes for Option B’s “no silent hijack” rule. | fixed (re-verified) |
| Major | `lib/baby-feed-session.test.ts` vs `features/baby/server/quick-care.ts` | **Post-stop skew never hits `runBabyQuickCare`.** Pure helper covers `clientStillInGrace` + 5.5 min / rejects 7 min, but quick-care never passes `clientStillInGrace` and no unit asserts merge at 5–6 min on the server path. Design (`03-design.md` split mergeability / skew ≤6) can regress to hard 5 min insert without a failing test. | fixed (re-verified) |
| Major | `e2e/baby-home-option-b.spec.ts` (L→R→bottle) | **Mock theater on `feedsToday` stays 1.** Mock sets `feedsToday = 1` once and never increments; UI `/1\//` only proves the factory. Real value is client `feedSessionEventId` wiring. Task 11 acceptance (“feedsToday does not bump per side”) is not exercised against real merge behavior here (server merge count lives in unit mocks only). | fixed (re-verified) |
| Enhancement | `features/baby/server/quick-care.test.ts` (shape replay) | **Replay does not assert `wrote`.** Shape replay compares step names only. Task 4 acceptance: stored/replayed steps include `wrote`. A drop of `wrote` on store/replay would not fail this suite (notify uses `replayed`, but client adopt keys off `wrote`). | fixed (re-verified) |
| Enhancement | `features/baby/server/timeline.test.ts` (combined legs) | **Combined legs summary EN-only.** Task 6 requires VI equivalent strings; legs join is asserted for `en` only, not `vi`. | fixed (re-verified) |
| Enhancement | `features/baby/server/quick-care.test.ts` (leftover id) | **Non-feed leftover id: diaper only.** Design / Task 4 also require sleep to ignore leftover `feedSessionEventId` (no load/merge). Sleep twin missing. | fixed (re-verified) |
| Enhancement | `components/baby-home.test.ts` (row 2 height) | **Row 2 nap `h-full` still not uniquely asserted.** Bottle and Kind are pinned via `data-layout` + `h-full`. The nap check is only `/flex h-full min-h-20 flex-col/`, which also matches the bottle card class string — removing nap’s outer `h-full` would not fail. Task 9 still wants three outer wrappers covered. | fixed (re-verified) |
| Enhancement | `lib/graphql/baby-yoga.test.ts` (quick-care smoke) | **No `feedSessionEventId` yoga smoke.** Suite covers `wrote` + notify wiring with a mocked `run`, but never sends optional `feedSessionEventId` through GraphQL input parse. | fixed (re-verified) |
| Enhancement | `e2e/baby-home-option-b.spec.ts` (merge timing) | **Flaky timing.** New merge e2e uses `waitForTimeout(1_100)` twice instead of waiting on a deterministic saved/status signal only. | fixed (re-verified) |
| Nit | `features/baby/server/home-quick-status.test.ts` | Source scrape for `updatedAt` SQL choice; behavioral coverage already exists nearby. Prefer keep behavior test, drop or shrink scrape. | open |

**Round notes:**

- **Covered well (do not re-litigate):** open vs post-stop merge + 6h max (`baby-feed-session.test.ts`, `quick-care.test.ts` open-cont / past-6h / grace-expired); 2A omit-id and sticky past-6h + `breastRunning`+`FORMULA` one new row; adopt-on-insert (`baby-quick-care-plan.test.ts`); `wrote` insert|update notify kinds; EN+VI combined `careSummary`; Kind/bottle flush + `fx-ripple` class contracts; skeleton parity; bad-id matrix; server skew 5.5 min merge; sleep leftover-id twin; yoga `feedSessionEventId`; e2e insert-only `feedsToday` bump + saved-status waits; row-2 bottle / nap / Kind unique `data-layout` + `h-full` pins.
- **Fix note (adversarial-tests):** Bad-id matrix now covers missing / diaper / sleep / wrong baby / foreign workspace (no insert). `runBabyQuickCare` passes `clientStillInGrace: true` when an owned session id is loaded; unit asserts merge at 5.5 min. E2e bumps `feedsToday` only on `wrote: "insert"` and asserts count stays 1 after R + bottle; waits on timer + saved status (short clock wait remains only for durationSec ≥1). Replay asserts `wrote`; sleep leftover-id twin; VI legs summary; yoga smoke passes `feedSessionEventId`.
- **Fix note (nap row-2 `h-full`):** Layout contract now pins nap via `data-layout="home-nap"` + `h-full` (same pattern as bottle / Kind). Dropping nap’s outer `h-full` fails the unique assert; bottle’s matching class string no longer masks it.
- **Re-verify (after nap `h-full` Fix):** Confirmed unique nap assert in `baby-home.test.ts` (`data-layout="home-nap"` ↔ `h-full`) and matching markup in `baby-home.tsx`. No new Critical / Major / Enhancement. Nit (status SQL scrape) still open; nits do not block. **Adversarial test review: clean.**

---

## Quality

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `lib/baby-quick-care-plan.ts` (`adoptFeedSessionAfterQuickCare`) + `components/baby-home.tsx` | **Grace not cleared when breast starts again.** Store contract / Task 3: `graceEndsAtMs` is **null** while breast is running (open continuation); set only on stop. `adoptFeedSessionAfterQuickCare` returns `previous` unchanged when there are **no feed steps** (timer-only BREAST start after stop or mid-session bottle). Grace deadline from the prior stop stays set. If the caregiver nurses past that deadline, `parseBabyFeedSessionHandle` drops the id → next save **INSERTs** a second feed. Breaks open continuation for stop → restart / bottle → restart paths (L→R switch while still running is fine because that path has a feed step and sets grace null). | fixed (re-verified) |
| Enhancement | `components/baby-home.tsx` (~982 lines) | **Home file keeps growing.** Session store + adopt + Custom cluster wired in-place with no extraction. Harder to review and easy to miss store invariants (see Major above). Prefer a small home feed-session hook/helper for read/write/adopt. | fixed (re-verified) |
| Enhancement | `lib/graphql/baby-resolvers.ts` vs `lib/baby-quick-care-notify.ts` | **Notify filter duplicated.** Resolver hand-rolls `wrote === "insert"` for feed steps with a comment to “match” `babyQuickCareNotifyKinds`, but does not call the helper. Drift risk if either side changes (e.g. legacy missing `wrote`). | fixed (re-verified) |
| Enhancement | `lib/baby-feed-session.ts` + `db/schema/baby.ts` | **Duplicate `BabyFeedLeg` / method unions.** Same shape defined in two places; schema and pure helper can diverge. Prefer one shared type (schema or lib) and import. | fixed (re-verified) |
| Enhancement | `components/baby-home.tsx` Custom control | **Custom segment never primary-selected.** Gate 1 **4B** / Kind+breast use accent primary when active. Custom button stays `bg-surface` even when `formulaFromCustom` / custom ml is the active value — weaker “what is selected” cue than Kind Done / running breast. | fixed (re-verified) |
| Nit | `components/baby-quick-value-card.tsx` | **`underCard` still supported** though home only passes `customControl`. Dead path; fine to delete in a follow-up or leave until no callers. | open |
| Nit | `features/baby/server/home-quick-status.test.ts` | Left from adversarial: source scrape for `updatedAt` SQL vs behavior tests nearby. Prefer keep behavior, drop/shrink scrape. | open |

**Round notes:**

- **Context:** Quality review of Option B feed-session merge + Kind/bottle UI polish vs `01-idea` / `03-design` / `04-tasks`. Focused on `baby-feed-session*`, quick-care, timeline, home-quick-status, baby-home, kind control, quick-value-card, skeleton, `fx-ripple`, validators, graphql.
- **Correctness:** Server merge matrix, 2A one-row insert, bad-id errors, `wrote` + notify-on-insert, legs roll-up, `occurred_at` keep / `updated_at` bump, status count vs activity time, flush Kind/bottle + skeleton/`fx-ripple` look aligned with design. **One Major client store gap** (grace on breast restart).
- **Architecture / readability:** Helpers are clear; duplication of notify filter + `BabyFeedLeg` types; `baby-home.tsx` size.
- **Security / performance (light touch for this lens):** Workspace-scoped load-by-id, Zod uuid + legs cap, no new motion deps — no Critical. No N+1 / unbounded fetch found in touched paths.
- **Verdict:** Request changes (1 Major). Not clean.
- **Fix note (Quality):** Timer-only breast restart now clears `graceEndsAtMs` in `adoptFeedSessionAfterQuickCare` when `startBreastSide` is set and there are no feed steps (keeps session id for open continuation). Home read/write/adopt moved to `lib/baby-home-feed-session.ts`. Resolver notify loop uses `babyQuickCareNotifyKinds` per step. `BabyFeedLeg` / method live in `lib/baby-feed-session.ts`; schema imports and re-exports. Custom droplet uses primary fill + `data-selected` / `aria-pressed` when active. Nits left open (optional).
- **Re-verify after Fix (Quality):** All 1 Major + 4 Enhancement closed.
  - **Grace on breast restart:** Confirmed — empty feed steps + `startBreastSide` clears `graceEndsAtMs` while keeping `eventId` (`baby-quick-care-plan.ts` + unit; `baby-home-feed-session` adopt/persist twin). Home wires adopt after every confirmed quick-care.
  - **Home extract:** Confirmed — read/write/adopt live in `lib/baby-home-feed-session.ts`; home imports helpers (no in-place store logic).
  - **Notify filter:** Confirmed — resolver loops steps through `babyQuickCareNotifyKinds` (no hand-rolled `wrote === "insert"`).
  - **Shared `BabyFeedLeg`:** Confirmed — type owned by `lib/baby-feed-session.ts`; schema imports + re-exports; schema test pins shared type.
  - **Custom primary selected:** Confirmed — active Custom uses `bg-accent text-accent-foreground` + `data-selected` / `aria-pressed`; home test asserts contract.
- **Quality review: clean.** Nits (`underCard` dead path; status SQL scrape) remain open; non-blocking.

---

## Security

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | clean |

**OWASP coverage (A01–A10):**

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 Broken Access Control | **pass** | `findCareEventById` / `updateCareEvent` always scope by `workspaceId`; bad id / wrong type / wrong `babyId` → `NOT_FOUND` (no insert, no latest-feed hijack). Unit matrix covers missing / diaper / sleep / wrong baby / foreign workspace. |
| A02 Cryptographic Failures | **N/A** | No new secrets, tokens, or crypto; care payloads stay family PII at rest as today. |
| A03 Injection | **pass** | Drizzle parameterized load/update; Zod uuid on `feedSessionEventId`; `legs` array max 8; timeline summary is plain text (React escape). |
| A04 Insecure Design | **pass** | Option B fail matrix in `writeFeedLegs` + `isFeedSessionMergeable` (open ≤6h / post-stop 5 min + ≤6 skew / past window → INSERT); localStorage id/grace is hint only; server re-checks ownership + age. |
| A05 Security Misconfiguration | **N/A** | No CORS, header, or debug-surface changes. |
| A06 Vulnerable Components | **pass** | `fx-ripple` CSS-only; no new motion/npm dependency. |
| A07 Auth Failures | **N/A** | Reuses existing workspace session + write gate; no new login. |
| A08 Software / Data Integrity | **pass** | Idempotent `clientRequestId` replay still workspace-scoped; merge updates stored as replay result with `wrote`. |
| A09 Logging / Monitoring Failures | **pass** | New feed-session / quick-care helpers do not log secrets or full PII dumps. |
| A10 SSRF | **N/A** | No user-controlled server fetch URLs. |

Source: https://owasp.org/Top10/

**Round notes:**

- **Method:** Security-review subagent could not run (usage limit ×2). Manual review of uncommitted Option B paths vs `03-design.md` Security / OWASP + OWASP Top 10.
- **Focus checked:** `feedSessionEventId` authz (workspace + baby + type); fail matrix (omit → insert, bad id → error, owned past open/grace → insert); legs Zod/cap + `mergeFeedLegs`; client localStorage (`baby-feed-session-store` / `baby-home-feed-session`) never trusted alone for merge.
- **Design↔code:** Matches design OWASP table. `clientStillInGrace: true` when an owned id is loaded matches design (“client only sends id while still in grace”); server still enforces `updatedAt` windows. Non-feed leftover id ignored. No gaps that raise Critical/Major/Enhancement.
- **Security review: clean.**

---

## Performance

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | clean |

**Result:** Round 1 — clean. **Performance review: clean.**

**Round notes:**

- Round 1 (2026-09-13) — Senior Verifier Performance lens vs `performance-optimization` + `vercel-react-best-practices` (UI changed). Draft only — no Fix this round.
- **Scope:** Option B feed-session merge (`feedSessionEventId` / legs / `wrote`) + Kind/bottle/Custom chrome (`baby-home`, kind control, quick-value, custom modal, diaper sheet, `fx-ripple`, skeleton).

**What looks good**

- **No N+1 / unbounded fetch:** Merge is point-load by workspace-scoped id (`findCareEventById` + `LIMIT 1`), not “latest feed” scan. Legs capped ≤8. Home status still profile → `Promise.all` of last-of-type ×3 + open sleep + `count(*)` + weight (`LIMIT 1` / aggregate). Timeline keyset + limit unchanged.
- **No client waterfall:** Single `useQuery` for `homeQuick`; localStorage session/timer reads are sync. Care invalidate stays timeline/`homeQuick` prefix (no profile / sync / telegram on every press).
- **Hot-path UI:** Parent clock stays **≥30s**; breast elapsed isolated in `BabyBreastElapsedText` (1 Hz). Day roll still owned by `BabyHome` (`attachBabyLocalDayRoll`). `fx-ripple` is CSS-only + `prefers-reduced-motion`.
- **Bundle:** Merge helpers are small pure `lib/` modules; Custom ml / diaper sheet are light (not chart-sized). No new vendor/motion deps — same call as logging-detail: dynamic import not warranted.
- **2A under lock:** Same-request breast→formula reuses in-memory `sessionFeed` (no second id load). Extra insert-then-update is design-allowed for step `wrote` / notify; family-scale lock hold is fine without measured evidence.

**Checked / not findings**

- Feed last-of-type now `ORDER BY updated_at` (merge bumps activity). Index shape still `(baby_id, type)` only — redesign already deferred a covering index at family scale; not re-filed (same pattern as logging-detail).
- Sequential steps inside `withBabyCareLock` (stored → profile → write → open sleep → action) are order-dependent, not an avoidable independent waterfall.
- Static modal/sheet imports on home — small; no `bundle-dynamic-imports` finding.

---

## Memory

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| — | — | No Critical / Major / Enhancement findings. | clean |

**Result:** Round 1 — clean. **Memory review: clean.**

**Round notes:**

- Round 1 (2026-09-13) — Senior Verifier Memory lens vs stages checklist. Draft only — no Fix this round.
- **Scope:** Option B feed-session store + Kind/bottle chrome; breast timer, Done flash, home effects, quick-care pending, `fx-ripple`.

**Timers / listeners / cleanup**

- **Done / Logged flash:** `createBabyHomeDoneFlashTimer` — clear-before-rearm + generation guard; home keeps bottle + diaper refs; effect cleanup calls both `.dispose()` on unmount. No stacked timeouts; no setState after leave from the flash path.
- **Breast elapsed:** `BabyBreastElapsedText` mounts only while `breast` is set; `setInterval(1s)` + `visibilitychange` / `focus`; cleanup clears all three.
- **Home clock:** `setInterval(30s)` + same wake pair; cleaned on unmount / when `nowMs` injected.
- **Day roll:** `attachBabyLocalDayRoll` dispose clears midnight timeout and removes wake listeners; `BabyHome` effect returns that dispose.
- **`fx-ripple`:** CSS-only (`::after` animation + `prefers-reduced-motion`); **no JS timers**.
- Modal `cancel` listener removed on effect cleanup (unchanged).

**Stores / retained state**

- **Feed session:** one localStorage key (`baby.feedSession.v1`); parse drops wrong baby / expired grace; write/remove only — no in-memory list or module-level cache.
- **Breast timer:** one localStorage key; stale flag does not grow state.
- **Quick-care pending:** one record (design + legacy migrate/clear); age is view-only (`babyQuickPendingView`); no retry buffer growth; no auto-retry on mount.
- **`mergeFeedLegs`:** ephemeral `Map` per call, capped ≤8 — not retained across requests.
- **Care lock:** `pg_advisory_xact_lock` inside the transaction; released on COMMIT/ROLLBACK — no process-held lock map.

**Queries / casts**

- Home status still point loads + `count(*)::int` for feeds only — no money / `SUM`→int4 casts in this pass.
- No whole timeline / result-set retention introduced for merge (load-by-id).

**FYI (do not block)**

- `scheduleBabyHomeDoneClear` remains exported for tests only; production uses `createBabyHomeDoneFlashTimer`. Dead unsafe helper is not a live leak.
- `runQuick` async success/error/`finally` can still `setState` if the user leaves mid-mutation (pre-existing redesign pattern).
- `baby_quick_care_request` table growth without prune remains a documented follow-up (disk, not in-memory).
