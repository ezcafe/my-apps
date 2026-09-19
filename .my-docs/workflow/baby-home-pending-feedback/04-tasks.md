# Tasks: Baby home — quiet save, under-trigger recovery

## Task 1: Pending owner + recovery-visible helpers (pure)

**Description:**
Add a pure `babyQuickPendingOwner(action)` (or equivalent) mapping quick-care action → owner id (breast side / pump side / nap / bottle / pump-amount / diaper). Add a **recovery-visible** helper aligned with Feedback contract: show recovery when `!saving` **and** pending is recoverable — `tooOld`, **or** `retryable` + `unknown`, **or** `retryable` + **orphaned `sending`** (pending present, not currently saving). Do **not** implement “never show for `sending`” as the sole rule. Quiet live mutate / Retry mid-flight by gating on `!saving` (chosen; do not require rewrite-to-`sending` on mutate start). Keep storage APIs and `babyQuickPendingView` age / tooOld math unchanged.

**Acceptance:**

- [ ] Owner covers BREAST sides (breast + pump), SLEEP, FORMULA, PUMP_AMOUNT, DIAPER
- [ ] Recovery-visible **false** when `saving === true` (live start **and** Retry mid-flight, even if state is still `unknown`)
- [ ] Recovery-visible **true** for `unknown` and `tooOld` when `!saving`
- [ ] Recovery-visible **true** for orphaned `sending` when `!saving` (remount / hang+reload)
- [ ] Existing `babyQuickPendingView` age / tooOld math unchanged

**Tests (TDD — what turns red first):**

- [ ] Unit: owner map table for each action kind/side/ml/kind
- [ ] Unit: recovery-visible false while `saving` for `sending` and for `unknown` (Retry mid-flight)
- [ ] Unit: recovery-visible true for remount-`sending` with `saving === false`
- [ ] Unit: recovery-visible true for `unknown` / `tooOld` with `!saving`

**Files likely touched:**
`lib/baby-quick-care-pending.ts` (+ test), or thin new helper next to it

**Scope:** S

**Dependencies:** none

---

## Task 2: Home UI — drop page bars; wire under-trigger recovery

**Description:**
In `baby-home.tsx`, remove page-level retryable + tooOld strips. Pass recovery (title / too-old copy + Retry|Discard or Activities|Discard) into owning trigger via a **dedicated recovery `<div>` slot** — not interactive children inside muted `helperText` `<p>`. Timed chips: optional home-only `recovery` / `errorSlot` on `BabyTimedCareChip` with readable error weight (`text-sm` / error token), ≥44 actions. Bottle/diaper/pump-amount: same dedicated `<div>` under the group. Quiet in-flight: use Task 1 recovery-visible (`!saving` gate); keep `disabled={saving}` and `babyHomeSaveAnnouncement`. On ambiguous catch: set `unknown` pending as today, but **do not** set `home.chainFailed` when inline recovery will show. Retry still calls `runQuick(stored.action, pending)` (storage may stay `unknown` mid-retry — chrome stays quiet via `saving`). Confirm-then-start: no optimistic `writeBreast` before mutation confirm.

**Acceptance:**

- [ ] No page markup for `home.pendingTitle` / page tooOld strip
- [ ] Live in-flight start: no recovery under chips; no pendingTitle text as page bar
- [ ] Hang + reload (or seeded `sending` with `!saving`): recovery under owning trigger (title + Try again + Discard)
- [ ] Retry mid-flight: no recovery chrome while `saving`
- [ ] Unknown / tooOld (`!saving`): recovery only under owning trigger/group
- [ ] Recovery UI is outside muted `<p> helperText` (dedicated slot/`div`)
- [ ] Retry uses stored payload; Discard clears pending; tooOld has Activities link, no Retry
- [ ] Timed success still starts timer only after confirm
- [ ] Feed/sleep forms using `BabyTimedCareChip` unchanged if recovery prop is optional

