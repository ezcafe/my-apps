# Design: Baby home — quiet save, under-trigger recovery

**Mode:** simple — from `00-run.md`

## Design locks (do not re-open)

| Lock | Choice |
|------|--------|
| **Decision 1** | Option 2 — under-trigger errors for **all** quick-care (Breast, Pump L·R, Bottle, Nap, Diaper, Pump amount) |
| **Decision 2** | Option 1 — drop page-level `tooOld` strip too (inline / discard / Activities under trigger) |
| **Decision 3** | Option 1 — confirm-then-start; quiet in-flight; no failure bar; **no** optimistic timer |
| **Non-goals** | No server / schema change; keep pending storage + idempotent `clientRequestId` |

---

## Decision 1: which design approach?

### Option 1 — Under-trigger recovery; drop page bars (recommended)

**What it is:**
Remove both page-level pending strips (`retryable` `home.pendingTitle` and `tooOld`). Keep `runQuick` + localStorage pending as today. In-flight (`state: "sending"`) stays quiet: chip/group `disabled={saving}`, bottom `role="status"` may show Saving… / success — **never** `pendingTitle`. After confirm, timer/`localAfter` runs as today. On `unknown` or `tooOld`, show recovery **under the owning trigger** (Retry/Discard or Activities/Discard). Retry still uses **stored** request + id.

**Example:**
Tap Breast Left → pending written → no page bar → Saving… muted if shown → success starts Left timer. Ambiguous fail → error + Try again / Discard under the Left chip only. Reload with aged bottle pending → too-old copy + Open Activities / Discard under Bottle chips.

**Pros:**

- Fixes false “could not confirm” on every start.
- One recovery pattern for all quick-care; recovery stays next to the action.
- Storage / classifier / retry payload unchanged (safe, small change).

**Cons:**

- Bottle / Diaper / Pump amount are flush grids — recovery sits under the **group**, not inside a tile.
- Confirm-then-start means idle chip while saving (disabled), not a running timer yet.
- Unit + e2e that assert page `pendingTitle` must move.

### Rejected alternative (≤3 lines)

Hide the page bar only while `state === "sending"`; keep page-level bar for `unknown` / `tooOld`. Smaller diff, but true failures stay far from the pressed control and still use the same failure title as the old bug surface.

## Tradeoffs

One-line: under-trigger recovery costs more wiring than “hide bar while sending,” but matches locked Decisions 1–3 and the idea metric.

## Recommendation

**Pick Option 1** — drop both page strips; quiet in-flight; under-trigger recovery for all quick-care; confirm-then-start (no optimistic timer).

## Chosen design (user-approved)

**Option 1** — locks above (Decisions 1→2, 2→1, 3→1 already recorded in `00-run.md`).

### Feedback contract

**Quiet in-flight (locked rule):** Same-page live mutate is quiet via **`!saving` gates recovery chrome** — not via “never show recovery for `sending`.” While `saving === true`, hide Retry/Discard/Activities under the owner (covers first start **and** Retry mid-flight even if storage still says `unknown`). Optional muted Saving… via `babyHomeSaveAnnouncement` + `role="status"`. Owning control `disabled={saving}`. Timer / Done-flash only after **confirmed** response (`localAfter`). No page `pendingTitle` bar ever.

**Rejected alternate for quiet Retry:** Rewrite pending to `state: "sending"` on every mutate start (including Retry). Not chosen — `!saving` alone quiets Retry without an extra storage write.

| Phase | UI |
|-------|----|
| **Live in-flight** (`saving === true`, pending often `sending` or still `unknown` on Retry) | Quiet. No recovery chrome. No page bar. Disabled owner + optional Saving… status. |
| **Orphaned pending after remount** (pending present, `saving === false`) | **Must** show under-owner recovery when view is recoverable — including **orphaned `sending`** (hang + reload: catch never ran, localStorage still `sending`). Same chrome as unknown: title + Try again + Discard (age &lt; 30m). **No** auto-retry on mount. |
| **Success** | Clear pending. Timer or Done-flash as today. No page bar. Status announcement = step/success copy (not `chainFailed`). |
| **Definite no-commit** | Clear pending (classifier unchanged). Brief failure via status announcement only — no durable Retry strip (nothing to replay). |
| **Unknown** (`retryable` view, age &lt; 30m, `!saving`) | Under **owning** trigger: `home.pendingTitle` + Try again + Discard. **No** page bar. Do **not** also set `home.chainFailed` on status when this inline block is visible (avoid double shout). |
| **Too old** (`!saving`) | Under **owning** trigger: `home.pendingTooOld` + Open Activities + Discard. **No** Retry. **No** page bar. |

