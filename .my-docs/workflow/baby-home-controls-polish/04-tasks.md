# Tasks: Baby home controls polish + feed-session merge

**Assumes Chosen design = Option B** (explicit `feedSessionEventId` + 5 min grace + `legs[]` payload). If Gate 2 picks Option A, retask server merge lookup and drop client session-id tasks.

**TDD order:** pure helpers → validators/schema → quick-care merge → summary/status/notify → UI chrome → skeleton → e2e.

---

## Task 1: Feed session pure helpers

**Description:** Add `lib/baby-feed-session.ts` with grace (5 min), **max open window (6h)**, **split** mergeability (open breast vs post-stop), leg merge (one per method), and roll-up (`method` = last non-pump leg; `durationSec` sum; `amountMl` from formula).

**Acceptance:**

- [x] `graceEndsAt(stoppedAt)` = stoppedAt + 5 minutes
- [x] **Open continuation:** `feedSessionEventId` present **and** `breastRunning` **and** `updatedAt` within **6h** (`BABY_BREAST_TIMER_STALE_MS`) → mergeable with **no** 5‑min post-stop grace
- [x] Open continuation with `updatedAt` **past** 6h → **not** mergeable (treat like post-stop expired → insert path)
- [x] **Post-stop add-on:** no `breastRunning` → mergeable only while `updatedAt` within 5 min (skew helper may use 6 min when client still in grace)
- [x] After post-stop grace → not mergeable (3A)
- [x] `mergeFeedLegs`: **one leg per method**; sum `durationSec` / sum `amountMl` into existing method (L→R→L accumulates L; two formula top-ups sum ml)
- [x] Zero-duration / empty formula legs omitted from summary part list helper

**Tests (TDD — what turns red first):**

- [x] Unit: open + `breastRunning` still mergeable when `updatedAt` is **>5 min** but **<6h** old
- [x] Unit: open + `breastRunning` with `updatedAt` **past 6h** → not mergeable
- [x] Unit: post-stop in grace / expired (no `breastRunning`)
- [x] Unit: L then R then formula → rolled payload + primary `method: "formula"`
- [x] Unit: same-method re-merge accumulates; leg count stays ≤ methods used
- [x] Unit: omit empty legs from summary parts

**Files likely touched:** `lib/baby-feed-session.ts`, `lib/baby-feed-session.test.ts`

**Scope:** S

**Dependencies:** none

---

## Task 2: Extend `BabyFeedPayload` + Zod

**Description:** Add optional `legs[]` to schema type and create/update feed Zod schemas (cap legs length). Legacy single-method payloads still parse.

**Acceptance:**

- [x] Type + Zod accept `legs` with method + optional durationSec/amountMl
- [x] Legacy `{ method, durationSec }` still valid
- [x] Reject oversized legs array / invalid methods

**Tests (TDD — what turns red first):**

- [x] `createBabyFeedSchema` / `updateBabyEventFeedPayloadSchema` unit cases for legs + legacy

**Files likely touched:** `db/schema/baby.ts`, `lib/validators/baby.ts`, `lib/validators/baby.test.ts`, `db/schema/baby.test.ts` if present

**Scope:** S

**Dependencies:** Task 1

---

## Task 3: Client session store (event id + grace)

**Description:** Extend breast timer storage (or sibling key) to hold `sessionEventId` + `graceEndsAtMs` after first physical save; clear on new session / expiry helpers.

**Acceptance:**

- [x] After first feed event id returned, store persists id + grace deadline on stop
- [x] Running switch keeps session id; stop starts grace clock
- [x] Expired grace clears merge handle
- [x] Wrong `babyId` ignored (same spirit as timer parse)

**Tests (TDD — what turns red first):**

- [x] Unit parse/serialize/clear/expiry for session handle

**Files likely touched:** `lib/baby-breast-timer-store.ts` (or new `lib/baby-feed-session-store.ts`) + tests

**Scope:** S

**Dependencies:** Task 1

---

## Task 4: Quick-care insert-then-update merge

