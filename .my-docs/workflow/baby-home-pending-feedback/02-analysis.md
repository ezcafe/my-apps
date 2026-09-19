# Analysis: Baby home — remove pending bar; timer + inline error

**Size:** Prefer bullets. ≤5 solution pieces. Spike ≤5 rows.
**Mode:** simple (no skim / 01b — outcome locked in `01-idea.md`).
**Result:** done

## Deep dive (required)

### Overall

#### What is this?
A UX fix on Baby home quick-care: stop showing the page-level **"We could not confirm your last save."** bar (`home.pendingTitle` + Retry / Discard) as feedback for in-flight or failed timed starts. Use the **timer chip** as live status; put **errors under the pressed trigger**.

#### Why do we need this?
`runQuick` writes a pending record with `state: "sending"` **before** the mutation returns, and `babyQuickPendingView` treats any non-aged pending as `retryable`. The bar copy reads as failure while Breast/Pump start is still normal. Caregivers already get selected + elapsed / Tap-to-stop on `BabyTimedCareChip`. Skipping leaves a false-failure flash on every start.

#### How to do this?
- Keep **localStorage pending + idempotent `clientRequestId`** (fail-closed write, clear/keep rules) — do not invent a new save path.
- **Stop rendering** the retryable pending title strip as primary feedback for timed (and optionally all) quick presses.
- On ambiguous failure: show **inline error + retry/discard under the trigger** that owns the pending action; on success: timer running, **no bar**.
- Rewrite unit/e2e that assert `pendingTitle()` visibility.
- **Other ways:** (a) hide bar only while `state === "sending"`, still show bar on `unknown` / reload — smaller change, keeps misleading title for true failures at page bottom; (b) optimistic timer start before server confirm — stronger “timer as status,” but fights today’s “`localAfter` only after confirm” rule and complicates discard.
- **Best practices:** Repo — pending store + classifier already correct; chip already has `helperText` slot; DESIGN_GUIDE inline feedback near the control. Industry — don’t label in-flight work as failure; put recovery next to the action.

### Solution pieces

#### 1. Pending bar visibility (home UI)

##### What is this?
The bordered strip under status lines that renders when `pendingView.kind === "retryable"` (and the separate `tooOld` strip).

##### Why do we need this?
That strip is the bug surface. Idea outcome: remove it as primary feedback for these triggers.

##### How to do this?
- **Approach:** Remove (or never mount) retryable `home.pendingTitle` UI for in-scope presses; decide in Design whether `tooOld` stays page-level or also moves.
- **Other ways:** Gate bar on `state === "unknown"` only (hides mid-flight, still page-level on failure).
- **Best practices:** Conditional chrome below the fold must not steal focus from the chip the user just pressed.

#### 2. Timer chip as status (`BabyTimedCareChip`)

##### What is this?
Shared idle / running / Done chrome for Breast L·R, Pump L·R, Nap. Running = selected + elapsed + Tap to stop.

##### Why do we need this?
Idea: timer is enough status while saving/running; no second “pending” story.

##### How to do this?
- **Approach:** Success path already starts timer via `localAfter.startBreastSide` after confirm — keep that unless Design chooses optimistic start. In-flight today: chip `disabled={saving}` while still idle until confirm — Design may add a quiet saving cue on the pressed chip without the failure bar.
- **Other ways:** Optimistic `writeBreast` at pending write time (timer runs during hang); roll back or keep on ambiguous fail.
- **Best practices:** Repo — `data-running`, `IconSwap`, done-flash only after stop; never Done over Tap-to-stop.

#### 3. Inline error under the pressed trigger

##### What is this?
Failure / recovery UI scoped to the chip (or bottle/diaper control) that initiated the pending request — not a global bar.

##### Why do we need this?
Metric: failure shows under the pressed chip; Retry must still resend **stored** request + id (`babyQuickCareRetryPayload`), never the current UI value.

##### How to do this?
- **Approach:** Map `pending.request.action` → trigger id; reuse or extend `helperText` (or a sibling error slot) with error copy + Retry / Discard; keep `classifyBabyQuickCareError` clear rules.
- **Other ways:** Toast-only (easy to miss; no durable Retry); keep page bar for failures only.
- **Best practices:** Repo — muted `helperText` already under timed chips; page `role="status"` announcement (`babyHomeSaveAnnouncement`) can stay for “Saving…” / success, not for the false pending title.

#### 4. Pending storage (keep invisible)

##### What is this?
`lib/baby-quick-care-pending.ts` — key `baby.quickCare.pending.v1`, states `sending` | `unknown`, 30m too-old, fail-closed write, no auto-retry on mount.

##### Why do we need this?
Idea: keep idempotent replay semantics; only stop **surfacing** misleading title on start.

##### How to do this?
- **Approach:** Leave write/clear/classifier contracts unless Design proves bar can die without storage. Reload mid-save still needs a recovery affordance somewhere (inline after remount if action known).
- **Other ways:** Drop pending UI + storage (unsafe lost commits).
- **Best practices:** Repo design already documents why `BAD_REQUEST` is ambiguous — do not narrow clear rules in this fix.

#### 5. Tests / e2e `pendingTitle`

##### What is this?
`e2e/baby-home-option-b.spec.ts` helper `pendingTitle()` scopes to `baby-home` `<p>` matching EN/VI confirm copy; many tests require the bar after hang, abort, seed, and ambiguous errors. Unit: `baby-home.test.ts` pending-bar markup.