**Recovery-visible helper (pure):** Show under-owner recovery iff `!saving` **and** pending maps to a recoverable view: `tooOld`, **or** `retryable` with `state === "unknown"`, **or** `retryable` with `state === "sending"` (orphaned after remount). Do **not** use “`sending` never shows recovery” as the sole rule.

### Owning trigger map

Pure helper (new or next to pending helpers), e.g. `babyQuickPendingOwner(action)`:

| `request.action` | Owner |
|------------------|--------|
| `BREAST` + `breast_l` / `breast_r` | That Breast timed chip |
| `BREAST` + `pump_l` / `pump_r` | That Pump timed chip |
| `SLEEP` | Nap timed chip |
| `FORMULA` + `amountMl` | Bottle ml **group** (under chips; highlight matching ml if present) |
| `PUMP_AMOUNT` + `amountMl` | Pump amount ml **group** |
| `DIAPER` + `diaperKind` | Diaper kind **group** |

Only the owner mounts recovery. Other chips keep normal muted helpers.

### Chrome wiring

- **Timed chips (`BabyTimedCareChip`):** Home-only optional prop `recovery` / `errorSlot` — a dedicated **`<div>` slot** (not children inside the muted `helperText` `<p>`). When recovery-visible for this owner: mount recovery in that slot (title + actions). Styling: readable error weight (`text-sm` + error/alert token), **not** muted helperText. Hit targets ≥44 (`min-h-11`). Feed/sleep forms keep optional prop default (no slot content; existing muted helperText only).
- **Bottle / Pump amount / Diaper:** Same rule — recovery in a dedicated `<div>` under the group (replace or sit beside muted helper `<p>`; **never** put buttons inside the muted `<p>`). Keep flush 2×2 tile layout intact.
- **Page:** Delete both bordered strips after status lines (~1208–1249 in `baby-home.tsx`).
- **Reload / remount:** Re-read pending on mount (existing). If recovery-visible (`!saving` + orphaned `sending` / `unknown` / `tooOld`), recovery under owner — **no auto-retry**.

### Copy

Reuse existing keys: `home.pendingTitle`, `home.pendingRetry`, `home.pendingDiscard`, `home.pendingTooOld`, `home.pendingTimelineLink`. Soften title later only if product asks — out of scope.

### Skeleton parity

Page pending strips are already absent from `BabyHomeSkeleton`. Recovery is conditional in the dedicated slot — **no** new permanent reserved error band. **No skeleton change** unless Build adds a new always-on layout row (avoid that).

---

## Sequence diagram

Client-only UX over existing `babyQuickCare` mutation (no API/DB change).

```mermaid
sequenceDiagram
  participant UI as BabyHome
  participant LS as localStorage pending
  participant API as babyQuickCare

  UI->>LS: write pending state=sending
  Note over UI: Quiet while saving — no recovery chrome, no page bar
  UI->>API: mutate(request, clientRequestId)
  alt confirmed success
    API-->>UI: steps / ok
    UI->>LS: clear
    UI->>UI: localAfter (timer / Done-flash)
  else definiteNoCommit
    API-->>UI: error
    UI->>LS: clear
    UI->>UI: status announcement only
  else ambiguous
    API-->>UI: error
    UI->>LS: state=unknown
    UI->>UI: recovery under owning trigger (!saving)
  else remount / hang+reload
    Note over UI,LS: Pending still sending or unknown; saving=false
    UI->>LS: read pending on mount
    UI->>UI: under-owner recovery if recoverable — no auto-retry
  end
  Note over UI: tooOld after 30m — Activities + Discard under owner
```

## Contracts

### API contracts

**No change.** Existing `babyQuickCare` GraphQL mutation, auth, request shape, and clear rules stay as today.

