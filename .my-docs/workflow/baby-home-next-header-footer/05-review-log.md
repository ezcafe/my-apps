# Review log: baby-home-next-header-footer

## Adversarial test review

**Result:** clean  
**Round:** 2 (re-check after Fix)  
**Profile:** lite  
**Updated:** 2026-09-20

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | Title Option 2 chrome | Round 1: no behavior test for status-sourced `home.titleWithAge`. **Closed:** `babyHomeTitleFromStatusBirthDate` unit — known birth → filled months title; null/undefined → `home.title`; months from status birthDate (`lib/baby-app-header.test.ts`). Wired in `BabySectionHeading`. | fixed |
| Major | Birthday Save / Not now | Round 1: source-grep theater. **Closed:** `saveBabyBirthDateFromModal` / `dismissBabyBirthDateModalVisit` behavioral units — success mutation + invalidate; empty → required key; server token → mapped error; Not now → visit dismiss key (`lib/baby-birth-date-modal.test.ts`). Wired in `BabyHomeContent`. | fixed |
| Major | E2E birth strip | Round 1: stale strip/link asserts. **Closed:** case retargeted modal-first — modal visible; no prompt testid / strip copy / settings link; Not now closes; settings tokens + post-save footers kept (`e2e/baby-home-option-b.spec.ts`). | fixed |
| Enhancement | Status icons | Round 1: size-only stubs. **Closed:** breast-last → `M12 4c`; empty → `M9 3h6` (and not the other). | fixed |
| Enhancement | E2E nap header next | Round 1: chip-only. **Closed:** idle next/overdue on `baby-home-header-nap`; chip free of next copy. | fixed |
| Enhancement | Pending `min-h-11` | Round 1: unasserted. **Closed:** recovery / too-old chunks match `min-h-11`. | fixed |
| Enhancement | Breast footer band | Round 1: soft “feeds a day”. **Closed:** fixed age → footer contains guide `feedsMin`/`feedsMax` numbers. | fixed |
| Nit | `e2e/helpers/baby-home-graphql.ts` (`bottleHeader`) | Name still says header; targets section-footer (correct). Optional rename — does not block clean. | open |

**Covered well (do not re-litigate):**

- Headers next-only: nap header vs chip subtitle; bottle band lead-only vs empty/pick; pump lead-only; e2e breast/diaper/nap next/overdue; bottle progress via footer.
- Age footers: bottle ml/progress; nap blend; breast min/max; diaper/pump stage newborn; null-age empty tips; helpers gone.
- Pending inline: section-footer recovery + owner; pump tip suppressed; too-old wrap; live region; `min-h-11`; tie-break helpers.
- Nap fail: fixed shell + footer fail; pending wins over status-fail.
- Birthday modal: open gates; Save/Not now helpers; e2e modal-first (no strip).
- Title Option 2: helper + i18n EN/VI; status-sourced months.
- Status icons: breast vs bottle path distinguish.
- Skeleton + Pump L/R shape kept.

**Round notes:**

- Re-checked Round 1 Majors + Enhancements against Fix notes and updated tests/helpers. All closed with real behavior asserts mapping to Tasks 1–6 TDD (Task 7 withdrawn).
- Zero Critical / Major / Enhancement open. Nit only (helper rename) — **clean**.
- No new Fix ask.

---


## Quality

**Result:** clean  
**Round:** 2 (re-check after Fix)  
**Profile:** lite  
**Updated:** 2026-09-20  
**Axes:** correctness, security (light — Has API/DB no), architecture, readability, performance  
**Spec refs:** `01-idea.md`, `03-design.md`, `04-tasks.md`

| Severity | Location | Finding | Status |
|----------|----------|---------|--------|
| Major | `components/baby-home.tsx` / `lib/baby-birth-date-modal.ts` (Save dismiss) | Round 1: Save only set local `visitDismissed` — remount with null status birthDate re-opened modal. **Closed (Fix r1 + re-verify):** mutation success calls `markBabyBirthDatePromptVisitDismissed` via `visitStorage`; `BabyHomeContent` passes `sessionStorage`; mount effect re-reads visit flag; unit asserts visit key written on save. | fixed |
| Major | `lib/baby-birth-date-modal.ts` (invalidate soft-fail) | Round 1: shared try/catch mapped invalidate throw to birth-field `errorKey`. **Closed (Fix r1 + re-verify):** mutation try/catch separate from invalidate; invalidate throw → `{ ok: true }` (no `errorKey`); UI clears draft / keeps closed on `ok`. Unit asserts soft-fail. | fixed |
| Nit / FYI | `components/baby-route-layout.tsx` (`BabySectionHeading`) | Round 1 Enhancement (title flash cold load). **Lite defer:** not a correctness blocker; `PageHeading` truncates; CLS limited. Optional later: hold last title / defer age until status settled. | deferred (lite) |
| Nit / FYI | `components/baby-route-layout.tsx` vs `BabyHome` | Round 1 Enhancement (heading `dayKey` lag overnight). **Lite defer:** edge overnight without remount; not blocking Save/modal correctness. | deferred (lite) |
| Nit / FYI | `components/baby-home.tsx` size | Round 1 Enhancement (~1760 LOC). **Lite defer:** helpers already extracted; further split optional polish. | deferred (lite) |
| Nit | Bottle footer copy keys | Healthy bottle tip still uses `home.header.bottleMl` / `home.header.bottleProgress` in footer slot. Behavior OK. | open |
| Nit | Nap chip idle subtitle | Idle nap uses `subtitle={"\u00a0"}` (height hold) vs blank. | open |
| Nit | `e2e/helpers/baby-home-graphql.ts` (`bottleHeader`) | Name still says header; targets section-footer. Optional rename. | open |

