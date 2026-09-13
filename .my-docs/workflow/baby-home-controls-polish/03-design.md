# Design: Baby home controls polish + feed-session merge

**Scope:** Polish Kind + bottle chrome on Option B home, and merge left/right/bottle into **one physical feed row** per session (Gate 1: 1A+grace, 2A, 3A, 4B, 5B, 6A, 7B).

**Do not reopen:** nap lock, Custom ml confirm-then-save, Wet/Dry Done flash, Poop/Mixed sheet, Kind 2×2 vs 1×4, prior Gate 3 pauses.

**No new ADR:** still one `baby_care_event` row type `feed` with jsonb payload; not a new table or auth model.

---

## Settled Design picks (Gate 1 left these to Design)

| Topic | Pick | Why |
|-------|------|-----|
| **Grace minutes** | **5 minutes** after breast **stop** (timer no longer running) | Long enough for a night top-up bottle without rushing; short enough that a later separate feed stays a new row. 1–2 min is too tight one-handed; 15+ min over-merges. |
| **Max open-session window** | **6 hours** on last touch `updatedAt` (same as `BABY_BREAST_TIMER_STALE_MS`) | Caps stale / replayed own-workspace ids so open continuation cannot bypass Gate 1 **3A** hours later. Inside the window, long L→R still has **no** 5‑min grace. |
| **Server mergeability (split)** | **(1) Open breast continuation:** request has `feedSessionEventId` **and** `breastRunning` **and** `updatedAt` within **6h** → allow merge with **no** 5‑min post-stop grace. Past 6h → **INSERT** new feed (same as post-stop expired). **(2) Post-stop add-on:** no running breast (typical bottle after stop) → require last touch `updatedAt` ≤ **5 min** (+ skew: accept if client still in grace and server delta ≤ **6 min**) | Gate 1 **1A** must not refuse a long open session **inside** the max window; grace only gates the short after-stop window (**3A**). |
| **Grace clock (client)** | Client stores `graceEndsAtMs` after stop; omits `feedSessionEventId` when grace expired. On every success: if `wrote: "insert"` **or** response `event.id` ≠ requested `feedSessionEventId`, **replace** store with the new id (or clear then set). Never keep the request id after an insert outcome. | Client drives UX; server never trusts client grace alone for post-stop merges; sticky expired ids must not stay as merge handles. |
| **First physical row (2A on every insert)** | Created on **first stop / side-switch / bottle** that needs a write. Under lock, whenever this request **inserts** a new feed with **`breastRunning` + `FORMULA`** — omit id **or** owned id that is **not mergeable** (past 6h open window / post-stop grace expired) → **one INSERT** with both legs (or insert-then-update same id in the same lock). Still **one** row / **one** `wrote: "insert"` / **one** notify. Non-mergeable id is **not** an update target; treat like omit-id for 2A. Bad id (missing / wrong type / wrong workspace / wrong baby) stays **error** (no insert). | Idle breast start stays timer-only; Gate 1 **2A** mid-breast bottle must not create two rows on any first-write insert path, including sticky expired ids. |
| **Later legs** | **Update** that same event under `withBabyCareLock` | Honors 7B; keeps `feedsToday` = COUNT(*) honest. |
| **Same-method legs** | **One leg per method**; accumulate `durationSec` (sum) and formula `amountMl` (sum) into that method’s leg | Caps `legs` ≤ 8 without L→R→L exploding rows; top-ups stay one formula leg. |
| **Payload** | Keep top-level `method` + optional `durationSec` / `amountMl` for **compat**; add optional **`legs[]`** for multi-part sessions | Old single-method rows keep working (6A). New merged sessions write legs + rolled-up top-level fields. |
| **Primary `method` (next-due)** | **Last non-pump leg** in `legs` order | Matches “what just finished” for interval bands. |
| **Rolled-up fields** | `durationSec` = sum of breast leg durations; `amountMl` = formula leg ml (if any) | Status / last-ml / older readers still work. |
| **Time fields on merge** | Keep original **`occurred_at`** (session start / day bucket). Bump **`updated_at`** on every merge. Last-feed activity + next-due “when feeding last finished” read **`updated_at`** | Day count stays honest to session start; next-due does not freeze at first breast save. |
| **Combined summary** | Join **non-empty** legs only: EN e.g. `Breast L + Breast R + Formula 90 ml`; skip zero/`undefined` duration and missing formula ml | Matches idea copy; avoids `Breast L +` noise. |
| **Telegram** | **Notify once** on first **insert** of the session; **silent** on in-session **updates**. Step result carries machine-readable `wrote: "insert" \| "update"` (notify keys off that, not step name alone) | Avoids 3 “feed” pings; merge updates that keep `saveBreast` / `createFormula` names must not notify. |
| **Ripple** | Global utility **`fx-ripple`** in `app/globals.css` (CSS-only); used on Kind + bottle/breast pressables | Reusable; respects `prefers-reduced-motion`. |
| **Running breast chrome** | Active side uses **primary fill** + existing `IconSwap`; ripple on press | Stronger selected state (4B) without dropping the timer cue. |