**Description:** In `runBabyQuickCare`, when `feedSessionEventId` is present and mergeable under the **split** rules (incl. **6h** max open window), **update** feed payload legs instead of inserting. First write still inserts. Wire GraphQL input field + step `wrote`.

**Acceptance:**

- [x] Optional `feedSessionEventId` on quick-care input; each care step returns `wrote: "insert" | "update"`
- [x] **Ignore** `feedSessionEventId` unless this request writes/merges a **feed** (`breastRunning` and/or `FORMULA` / breast feed steps); diaper / sleep leftover id does not load/merge a feed
- [x] First breast/formula save without id → INSERT + return id + `wrote: "insert"`
- [x] **2A on every insert:** `breastRunning` + `FORMULA` → **one** physical row with both legs (one INSERT or insert+update same id under one lock); **one** `wrote: "insert"`; **one** notify — applies when id is **omitted** **and** when an owned id is **not mergeable** (past 6h open window or post-stop grace expired). Non-mergeable id is not an update target.
- [x] Later save with valid id + `breastRunning` + `updatedAt` within **6h** → UPDATE even if `updatedAt` older than 5 min
- [x] Owned id + `breastRunning` + `updatedAt` **past 6h** → **INSERT** new feed (do not update old row); with `FORMULA` in the same request → still **one** new row (2A), old row unchanged
- [x] Later save with valid id, no `breastRunning`, within post-stop grace → UPDATE same id
- [x] Owned id + no `breastRunning` + post-stop grace expired → **INSERT** new feed (do not update old row)
- [x] Provided id missing / wrong type / wrong workspace / wrong baby → **stable error** (no silent latest-feed hijack; **no** insert)
- [x] Id omitted → INSERT (not error)
- [x] Merge keeps `occurred_at`; bumps `updated_at`
- [x] Replay via `clientRequestId` unchanged (stored steps include `wrote`)
- [x] Legs roll-up written on every merge

**Tests (TDD — what turns red first):**

- [x] Unit/db: L save → R merge → formula merge → single row, `feedsToday`-style count +1 once
- [x] Unit/db: **failing first** — `breastRunning`+`FORMULA` no id → assert **one** row (not two)
- [x] Unit/db: **failing first** — sticky/non-mergeable owned id (past **6h** open window **or** post-stop grace expired) + `breastRunning` + `FORMULA` → **one** new INSERT row with both legs (not two); old row unchanged; response `wrote: "insert"` (client adopt path still uses new id)
- [x] Unit: open continuation merge with stale `updatedAt` (>5 min, <6h) still updates
- [x] Unit: open continuation past **6h** → insert (old row unchanged)
- [x] Unit: diaper/sleep with leftover `feedSessionEventId` → ignore id (no feed load/merge by that id)
- [x] Unit: bad-id error matrix; expired post-stop → insert
- [x] GraphQL yoga smoke if existing suite covers input/`wrote` fields

**Files likely touched:** `features/baby/server/quick-care.ts`, `quick-care.test.ts`, `quick-care.db.test.ts`, `lib/validators/baby.ts` (quick-care schema), `lib/graphql/baby-typeDefs.ts`, `baby-resolvers.ts`, `db/schema` stored result types if needed

**Scope:** M

**Dependencies:** Task 1, Task 2

---

## Task 5: Planner + home wiring for session id

**Description:** `planBabyQuickCare` / home presses pass `feedSessionEventId` when store says mergeable; on success update store; after stop set grace; bottle mid-breast and in-grace use same id (2A). **Adopt** response id whenever the server inserts under a sticky/expired request id.

**Acceptance:**

- [x] L→R→bottle within open/grace sends same session id after first save
- [x] After grace expired, bottle/breast omit id → new feed
- [x] On every success: if `wrote: "insert"` **or** response `event.id` ≠ requested `feedSessionEventId`, store **replaces** with the new id (never keep the request id after an insert outcome)
- [x] `localAfter` still clears/starts timer correctly

**Tests (TDD — what turns red first):**