##### Why do we need this?
Build will fail green e2e until asserts move to “no pendingTitle on start/in-flight” + “error under chip.”

##### How to do this?
- **Approach:** Update helpers/asserts with the new contract; keep storage-key polls where they prove write-before-send.
- **Other ways:** Leave e2e expecting bar (blocks the product change).
- **Best practices:** Repo — locator already scoped to avoid strict-mode collisions; keep that discipline for under-chip error text.

## What exists today

Home `runQuick` (`components/baby-home.tsx`) persists pending (`state: "sending"`), sets React `pending`, then calls `babyQuickCare`. `babyQuickPendingView` returns `retryable` for **both** `sending` and `unknown` until 30m → `tooOld`. UI paints `t("home.pendingTitle")` for every `retryable`. Breast/Pump/Nap use `BabyTimedCareChip`; timer `localAfter` applies **only after** a confirmed response. Ambiguous errors flip pending to `unknown` and also set `home.chainFailed` via the bottom status announcement. Storage helpers live in `lib/baby-quick-care-pending.ts`; e2e heavily asserts the bar via `pendingTitle()`.

## Dependencies

| Area | Must change / stay compatible |
|------|-------------------------------|
| `baby-home.tsx` pending strips + chip error wiring | Change UI; keep `runQuick` / storage calls |
| `BabyTimedCareChip` (optional prop for error / actions) | Likely small API; feed/sleep forms reuse chip — don’t break them |
| `lib/baby-quick-care-pending*` | Prefer **compatible**; UI-only if possible |
| `classifyBabyQuickCareError` / outcome helpers | Stay |
| i18n `home.pending*` | May keep keys for inline reuse or retire title from primary path |
| `BabyHomeSkeleton` | Bar already drawn as nothing; only update if chips gain stable error space that shifts layout |
| `e2e/baby-home-option-b.spec.ts`, `baby-home.test.ts` | Must follow new feedback contract |
| Server `babyQuickCare` / start-is-local-only | **Non-goal** — do not change |

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-home.tsx` | `runQuick`, pending strips (~1208+), chip presses |
| `components/baby-timed-care-chip.tsx` | Status chrome + `helperText` slot |
| `lib/baby-quick-care-pending.ts` | Storage + `babyQuickPendingView` |
| `lib/baby-quick-care-outcome.ts` | Error class + save announcement |
| `lib/baby-quick-care-plan.ts` | `localAfter` start/stop after confirm |
| `messages/baby/en.ts`, `messages/baby/vi.ts` | `home.pendingTitle` and related |
| `components/baby-home.test.ts` | Pending-bar markup contracts |
| `e2e/baby-home-option-b.spec.ts` | `pendingTitle()` / hang-reload / clear rules |
| `docs/DESIGN_GUIDE.md` | Inline feedback, radii, hit targets |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Timed chip helper slot | `BabyTimedCareChip` `helperText` | Natural place for muted helper vs error under trigger |
| Fail-closed pending write | `writeBabyQuickPending` | Keep before mutation leaves |
| Retry = stored payload | `babyQuickCareRetryPayload` | Never retry current chip ml/side UI |
| Error classifier | `classifyBabyQuickCareError` | Definite clear vs ambiguous keep |
| Save announcement | `babyHomeSaveAnnouncement` | “Saving…” / success without pending title |
| Scoped e2e locators | `pendingTitle()` | Mirror for under-chip error |

**Dev-decision-routing:** context-mode MCP not used this run; prefer repo DESIGN_GUIDE + existing chip/pending patterns.

## Constraints and risks

- **`sending` ≡ retryable today** — root of false “could not confirm” on start.
- **Timer starts after confirm** — “timer as status while saving” is not literally true on idle start until Design adds optimistic start or a non-timer saving cue.
- **Reload mid-save** — e2e expects bar after hang+reload for bottle/diaper/sleep/breast; new recovery must still be findable after remount.
- **Scope creep** — bottle/diaper/sleep share the same bar; idea defers full redesign unless one pattern covers them.
- **`tooOld` strip** — separate copy/actions (Open Activities); idea focused on pending title on start.
- **Feed/sleep forms** also mount `BabyTimedCareChip` — chip API changes must stay home-safe or optional.
- **No server/schema** changes in this workflow.

## Settled decisions (do not relitigate)

- Remove pending **title bar** as primary feedback for timed start (idea outcome).
- Timer chip = status for running/success path.
- Errors under the **pressed** trigger.
- Keep pending storage / idempotency unless Design proves fully invisible storage is enough.
- No server saveBreast / start-local-only rule changes; no full home redesign.
- Mode simple — no Gate A / A2 / ui-refs required.

## Spike notes (optional)

None — behavior confirmed from source + e2e; no throwaway spike.

## Blocking questions

1. **Scope:** Move bottle / diaper / sleep (and Nap) failures under their triggers in **this** change, or **timed Breast/Pump only** first (idea open question)?
2. **`tooOld`:** Keep the page-level too-old strip, or relocate / drop with the retryable bar?
3. **In-flight start:** Optimistic timer start at pending write, or keep confirm-then-start and rely on chip disabled / quiet saving (no failure bar)?

### Non-blocking (Design may choose)

- Exact inline copy (reuse `home.pendingTitle` vs softer “Couldn’t save — try again”).
- Whether bottom `role="status"` still shows `home.chainFailed` when inline error exists (avoid double shout).
- Retry / Discard as text buttons under chip vs icon-only (hit ≥44).