**Tests (TDD — what turns red first):**

- [ ] Unit (`baby-home.test.ts`): mid-flight `saving` + pending `sending` — **no** “could not confirm” / Try again
- [ ] Unit: Retry mid-flight — `saving` + pending still `unknown` → **no** under-chip recovery / no Try again (04a Fix ask)
- [ ] Unit: seeded orphaned `sending` (`!saving`) — recovery under owner (not page strip)
- [ ] Unit: pendingSeed `unknown` FORMULA — recovery nested under bottle/owner testid; Try again + Discard; no standalone page bordered pending strip
- [ ] Unit: pendingSeed tooOld — Open Activities + Discard under owner; no page strip; no Try again
- [ ] Unit: announcement — ambiguous fail does not require `chainFailed` when inline recovery present (assert source or rendered status)
- [ ] Chip API unit: optional recovery prop renders in non-`<p>` container; feed default unchanged

**Files likely touched:**
`components/baby-home.tsx`, `components/baby-timed-care-chip.tsx` (optional recovery slot), `components/baby-home.test.ts`, maybe bottle/diaper wrappers only if needed for a recovery slot

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: E2E — rewrite pendingTitle asserts

**Description:**
Update `e2e/baby-home-option-b.spec.ts` (and any helper) so hang / abort / seed / ambiguous / reload paths assert **under-owner** recovery (or absence of page pending title), not the old page `<p>` bar. Keep localStorage key polls that prove write-before-send. **`reload mid-save` / hang+reload:** assert under-owner recovery when remount leaves orphaned `sending` (not “no chrome because sending”). Add/keep coverage: Breast/Pump start in-flight → no false failure title; failure → error under pressed chip; bottle/diaper/sleep same pattern; tooOld → Activities under owner.

**Acceptance:**

- [ ] `pendingTitle()` either removed or scoped to under-owner recovery text (document which)
- [ ] In-flight / successful start paths: expect **no** false failure title flash as primary chrome
- [ ] Hang + reload (orphaned `sending`): under-owner recovery visible; Retry/Discard still pass with new locators
- [ ] tooOld path uses under-owner Activities / Discard

**Tests (TDD — what turns red first):**

- [ ] E2E cases that currently `expect(pendingTitle(page)).toBeVisible()` fail until locators/asserts updated under owner
- [ ] New/adjusted case: timed start while hung → no page pendingTitle; after reload with stored `sending` → recovery under owner (not silent)
- [ ] E2E tooOld: rewrite `pendingTooOldTitle` (or successor) — under owning trigger; Activities + Discard; page strip count 0 (04a Fix ask)

**Files likely touched:**
`e2e/baby-home-option-b.spec.ts` (helpers near `pendingTitle`)

**Scope:** M

**Dependencies:** Task 2

---

## Task 4: i18n + skeleton check

**Description:**
Keep EN/VI `home.pending*` keys for inline reuse (or confirm still referenced). No new keys required unless Build finds a gap. Confirm `BabyHomeSkeleton` needs **no** change (helpers already exist; no page bar in skeleton). Touch skeleton only if layout gains a permanent new band.

**Acceptance:**

- [ ] EN/VI keys still resolve for inline recovery
- [ ] Skeleton parity test still green without inventing a pending-error skeleton band

**Tests (TDD — what turns red first):**

- [ ] Existing i18n key presence tests still pass
- [ ] `baby-page-skeleton` home tests unchanged / green

**Files likely touched:**
`messages/baby/en.ts`, `messages/baby/vi.ts` (only if needed), `components/baby-page-skeleton.tsx` (likely none)

**Scope:** S

**Dependencies:** Task 2

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused unit tests pass (pending owner + home markup)
- [ ] Manual or e2e: start Breast Left → no “could not confirm” bar; fail path shows under Left chip
- [ ] Slice: Retry/Discard under bottle after seeded unknown still works