- [x] Unit planner: with/without session id
- [x] Unit: sent expired/sticky id → server insert → store **adopts** new response id (does not keep old handle)
- [x] Component/unit home press contracts where already tested

**Files likely touched:** `lib/baby-quick-care-plan.ts`, `lib/baby-quick-care-plan.test.ts`, `components/baby-home.tsx`, `components/baby-home.test.ts`

**Scope:** M

**Dependencies:** Task 3, Task 4

---

## Task 6: Combined `careSummary` + status + next-due + notify

**Description:** Summaries use legs join (EN/VI); `feedsToday` stays COUNT(*) on `occurred_at`; last-feed / next-due activity uses **`updated_at`**; primary method from legs; Telegram notifies only when step `wrote === "insert"`.

**Acceptance:**

- [x] EN: `Feed (Breast L + Breast R + Formula 90 ml)` (or existing Feed prefix pattern)
- [x] VI equivalent strings in messages
- [x] Skip empty legs
- [x] Legacy single-method summary unchanged
- [x] Last feed / next-due “when last finished” reads **`updated_at`** after merges; day-window count still **`occurred_at`**
- [x] Notify helper: feed kind only if `wrote === "insert"` (updates with `saveBreast`/`createFormula` names stay silent)

**Tests (TDD — what turns red first):**

- [x] `careSummary` unit for legs + legacy
- [x] `home-quick-status` / next-due unit: merge bumps activity time via `updated_at` without changing day bucket `occurred_at`
- [x] `baby-quick-care-notify` unit: `wrote:"insert"` notifies; `wrote:"update"` does not (even if step name is saveBreast/createFormula)

**Files likely touched:** `features/baby/server/timeline.ts`, `timeline.test.ts`, `messages/baby/en.ts`, `messages/baby/vi.ts`, `lib/baby-next-due.ts`, `lib/baby-quick-care-notify.ts`, notify tests, `home-quick-status` (+ tests)

**Scope:** M

**Dependencies:** Task 2, Task 4

---

## Checkpoint A (after Tasks 1–6)

- [x] Focused unit/db tests for merge + summary pass
- [x] Manual or test: one session → one row → combined summary
- [x] **2A:** mid-breast bottle insert → one row (omit id **and** sticky/non-mergeable id + `breastRunning` + `FORMULA`)
- [x] **Open continuation:** long breast (`updatedAt` >5 min, **<6h**) + `breastRunning` still merges
- [x] **Max open window:** `breastRunning` + id with `updatedAt` **past 6h** → insert; with `FORMULA` → still **one** new row (not two)
- [x] **Fail matrix:** omit → insert; bad id → error (no insert); post-stop expired → insert; past open window → insert
- [x] **Adopt-on-insert:** sticky expired / past-6h id sent → insert → store keeps new id only (and 2A one-row still holds when `FORMULA` is in that request)
- [x] **Non-feed id:** diaper/sleep ignores leftover `feedSessionEventId`
- [x] Notify: insert once; update silent via `wrote`
- [x] Security: bad session id cannot update another workspace’s event

---

## Task 7: Kind flush segmented + primary selected + ripple

**Description:** Collapse Kind gaps/padding into flush 2×2 with shared borders; selected = primary; add `fx-ripple` per design motion contract (CSS-only, reduced-motion safe) on press.

**Acceptance:**

- [x] No gap between/around Kind tiles; one border between segments
- [x] Selected uses primary button treatment (light + dark)
- [x] `fx-ripple`: ~400ms burst, ~0.22 peak opacity, listed transition/animation properties only; layers with `fx-press`
- [x] Ripple disabled under `prefers-reduced-motion: reduce`; `fx-press` follows existing globals gate
- [x] Hit targets ≥44×44; no overlapping extended hit areas

**Tests (TDD — what turns red first):**

- [x] Unit class/contract tests on Kind control (gap-0 / selected classes / `fx-ripple` present)
- [x] Optional: globals class presence + reduced-motion rule if project patterns allow

**Files likely touched:** `components/baby-diaper-kind-control.tsx`, `*.test.ts`, `app/globals.css`