---

## Option A — Time-window merge (server finds “open” feed)

**What it is:**  
Keep today’s quick-care request shape mostly unchanged. On `saveBreast` / `createFormula`, the server looks up the baby’s **latest feed** in the day window. If that feed was touched within grace (or the client still sends `breastRunning` as a continuation), **update** that row’s `legs` instead of inserting. Client may track grace for UI only; **no required session event id**.

**Example:**

```ts
// Second side stop — no feedSessionEventId
babyQuickCare({
  clientRequestId: "…",
  breastRunning: { side: "breast_l", durationSec: 420 },
  action: { kind: "BREAST", side: "breast_r" }, // start other side locally after
});
// Server: last feed updatedAt within 5 min → UPDATE payload.legs, not INSERT
```

**Pros:**

- Smaller client change (timer store mostly as today).
- No new GraphQL field for session id.
- Works if the client loses localStorage mid-grace but the last feed is still fresh on the server.

**Cons:**

- **Racy:** two caregivers / two devices can collide on “latest feed” and merge the wrong session.
- Harder to prove “this tap belongs to session X” in tests and logs.
- Grace expiry on one device while another still thinks “latest” is mergeable is ambiguous.
- Replay + “was this an update or insert?” is fuzzier without an explicit target id.

---

## Option B — Explicit session handle (client event id + grace) — **Recommended**

**What it is:**  
After the **first** physical feed write in a session, the client stores `{ eventId, graceEndsAtMs }` (extend breast-timer / session local store). Later breast stops, side switches, and bottle saves pass **`feedSessionEventId`** when the client still considers the session mergeable. Server loads that event (workspace-scoped), merges legs under the care lock, and returns the same event.

**Fail / insert matrix (one rule):**

| Client sends | Server outcome |
|--------------|----------------|
| **No** `feedSessionEventId` (omitted, or client grace expired so id cleared) | **INSERT** new feed |
| Id **provided** + not found / wrong type / wrong workspace / wrong baby | **Stable error** (no latest-feed hijack; **no** insert) |
| Id **provided** + owned feed + **`breastRunning`** + `updatedAt` within **6h** open window | **UPDATE** merge — **no** 5‑min post-stop grace |
| Id **provided** + owned feed + **`breastRunning`** + `updatedAt` **past** 6h open window | **INSERT** new feed (3A); do **not** update the old row |
| Id **provided** + owned feed + **no** `breastRunning` + last touch within post-stop grace (≤5 min, skew ≤6) | **UPDATE** merge |
| Id **provided** + owned feed + **no** `breastRunning` + post-stop grace **expired** | **INSERT** new feed (3A); do **not** update the old row |

**2A on insert outcomes:** Any matrix row that ends in **INSERT** and this request has **`breastRunning` + `FORMULA`** still creates **one** physical row with both legs (same as omit-id). Do **not** insert breast then insert formula as two rows when a sticky/non-mergeable id was sent. Bad id stays error only.

**Example:**

```graphql
mutation {
  babyQuickCare(
    input: {
      clientRequestId: "req_feed_002"
      feedSessionEventId: "11111111-1111-1111-1111-111111111111"
      breastRunning: { side: "breast_l", durationSec: 300 }
      action: { kind: FORMULA, amountMl: 90 }
    }
  ) {
    replayed
    steps {
      step
      wrote
      event { id type payload }
    }
  }
}
# Mergeable id → one step wrote:"update"; same id; feedsToday still +0
# Omit id OR non-mergeable owned id + breastRunning+FORMULA → wrote:"insert", one new row, both legs
```

**Pros:**

