# Tasks: Baby home next-only headers + age footers + stable errors

## Task 1: Header next-only + nap subtitle clear

**Description:**
Drive every section header body from next/overdue/empty (breast, diaper, nap via `babyNextSleepDue` + `dueBodyMarked`). Bottle: **lead only when birth band exists**; empty/pick (`bottleEmpty`) **only when no band** — never ml+progress in header. Pump header = **lead only** (no empty tip body). Clear nap chip `nextSleepLabel` — subtitle elapsed-only or blank when idle.

**Acceptance:**

- [ ] Breast / diaper / nap headers show next or overdue or empty-next — not age tips
- [ ] Bottle with birth band: lead only (no header body); bottle without band: empty/pick body only
- [ ] Pump header has lead, no body tip until next-due exists
- [ ] Nap chip subtitle never shows next/overdue copy
- [ ] EN/VI keys still marked where «…» used

**Tests (TDD — what turns red first):**

- [ ] Unit: nap header body uses sleep next-due helper; chip subtitle prop blank / elapsed-only
- [ ] Unit: bottle with band → heading body empty/undefined; without band → empty/pick key
- [ ] Unit: pump heading body empty / undefined (lead only)
- [ ] E2E: existing breast/diaper next/overdue header asserts still pass; nap next asserted on **header** not chip

**Files likely touched:** `components/baby-home.tsx`, `components/baby-home.test.ts`, `e2e/baby-home-option-b.spec.ts`, maybe `messages/baby/en.ts` + `vi.ts`

**Scope:** M

**Dependencies:** none

**UI / mobile:** Header scan hierarchy; no control size change.

---

## Task 2: Age footers + drop helpers

**Description:**
Add one footer tip under each section. Bottle: move ml + today progress. Nap: move blend tips. Breast: `feedsMin`–`feedsMax` from `babyFeedGuideForAge`. Diaper/pump: ship pinned `home.footer.diaper.{stageId}` / `home.footer.pump.{stageId}` EN/VI one-liners from Design (paraphrase of `home.guide.stage.*.diaper.body` / nutrition Pumping Output only — **no invent**). Remove `home.helper.*` usage (and keys if unused).

**Acceptance:**

- [ ] Healthy sections show one age footer line (bottle includes today progress)
- [ ] Helpers no longer render under chips
- [ ] Diaper/pump use the five pinned stage keys (+ stage map); copy matches Design EN/VI; sources are guide fields only
- [ ] No birth / null age → empty diaper/pump footer (no tip)

**Tests (TDD — what turns red first):**

- [ ] Unit: bottle footer contains ml + progress; header does not
- [ ] Unit: nap footer uses blend key; header does not when next exists
- [ ] Unit: breast footer reflects feed band min/max for a fixed age
- [ ] Unit: diaper/pump footer key matches stage for fixed ageDays (e.g. day 0 → `.newborn`)
- [ ] Unit: diaper and pump footers stay empty when birth age unknown (no stage tip)
- [ ] Unit/i18n: helper keys unused on home (or removed); pinned footer keys exist EN+VI

**Files likely touched:** `components/baby-home.tsx`, tests, `messages/baby/en.ts` + `vi.ts`, maybe thin helpers near `lib/baby-age-guide.ts`

**Scope:** M

**Dependencies:** Task 1

**UI / mobile:** `text-sm` muted tip; wrap OK; DESIGN_GUIDE tokens only.

---

## Task 3: Shared pending footer (inline wrap) + priority

**Description:**
Render pending recovery in the **section** footer slot (not per-chip). Breast: show if owner is `breast_l` or `breast_r` (tie-break **L then R**). Pump: show if owner is `pump_l`, `pump_r`, or `pump_amount` (tie-break **L → R → amount**). Flex-wrap inline title + actions; too-old same (Open Activities + Discard). Suppress age tip while recovery visible. Priority: pending > status-fail > age tip. Wrap recovery/status-fail in polite live region.

**Acceptance:**

- [ ] One recovery block per breast / bottle / nap / diaper / pump section
- [ ] Multi-owner pending uses Design tie-break order; one recovery only
- [ ] Pump pending owners remain `pump_l` / `pump_r` / `pump_amount` (L/R controls stay)
- [ ] Inline wrap for unknown and too-old; actions ≥44px (`min-h-11`)
- [ ] Age tip hidden when recovery shows
- [ ] Footer pending/status-fail announced via polite `aria-live` / `role="status"`
- [ ] `data-testid="baby-home-pending-recovery"` + `data-pending-owner` preserved