**Scope:** M

**Dependencies:** none (can parallel after Checkpoint A or earlier in parallel with Tasks 1–3)

---

## Task 8: Bottle cluster — Custom icon under ±

**Description:** Move Custom into B1 cluster as icon-only droplet under ±; flush borders; remove under-card text; aria-label EN/VI; keep confirm-sets-ml modal.

**Acceptance:**

- [x] Face / ± / Custom = three segments, one column cluster, gap-0, shared borders
- [x] Droplet/ml icon in `icon-baby-nav` (or icons) with `aria-label`
- [x] Modal behavior unchanged (confirm sets ml, no auto-save)

**Tests (TDD — what turns red first):**

- [x] `baby-quick-value-card` / home tests: Custom inside cluster, not under-card text

**Files likely touched:** `components/baby-quick-value-card.tsx`, `baby-home.tsx`, `components/icons/icon-baby-nav.tsx`, tests, messages if aria strings live there

**Scope:** M

**Dependencies:** Task 7 for shared ripple/primary patterns preferred but not hard-required

---

## Task 9: Row 2 equal height + breast primary selected

**Description:** Ensure bottle / nap / Kind outer heights match via **`items-stretch` + children `h-full` / flex column fill**; breast active side primary fill + ripple; keep IconSwap for running.

**Acceptance:**

- [x] Row 2 uses stretch grid/flex; three outer blocks `h-full` so bottle cluster height drives nap/Kind
- [x] Layout contract test asserts equal outer heights (or equal stretch/`h-full` classes on the three wrappers)
- [x] Running/selected breast reads as primary + `fx-ripple`

**Tests (TDD — what turns red first):**

- [x] Unit/layout contract: row stretch + three children `h-full` (or measured equal height where feasible); extend home tests

**Files likely touched:** `components/baby-home.tsx`, breast card classes, tests

**Scope:** S

**Dependencies:** Task 8

---

## Task 10: Skeleton parity

**Description:** Update `BabyHomeSkeleton` to mirror flush Kind + three-segment bottle cluster and row 2 heights.

**Acceptance:**

- [x] Skeleton element order/grid/radii match live UI (zero CLS)

**Tests (TDD — what turns red first):**

- [x] `baby-page-skeleton.test.ts` structure assertions updated

**Files likely touched:** `components/baby-page-skeleton.tsx`, `baby-page-skeleton.test.ts`

**Scope:** S

**Dependencies:** Task 7, Task 8, Task 9

---

## Task 11: E2E — merge count + chrome

**Description:** Update/add Playwright coverage: L→R→bottle stays **1** today with combined summary; Custom icon path; Kind/bottle flush not required pixel-perfect but selectors/contracts updated.

**Acceptance:**

- [x] e2e asserts feedsToday does not bump per side within one session
- [x] Custom is icon control (not under-card text link)
- [x] Existing option-b flows still pass (nap lock, Wet/Dry, etc.)

**Tests (TDD — what turns red first):**

- [x] Fail e2e that still expect 3 feeds / under-card Custom; then fix app or rewrite asserts per design

**Files likely touched:** `e2e/baby-home-option-b.spec.ts`, helpers, possibly `e2e/baby-care.spec.ts`

**Scope:** M

**Dependencies:** Task 5, Task 6, Task 8, Task 10

---

## Checkpoint B (after Tasks 7–11)

- [x] Focused unit + e2e pass
- [x] Light/dark manual glance: primary selected + ripple
- [x] Skeleton matches live
- [x] OWASP A01 check still holds for session id updates

---

## Checkpoints (summary)

After every 2–3 tasks:

- [x] Focused tests pass
- [x] Slice works end-to-end where applicable

**Security checks (Build):**

- [x] Workspace-scoped event update only
- [x] No new dependencies for motion
- [x] Zod caps on legs

**UI checks (Build):**

- [x] DESIGN_GUIDE tokens / concentric radii / ≥44 hits / reduced motion
- [x] Skeleton parity
- [x] EN + VI aria-labels for Custom
)