- Clear ownership of “which row to merge” — safe under lock + replay.
- Matches analysis risk note: prefer explicit session / last-event id.
- Easy unit tests: same id → update; omit / past 6h / post-stop expired → insert; bad id → error.
- Multi-caregiver: wrong or foreign id → **error**, not silent over-merge.

**Cons:**

- Client must persist session id + grace across taps (extend local store).
- Slightly larger API surface (`feedSessionEventId` optional + `wrote` on steps).
- If localStorage is cleared mid-grace, bottle add-on becomes a **new** feed (acceptable under 3A / fail closed).

---

## Tradeoffs

| Factor | Option A | Option B |
|--------|----------|----------|
| Cost / time | Faster client; trickier server edge cases | Slightly more client + one optional field |
| Complexity | Hidden “latest feed” rules | Explicit session state |
| Usability | Same happy path | Same happy path; clearer recovery when store cleared |
| Failure cases | Wrong-row merge risk | Omit/expired → insert; bad id → error; open breast within 6h → merge without 5‑min clock; past 6h → insert |
| Testability | Time mocks + “latest” fixtures | Direct id in / id out |

## Recommendation

**Pick Option B** because Gate 1 demands **one physical row** with trustworthy counts, and analysis already flagged merge-without-id as racy. Explicit `feedSessionEventId` + split open-continuation (≤6h) vs 5-minute post-stop grace keeps night L→R→bottle as **1/8** without inventing a second home mutation.

## Chosen design (user-approved)

**Option B** — Explicit session handle (`feedSessionEventId` + 5 min post-stop grace + 6h max open window + `legs[]` payload). Approved Gate 2 on 2026-09-13.

---

## Sequence diagram

Main path: open breast → mid-breast bottle on first write (one row) → switch side → bottle in post-stop grace → status stays one feed.

```mermaid
sequenceDiagram
  participant UI as BabyHome
  participant Plan as planBabyQuickCare
  participant Store as BreastSessionStore
  participant GQL as babyQuickCare
  participant QC as runBabyQuickCare
  participant Lock as withBabyCareLock
  participant DB as baby_care_event
  participant TG as Telegram notify

  Note over UI,Store: Breast start — timer only, no row
  UI->>Store: start side L
  Store-->>UI: running

  Note over UI,DB: 2A insert — breastRunning + FORMULA (omit id OR non-mergeable owned id) → one INSERT both legs
  UI->>Plan: bottle while L running
  Plan->>GQL: babyQuickCare(breastRunning L, FORMULA 90) no feedSessionEventId
  GQL->>QC: runBabyQuickCare
  QC->>Lock: lock workspace
  Lock->>DB: INSERT feed legs=[L, formula] (one row)
  DB-->>QC: eventId
  QC-->>GQL: steps wrote:insert
  GQL->>TG: notify once (insert only)
  GQL-->>UI: event id
  UI->>Store: sessionEventId + keep/start timer
  Note over UI,DB: Same 2A one-row rule if sticky past-6h / post-stop-expired id was sent (INSERT + adopt; not two rows)

  Note over UI,DB: Open continuation — id + breastRunning + updatedAt within 6h → UPDATE, no 5-min post-stop grace
  UI->>Plan: stop/switch other side
  Plan->>GQL: babyQuickCare(feedSessionEventId, breastRunning, BREAST)
  GQL->>QC: run
  QC->>Lock: lock
  Lock->>DB: UPDATE same id legs merge (occurred_at kept; updated_at bumped)
  DB-->>QC: same event
  QC-->>GQL: steps wrote:update
  Note over TG: silent when wrote:update
  GQL-->>UI: same event id
  UI->>Store: refresh session; on full stop set graceEndsAt

  Note over UI,DB: Post-stop bottle in grace — id + no breastRunning + updatedAt within 5m → UPDATE
  UI->>Store: read sessionEventId, graceEndsAt
  Store-->>UI: in grace
  UI->>GQL: babyQuickCare(feedSessionEventId, FORMULA) no breastRunning
  GQL->>QC: run
  QC->>Lock: lock
  Lock->>DB: UPDATE same id (grace check passes)
  QC-->>GQL: wrote:update
  Note over TG: silent
  GQL-->>UI: same event id

  Note over UI,DB: After stop + grace expired — omit id → INSERT (or sticky old id → INSERT + adopt new id)
  UI->>Store: grace expired (clear id)
  UI->>GQL: babyQuickCare(FORMULA) without session id
  GQL->>QC: run
  QC->>DB: INSERT new feed
  QC-->>GQL: wrote:insert
  GQL->>TG: notify new session
  UI->>Store: adopt response event.id when wrote:insert
```