**Tests (TDD — what turns red first):**

- [ ] Unit: breast_l pending → recovery under breast section footer, not under R chip only
- [ ] Unit: breast shared footer picks breast_l over breast_r when both pending (one recovery)
- [ ] Unit: pump shared footer picks pump_l over pump_r over pump_amount when multiple pending
- [ ] Unit: `pump_amount` pending → one pump section recovery; age tip suppressed
- [ ] Unit: too-old renders Activities + Discard on same wrap row
- [ ] Unit: recovery (and nap fail) footer includes polite `aria-live` / `role="status"`
- [ ] E2E: pending recovery under section; retry/discard still work

**Files likely touched:** `components/baby-home.tsx`, chip sections if `helperText`/`recovery` props slimmed, tests, e2e helpers

**Scope:** M

**Dependencies:** Task 2

**Security:** Recovery only when `pendingOwner` matches section owner set; no new writes beyond existing pending retry.

**UI / mobile:** Flex wrap; no truncate-only; accent retry; destructive title.

---

## Task 4: Nap status-fail fixed shell + footer message

**Description:**
On sleep status-check fail, keep a big-control shell at `BABY_HOME_BIG_CONTROL_MIN_H` (disabled/placeholder). Move `home.napCheckFailed` + retry into the nap footer slot. Do not replace the chip with a taller bordered box.

**Acceptance:**

- [ ] Healthy vs fail nap control height match (`BABY_HOME_BIG_CONTROL_MIN_H`)
- [ ] Fail copy + retry live in footer slot
- [ ] If pending also present, pending wins (footer priority)

**Tests (TDD — what turns red first):**

- [ ] Unit: fail-closed renders shell + footer fail; no tall replacement-only layout
- [ ] Unit/control-height: min height constant still applied on fail shell
- [ ] Unit: nap pending recovery wins over status-check fail in footer (fail copy absent; tip absent)

**Files likely touched:** `components/baby-home.tsx`, `components/baby-home.test.ts`, `lib/baby-home-control-height.ts` (read-only unless needed)

**Scope:** S

**Dependencies:** Task 3

**UI / mobile:** Retry ≥44px; muted/destructive fail text; no layout jump in subgrid row.

---

## Task 5: Skeleton parity + regression pass

**Description:**
Update `baby-page-skeleton` so each home section that has a live footer gains a matching stub (order, gaps, radii). Mirror status Row 4 icon-sized stubs if live status gains icons. Pump / `BabyPumpSkeleton`: keep **L/R pair** + amount (current). Run focused unit + e2e asserts for headers, footers, pending, nap fail, birthday modal absence of strip, title age when applicable. Keep existing Pump L/R e2e flows green.

**Acceptance:**

- [ ] Skeleton mirrors live header → controls → footer
- [ ] Status / title chrome stubs stay CLS-safe if live UI changed in Task 6
- [ ] Pump skeleton: L/R pair + amount (unchanged control shape) + footer stub
- [ ] Skeleton tests updated
- [ ] Focused unit + e2e green for this workflow

**Tests (TDD — what turns red first):**

- [ ] Skeleton test fails until footer stubs exist
- [ ] E2E smoke paths: next headers, bottle progress in footer, pending inline, nap fail height stable
- [ ] E2E/unit: no `home.birthDatePrompt` strip; title / status icon asserts from Task 6 stay green; Pump L/R flows still pass

**Files likely touched:** `components/baby-page-skeleton.tsx`, `components/baby-page-skeleton.test.ts`, e2e

**Scope:** S

**Dependencies:** Tasks 1–4, Task 6

**UI / mobile:** Zero CLS; light/dark token check mentally via existing muted stubs.

---

## Task 6: Birthday modal + status icons + title age (Gate B)