| Item | Detail |
|------|--------|
| Method + path (or name) | Unchanged `babyQuickCare` |
| Auth / who can call | Unchanged |
| Request fields | Unchanged (incl. `clientRequestId`) |
| Success / errors | Unchanged; client still uses `classifyBabyQuickCareError` |

**Events / other module APIs:** none new.

### Database contracts

**No DB / migration change** — client UX + localStorage pending only.

| Table / collection | Purpose | Key fields | Indexes | Write owner | Read owners |
|--------------------|---------|------------|---------|-------------|-------------|
| — | N/A | — | — | — | — |

**Data ownership notes:** Pending record remains device-local (`baby.quickCare.pending.v1`).

### Example queries

N/A — no SQL. Client storage (unchanged shape):

```ts
// Write before mutate (fail-closed)
writeBabyQuickPending(localStorage, {
  babyId, requestId, request, state: "sending", startedAt,
});

// Ambiguous fail
writeBabyQuickPending(localStorage, { ...record, state: "unknown" });

// Success or definiteNoCommit
clearBabyQuickPending(localStorage);
```

## Patterns to reuse

| Pattern | Why it fits | Reference |
|---------|-------------|-----------|
| Timed chip recovery slot | Under-trigger place; dedicated `<div>`, not muted `<p>` | `BabyTimedCareChip` optional `recovery` / `errorSlot` |
| Fail-closed pending write | Keep before mutate | `writeBabyQuickPending` |
| Retry = stored payload | Never retry live UI ml/side | `babyQuickCareRetryPayload` |
| Error classifier | Clear vs keep | `classifyBabyQuickCareError` |
| Save announcement | Saving… / success without pending title | `babyHomeSaveAnnouncement` |
| Scoped e2e locators | Avoid strict-mode collisions | `pendingTitle()` → under-owner error |

## UI / UX / mobile

- **UI concept (01b):** skipped (simple) — tiny tweak on existing chips; no new IA.
- **80/20:** Important #1 = timer / chip status for running care; #2 = recovery under the pressed trigger when save is unclear. No page failure strip on start.
- **Layout:** Same home rows; remove strips below status; recovery in existing helper slots.
- **Loading / empty / error / success:** Live in-flight quiet via `!saving` + optional Saving…; orphaned `sending` / unknown / tooOld under owner in dedicated recovery `<div>`; success = timer/Done + muted status.
- **Skeleton parity:** No change if recovery slot stays conditional (see above).
- **Mobile:** Text Retry / Discard / Activities ≥44px; no hover-only; recovery readable under thumb-reach chips.
- **Accessibility:** Recovery near control in non-muted slot (valid HTML — no buttons inside muted `<p>`); keep one live region for Saving…/success; do not announce failure twice; preserve `data-testid` on chips for e2e.
- **Day-to-day:** Start Left feels like start (timer after confirm), not “could not confirm.”

## Security design review (OWASP)

Trust boundaries:

- Browser localStorage pending + authenticated GraphQL care mutation (unchanged).

Abuse cases:

- Replay of stored pending only via Retry with same `clientRequestId` (idempotent). Discard clears local only — does not delete server rows.

| OWASP | Status | Note |
|-------|--------|------|
| A01 Broken Access Control | N/A | No auth change |
| A02 Cryptographic Failures | N/A | No crypto |
| A03 Injection | N/A | No new inputs to SQL/HTML templates beyond existing i18n |
| A04 Insecure Design | pass | Keep fail-closed pending + no auto-retry on mount |
| A05 Security Misconfiguration | N/A | |
| A06 Vulnerable Components | N/A | |
| A07 Auth Failures | N/A | Classifier still clears on UNAUTHORIZED/FORBIDDEN/NOT_FOUND |
| A08 Software / Data Integrity | pass | Retry uses stored payload only |
| A09 Logging / Monitoring Failures | N/A | |
| A10 SSRF | N/A | |

Source: https://owasp.org/Top10/

## Challenges answered

- **Do we need this?** Yes — `sending` ≡ retryable paints failure copy on every normal start.
- **What fails?** Ambiguous network hang + reload leaves `sending` in localStorage: recovery **must** still appear under owner after remount when `!saving`; e2e asserts under-owner recovery, not “no chrome because sending.”
- **Is this overspecified?** No — UI placement + `!saving` quiet rule + orphaned-`sending` recovery; storage/API untouched.