**Key failures (same matrix as Option B):**

- Id **omitted** (or client cleared after grace) → **INSERT** new feed (3A).
- Id **provided** but not found / wrong type / wrong workspace / wrong baby → **stable error** (do not attach to “latest”; **no** insert).
- Id **provided** + owned feed + open `breastRunning` + `updatedAt` within **6h** → **UPDATE** (no 5‑min post-stop grace).
- Id **provided** + owned feed + open `breastRunning` + `updatedAt` **past** 6h → **INSERT** new feed; leave old row unchanged.
- Id **provided** + owned feed + no running breast + post-stop grace **expired** → **INSERT** new feed; leave old row unchanged.
- **2A on insert:** whenever this request **inserts** with `breastRunning` + `FORMULA` (omit id **or** non-mergeable owned id above) → **one** physical row with both legs, **one** `wrote: "insert"`, **one** notify — never breast-row then formula-row. Bad id stays error only.
- Client success with `wrote: "insert"` (or response id ≠ requested id) → store **adopts** the new id; never keeps the old handle.
- Replay same `clientRequestId` → return stored steps (unchanged).
- Nap lock conflict → existing lock error path.

---

## Contracts

### API contracts

No new GraphQL operation. Extend **`babyQuickCare`** input + step result only.

| Item | Detail |
|------|--------|
| Method + path (or name) | GraphQL `babyQuickCare` (existing) |
| Auth / who can call | Signed-in user with access to the baby workspace (existing) |
| Request fields (additive) | `feedSessionEventId: ID` **optional** — target feed event to merge into when client still has an open/grace session handle. **Ignore** unless this request will write/merge a **feed** (`breastRunning` save and/or `FORMULA` / breast feed steps). Diaper / sleep (or empty breast-start) must not load or merge a feed by leftover id. |
| Existing fields kept | `clientRequestId`, `breastRunning { side, durationSec }`, `action` (BREAST / FORMULA / DIAPER / SLEEP) |
| Success response | `replayed`, `steps { step, wrote, event { id, type, payload, … } }` — **`wrote: "insert" \| "update"`** on each care step (feed and others as applicable). Merge updates return the **same** `event.id` with `wrote: "update"` |
| First-write 2A | Under lock: whenever this request **inserts** a new feed with `breastRunning` + `FORMULA` — **no** id **or** owned id that is **not mergeable** (past 6h open window / post-stop grace expired) → **one** physical row with both legs (single INSERT, or insert+update same id in the same lock); `wrote: "insert"` once; **one** Telegram notify. Non-mergeable id must not be used as an update target. Bad id → **error** (no insert). |
| Server merge checks | Open continuation = id + `breastRunning` + `updatedAt` within **6h** (`BABY_BREAST_TIMER_STALE_MS`) → merge **without** 5‑min post-stop clock. Past 6h open window → **INSERT** (2A one-row rule still applies if this request also has `FORMULA`). Post-stop = id, no `breastRunning` → merge only if `updatedAt` within 5 min (skew ≤6). Past post-stop grace → **INSERT** new feed |
| Client adopt-on-insert | On every success: if any feed step has `wrote: "insert"` **or** response `event.id` ≠ requested `feedSessionEventId`, client session store **must** adopt the new id (drop the old handle). Covers owned id past grace / past 6h open window that still returned a new row. |
| Errors | Validation 422 (bad uuid / bad ml); authz as today; if `feedSessionEventId` **provided** on a **feed** write but event missing, wrong type, wrong baby, or other workspace → **stable error** (do not merge into a different feed). Omit id / client-cleared grace → insert, not error. Non-feed actions ignore the field (no error from leftover id). |
| Downstream calls | Telegram: only when a feed step has **`wrote: "insert"`**; never on `wrote: "update"` |

**Module APIs (pure helpers — new/extended):**