**Description:**
(1) Remove muted `home.birthDatePrompt` strip. Open birthday modal **only** when status has loaded OK (`!statusError`, status defined / `!statusLoading`), `status.birthDate == null`, and visit not dismissed — date field + Save + Not now. Reuse settings validation/`babyBirthDateErrorKey` + existing `updateBabyProfile`. Keep visit dismiss (do not force until set). (2) On `data-testid="baby-home-status"` (Row 4 after pump), add leading icons per Design map (feed bottle/breast by last kind; sleep/diaper/pump fixed). (3) When `status.birthDate` known, page title uses `home.titleWithAge` with floor months from `ageDays / 30.4375` — **Decision 7 Option 2** EN `Baby Care · {n} months` / VI `Chăm bé · {n} tháng`; when unknown, `home.title` only. Pin title months to the **same status `birthDate`** as home; invalidate that status query on modal save (no separate profile fetch in chrome).

**Acceptance:**

- [ ] No `home.birthDatePrompt` strip / settings-only link CTA on home
- [ ] Modal opens only when status loaded OK + `status.birthDate == null` + visit not dismissed; **no** modal on `statusError` or while status loading/undefined
- [ ] Modal closed when birthDate set or Not now
- [ ] Save persists via existing `updateBabyProfile`; invalid dates show mapped settings (or alias) errors; status query invalidated so title/home refresh
- [ ] Not now visit-dismisses; care logging remains available without birthday
- [ ] Status feed/sleep/diaper/pump lines show locked icons (`IconBabyBottle`/`IconBabyBreast`/`IconBabySleep`/`IconBabyDiaper`/`IconBabyPump`)
- [ ] Title months source = status `birthDate` only (same query/cache as home); `home.titleWithAge` when known; `home.title` when null
- [ ] Skeleton / page chrome updated if title or status layout changed (CLS)

**Tests (TDD — what turns red first):**

- [ ] Unit: status loaded OK + birthDate null + not dismissed → modal open; **no** strip / `home.birthDatePrompt` text
- [ ] Unit: `statusError` → **no** modal (even if birthDate appears unset); status loading/undefined → **no** modal
- [ ] Unit: Not now → modal closed; visit dismiss flagged; logging UI still present
- [ ] Unit: Save success path calls profile mutation (mock), invalidates status, closes modal
- [ ] Unit: status lines include mapped icon components (feed empty → bottle; breast last → breast icon; sleep/diaper/pump fixed)
- [ ] Unit: `babyAgeInMonthsFloor` (or equivalent) for known ageDays; title key `home.titleWithAge` when status birthDate set; `home.title` when null
- [ ] Unit: title months use status birthDate (not a separate profile read)
- [ ] Unit/i18n: `home.titleWithAge` exists EN+VI as full-word months (`Baby Care · {n} months` / `Chăm bé · {n} tháng`)
- [ ] Skeleton/chrome: title or status stub parity if layout changed
- [ ] E2E (optional if unit covers): modal open when status-ready unset; title shows months after birth set

**Files likely touched:** `components/baby-home.tsx`, `components/baby-route-layout.tsx` and/or `lib/baby-app-header.ts`, `lib/baby-age-guide.ts` (+ tests), `lib/baby-birth-date-prompt.ts` (reuse), `messages/baby/en.ts` + `vi.ts`, `components/baby-page-skeleton.tsx`, unit + e2e tests

**Scope:** M

**Dependencies:** none (can parallel Tasks 1–4); Task 5 should land after this for full CLS

**Security:** Reuse auth’d `updateBabyProfile` only; same validation as settings; no new public contract.

**UI / mobile:** Modal ≥44px actions; DESIGN_GUIDE tokens; icons `aria-hidden`; title length CLS-safe.

---

## Task 7: Single timed Pump — WITHDRAWN

**Status:** **Withdrawn** (user rejected merging Pump L/R at Gate B, 2026-09-20).

Do **not** implement. Keep Pump L + Pump R + amount as current behavior on home and `BabyPumpForm`. Decision 8 void. See `03-design.md` Decision 8 rejected / withdrawn.

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused tests pass
- [ ] Slice works end-to-end where applicable (home chrome)
- [ ] Security: Has API no; Has DB no; pending ownership scoped; birth save uses existing mutation
- [ ] UI/mobile: ≥44px actions; skeleton parity; no helper + tip double lines; no birth strip; status icons; title age when known; Pump L/R unchanged
- [ ] Gate B approved (Decision 7 Option 2 locked) — ready for design-review re-run → Build path