**Covered well (do not re-litigate):**

- Header next-only + nap next on header / chip clear of next; bottle lead-only when band; pump lead-only.
- Footer priority pending → status-fail → age tip; breast/pump tie-break helpers; polite live region; `min-h-11` actions.
- Nap fail fixed shell + footer fail; pending wins.
- Pinned diaper/pump stage keys EN/VI match Design; null age → empty tips; helpers gone.
- Birthday modal open gates (no strip; no open on error/loading); status Row 4 icons + skeleton icon stubs; Decision 7 Option 2 i18n + status-sourced title helper.
- Profile invalidate scope includes timeline/`homeQuick` prefix — status refresh path is wired when invalidate succeeds.
- Pump L/R + amount unchanged; Task 7 not implemented.
- Save durable visit dismiss + invalidate soft-fail (Round 2 verified).

**Round notes:**

- Senior Verifier Round 2 (did not author Fix). Re-read Fix notes + `lib/baby-birth-date-modal.ts` + wiring in `BabyHomeContent` + tests.
- Both Majors closed with real behavior: visit key on save; invalidate throw still `ok: true`. Re-ran `lib/baby-birth-date-modal.test.ts` → 6 pass.
- Lite profile: former Enhancements (title flash, dayKey, file size) demoted to Nit/FYI deferred — not correctness blockers; do not block clean.
- Zero Critical / Major / Enhancement open. Nits only — **clean**.
- No new Fix ask. SPM = none → skip lenses after Quality clean.

### Fix ask (Quality)

_(none — Round 2 clean)_

---

## Fix notes (quality Fix round 1)

**Tests/behavior changed:** yes

1. **Major — modal after Save durable close:** `saveBabyBirthDateFromModal` accepts optional `visitStorage` and marks visit dismiss on mutation success (same session key as Not now). `BabyHomeContent` passes `sessionStorage`. Remount while status still has `birthDate: null` keeps modal closed via session dismiss until status refreshes.
2. **Major — invalidate soft-fail:** Mutation and invalidate use separate try/catch. Invalidate throw after commit returns `{ ok: true }` — never `babyBirthDateErrorKey` / birth-field error. UI still clears draft and closes.

**Enhancements left open:** title flash, dayKey overnight lag, god-component size (not in this Fix round) — **Round 2 verifier:** demoted to Nit/FYI deferred under lite profile.

**Tests run:** `npx tsx --import ./scripts/test-env.mjs --test lib/baby-birth-date-modal.test.ts` → pass (incl. visit dismiss on save + invalidate soft-fail). Verifier Round 2 re-ran → 6 pass.

**TDD skipped:** none.

---


## Merged SPM (API ‖ DB ‖ Security ‖ Performance ‖ Memory)

Filled by the **Merge findings** arbiter after each parallel round. Lens raw output lives in `05-lens-api.md`, `05-lens-db.md`, `05-lens-security.md`, `05-lens-performance.md`, `05-lens-memory.md` (only files for lenses in SPM plan this round).

**Round:** 1
**Result:** pending

### Winners (fix these)

| Severity | Sources (api/db/security/perf/memory) | Finding | Decision |
|----------|---------------------------------------|---------|----------|
| | | | |

### Conflicts resolved (losers)

| Dropped / demoted finding | Lost to | Why |
|---------------------------|---------|-----|
| | | |

### Fix ask (for Fix agent)

1.

**Round notes:** SPM plan = none — skip lenses after Quality clean.

---

## Fix notes (adversarial-tests Fix round 1)

**Tests/behavior changed:** yes (tests + thin helpers wired into chrome/modal).

1. **Major — title Option 2 chrome:** Extracted `babyHomeTitleFromStatusBirthDate` (`lib/baby-app-header.ts`); `BabySectionHeading` uses status `birthDate` only. Unit: known birth → filled `home.titleWithAge` with floor months; null/undefined → `home.title` (`lib/baby-app-header.test.ts`).
2. **Major — birthday Save / Not now:** Extracted `saveBabyBirthDateFromModal` + `dismissBabyBirthDateModalVisit` (`lib/baby-birth-date-modal.ts`); `BabyHomeContent` calls them. Behavioral unit: success → mutation + invalidate; empty → required key (no request); server token → mapped error; Not now → visit dismiss key. Removed source-grep save test.
3. **Major — e2e birth strip:** Rewrote case to modal-first (modal visible; no prompt testid / strip copy / settings link); Not now closes modal; kept settings error-token + post-save footer asserts.
4. **Enhancements:** status icons assert breast `M12 4c` vs bottle `M9 3h6`; idle nap next/overdue on `baby-home-header-nap` + chip free of next; recovery/too-old `min-h-11`; breast footer fixed-age feeds min/max numbers.

**Tests run:** `npx tsx --import ./scripts/test-env.mjs --test lib/baby-app-header.test.ts lib/baby-birth-date-modal.test.ts components/baby-home.test.ts` → 41 pass.

**TDD skipped:** none (behavior covered by new/updated tests).

**Nit left open:** `bottleHeader` helper rename (optional).