| Helper | Role |
|--------|------|
| `lib/baby-feed-session.ts` (new) | `isFeedSessionMergeable({ hasSessionId, breastRunning, updatedAt, now, graceMs, maxOpenMs })` — open continuation (≤6h, no 5‑min clock) vs post-stop grace vs past-max/expired → not mergeable; `mergeFeedLegs` (one leg per method, sum duration/ml); `rollUpFeedPayload`; `graceEndsAt(stoppedAt, graceMs=5*60*1000)`; default `maxOpenMs = BABY_BREAST_TIMER_STALE_MS` (6h) |
| Extend `lib/baby-breast-timer-store.ts` (or sibling session store) | Persist `{ eventId, graceEndsAtMs }` beside / after timer; **adopt** new `eventId` whenever a success returns `wrote: "insert"` or a different id |
| `careSummary` / timeline | Read `legs` when present; else single `method` |
| `lib/baby-next-due.ts` + `home-quick-status` last feed | Activity time = feed row **`updated_at`** (“last finished”); day-window / `feedsToday` still use **`occurred_at`** |
| `lib/baby-quick-care-notify.ts` | Notify feed only when step `wrote === "insert"` (ignore step name alone for insert-vs-update) |

**Events / other module APIs:** none new beyond payload shape consumers (status, timeline, notify).

### Database contracts

No new table. Forward-only payload shape on existing rows.

| Table / collection | Purpose | Key fields (name, type) | Indexes / uniques | Write owner | Read owners |
|--------------------|---------|-------------------------|-------------------|-------------|-------------|
| `baby_care_event` | Care log; one `type='feed'` row per session (7B) | `id uuid`, `workspace_id`, `baby_id`, `type`, `occurred_at` (session start / day bucket — **unchanged on merge**), `payload jsonb`, `updated_at` (**bumped on every merge**) | existing | `runBabyQuickCare` / care-events | home-quick-status (last feed via `updated_at`), day count via `occurred_at`, timeline, next-due |
| `baby_quick_care_request` | Idempotent replay | unchanged (stored steps include `wrote`) | existing | quick-care | quick-care |

**Payload (`BabyFeedPayload`) — extend:**

```ts
type BabyFeedLeg = {
  method: "breast_l" | "breast_r" | "formula" | "pump";
  durationSec?: number; // breast / pump seconds
  amountMl?: number;    // formula
};

type BabyFeedPayload = {
  method: "breast_l" | "breast_r" | "formula" | "pump"; // primary = last non-pump leg
  durationSec?: number; // sum of breast (+pump) durations
  amountMl?: number;    // formula ml if any
  legs?: BabyFeedLeg[]; // omit on legacy single-method rows (6A); ≤1 entry per method
  notes?: string;
  quickRequestId?: string; // existing runtime trace field; type optional-align OK (Task 2)
};
```

**`mergeFeedLegs` rule:** Prefer **one leg per method**. Same method again → sum `durationSec` and sum `amountMl` into that leg (e.g. L→R→L adds into `breast_l`; two formula top-ups sum ml). Cap array length ≤ 8 after collapse.

**Data ownership notes:**

- Client never invents another device’s session id from “guess latest”.
- Server always re-loads event by id + `workspace_id` (+ baby) before update.
- Legacy rows without `legs` remain valid forever (6A).
- Merge **keeps** `occurred_at`; always sets `updated_at = now()`.

### Example queries

```sql
-- Example 1: 2A mid-breast bottle INSERT — one feed row (both legs).
-- Same SQL whether id omitted or owned id was non-mergeable (past 6h / post-stop expired).
-- Bad id → no INSERT (error). Old non-mergeable row is left unchanged.
INSERT INTO baby_care_event (
  id, workspace_id, baby_id, type, occurred_at, payload, source,
  created_by_user_sub, updated_by_user_sub
) VALUES (
  $id, $workspaceId, $babyId, 'feed', now(),
  '{"method":"formula","durationSec":300,"amountMl":90,"legs":[
    {"method":"breast_l","durationSec":300},
    {"method":"formula","amountMl":90}
  ]}'::jsonb,
  'web', $userSub, $userSub
);
```

```sql
-- Example 2: bottle add-on in grace — UPDATE same row (feedsToday unchanged)
-- Keep occurred_at; bump updated_at for last-feed / next-due
UPDATE baby_care_event
SET
  payload = '{"method":"formula","durationSec":300,"amountMl":90,"legs":[
    {"method":"breast_l","durationSec":300},
    {"method":"formula","amountMl":90}
  ]}'::jsonb,
  updated_at = now(),
  updated_by_user_sub = $userSub
WHERE id = $feedSessionEventId
  AND workspace_id = $workspaceId
  AND baby_id = $babyId
  AND type = 'feed';
-- occurred_at intentionally not changed
```

```sql
-- Example 3: today’s feed count — day membership by occurred_at (session start)
SELECT count(*)::int
FROM baby_care_event
WHERE workspace_id = $workspaceId
  AND baby_id = $babyId
  AND type = 'feed'
  AND occurred_at >= $dayFrom
  AND occurred_at < $dayTo;
```

```sql
-- Example 4: last feed for status / next-due activity — order by updated_at
SELECT *
FROM baby_care_event
WHERE workspace_id = $workspaceId
  AND baby_id = $babyId
  AND type = 'feed'
ORDER BY updated_at DESC, id DESC
LIMIT 1;
```
---

## Patterns to reuse

| Pattern | Why it fits | Reference (repo path or known name) |
|---------|-------------|-------------------------------------|
| Option B one home mutation + lock + replay | Merge stays inside `babyQuickCare`; no second write path | `features/baby/server/quick-care.ts`, `baby_quick_care_request` |
| Pure `lib/` helpers + `node:test` | Grace / merge / roll-up tested before wiring | `lib/baby-quick-care-plan.ts`, diaper quick-plan |
| Client timer + localAfter | Keep timer client-local; extend for session id + grace | `lib/baby-breast-timer-store.ts` |
| Feed jsonb on `baby_care_event` | 7B without a new table | `db/schema/baby.ts` `BabyFeedPayload` |
| `updateBabyEvent` / in-lock update | Prefer update over new mutation | `care-events.ts`, quick-care deps |
| Shared `careSummary` | Combined L+R+formula copy for status + timeline + Telegram | `features/baby/server/timeline.ts` |
| `feedsToday` = COUNT(*) | Honesty via fewer inserts, not fake math | `home-quick-status.ts` |
| Primary button selected | Gate 1 **4B** | `components/ui/button.tsx` `variant="primary"` |
| Segmented control geometry | Flush Kind / bottle; outer md / inner sm | `docs/DESIGN_GUIDE.md` |
| Icon-only ≥44 + `aria-label` | Custom droplet **5B** | `Button` `iconOnly` / `fx-hit-40` |
| CSS-only motion | `fx-ripple` contract + `prefers-reduced-motion` | `app/globals.css` `fx-*` |
| Skeleton parity | Layout change mandatory | `components/baby-page-skeleton.tsx` |
| Done flash ~2s | Keep bottle logged feedback | `lib/baby-home-done-flash.ts` |

---

## UI / UX / mobile

- **Layout / hierarchy:**
  - **Kind:** 2×2 flush segmented control — `gap-0`, no outer island padding that separates tiles; **one shared border** between neighbors (divide / overlapping hairline). Selected tile = **primary** fill (`bg-accent` / primary button tokens).
  - **Bottle:** one **column cluster** — face (top) → stacked ± (middle) → **icon-only Custom** (droplet/ml glyph) under ±. `gap-0`; one border between segments; remove under-card text Custom.
  - **Row 2 equal outer height (technique):** Parent row is CSS grid (or flex) with **`items-stretch`**. Bottle / Start nap / Kind each are **`h-full`** flex columns that fill the stretched cell. Bottle cluster’s intrinsic height (face + ± + Custom) is the tallest; nap and Kind stretch to match — no separate hardcoded `min-height` unless a contract test needs a floor. Layout contract test asserts the three outer wrappers share the same computed height (or equal `h-full` + stretch classes).
  - Breast L/R: running/selected side uses **primary** surface + existing `IconSwap`.
- **Loading / empty / error / success:** Keep existing status lines, Done flash on bottle/Wet-Dry, pending replay. No new empty states.
- **Skeleton parity (zero CLS):** Update `BabyHomeSkeleton` Kind grid + bottle three-segment column to match live geometry in the **same** change; skeleton row 2 also uses stretch / equal-height technique.
- **Mobile:** Thumb-friendly; each Kind tile and Custom icon ≥**44×44**; no hover-only state; `touch-action: manipulation` where pressables already use it; auto-fit row grid unchanged (no hardcoded content breakpoints).
- **Accessibility:** Kind remains radiogroup-style selection; Custom has **`aria-label`** (EN/VI for Custom ml); selected not by color alone (primary fill + `aria-pressed` / checked semantics as today); focus rings preserved.
- **Ripple contract (`fx-ripple`, Gate 1 4B):**
  - CSS-only utility in `app/globals.css`; apply on Kind tiles, bottle segments, breast pressables (alongside `fx-press`).
  - **Motion:** short ink burst ~**400ms**, peak overlay opacity ~**0.22** on accent/ink token, then fade; `transition-[opacity,transform]` (or animation keyframes) — **never** `transition` shorthand / `all`.
  - **Layering:** ripple is a pseudo-element (or child) behind label/icon; `fx-press` scale (0.98 / 0.18s) still applies on `:active`.
  - **`prefers-reduced-motion: reduce`:** disable ripple animation entirely (no burst). Keep existing `fx-press` behavior as globals already gate scale behind `no-preference`.
  - No motion library.
- **Light / dark:** Semantic tokens only; primary selected must read clearly in both modes (verify against DESIGN_GUIDE / Money primary).

---

## Security design review (OWASP)

Trust boundaries:

- Browser → GraphQL (`babyQuickCare`, status query) with session cookie.
- Client localStorage session id / grace (untrusted hint only).
- Server → Postgres under workspace scope; Telegram notify outbound.

Abuse cases:

- Attacker guesses another feed UUID → must not update cross-workspace (stable error).
- Client sends expired post-stop grace with owned id → **INSERT** new feed; never attach to “latest unrelated” feed.
- Client sends open `breastRunning` + owned id with `updatedAt` **past 6h** → **INSERT** new feed (do not merge hours-old sessions).
- Client keeps sticky request id after an insert outcome → later merges must use **adopted** response id only.
- Client sends foreign / missing / wrong-type id → **error**, not insert-into-latest.
- Replay floods with new `clientRequestId`s → existing lock + auth; no new public unauthenticated surface.
- Oversized `legs` / notes → Zod max lengths / array cap on legs (e.g. ≤ 8 legs after same-method collapse).

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 Broken Access Control | **pass** (design) | Every update loads event by id **and** `workspace_id`; no cross-tenant merge. |
| A02 Cryptographic Failures | **N/A** | No new secrets or crypto; care payloads are family PII already at rest as today. |
| A03 Injection | **pass** (design) | Drizzle/parameterized updates; Zod on input; React escapes summary text. |
| A04 Insecure Design | **pass** (design) | Explicit session id (Option B); open continuation only within **6h** max window (no unbounded merge); post-stop 5‑min grace; fail matrix: omit → insert, bad id → error (no insert), past open window / post-stop expired → insert; **2A** one-row on every `breastRunning`+`FORMULA` insert (incl. non-mergeable id); client adopt-on-insert. |
| A05 Security Misconfiguration | **N/A** | No CORS/header/debug changes. |
| A06 Vulnerable Components | **pass** (design) | CSS-only ripple; **no** new motion dependency. |
| A07 Auth Failures | **N/A** | Reuses existing session auth; no new login surface. |
| A08 Software / Data Integrity | **pass** (design) | Idempotent `clientRequestId` replay unchanged; merge updates still stored as replay result. |
| A09 Logging / Monitoring Failures | **pass** (design) | Keep existing care write paths; do not log secrets; avoid logging full PII dumps in new helpers. |
| A10 SSRF | **N/A** | No user-controlled server fetch URLs. |

Source: https://owasp.org/Top10/

---

## Challenges answered

- **Do we need this?** Yes — chrome feels loose, and L→R→bottle falsely inflates `feedsToday`. Gate 1 locked the product rules.
- **What fails?** Cleared localStorage mid-grace → bottle becomes a new feed (honest 3A). Two caregivers without shared timer → may create two sessions (acceptable; live multi-device sync is out of scope). Wrong `feedSessionEventId` → **error**, not silent wrong merge. Long open breast **within 6h** without 5‑min grace → merge still allowed when `breastRunning` is sent; **past 6h** → INSERT. Sticky expired id that still gets sent → server INSERT + client **adopts** new id.
- **Is this overspecified?** No ADR / no new table. Optional `legs` + one optional GraphQL field + split open/grace rules + 6h max open window + `wrote` on steps are the minimum to make 7B + 1A + 2A + 3A real. UI polish is layout/token only on existing controls.
- **Why not Option A?** “Latest feed within 5 min” is simpler but over-merges across caregivers and is hard to test safely; Option B is the safer default.
)
