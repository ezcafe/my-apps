# Design review log: baby-home-pending-feedback

**Result:** clean  
**Round:** 2  
**Updated:** 2026-09-19

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | No Critical, Major, or Enhancement this round. | — |

*(Round 1 Critical / Major / Enhancement rows closed by design update — history under Round notes.)*

## Fix ask for my-design-workflow

None — Round 1 Fix ask verified. Result **clean**.

## Round notes

### Round 1 — verifier (2026-09-19)

- Fresh read of `00-run.md`, `01-idea.md`, `02-analysis.md`, `03-design.md`, `04-tasks.md`. No `01a` / `01b` / `02-skim` (simple mode). Did **not** author or edit `01`–`04`.
- Locks honored in docs: Decision 1→2 all quick-care; 2→1 drop page `tooOld`; 3→1 confirm-then-start, quiet in-flight, no optimistic timer.
- Analyze deep dive OK (What / Why / How + other ways + best practices for overall + five pieces). Blocking questions answered by locks. Patterns table present. API/DB N/A contracts clear. OWASP table complete; trust boundaries OK for a client-UX change.
- UI aligns with idea (remove pending bar; timer as status after confirm; errors under trigger). No 01b drift check needed.
- Main hole: recovery-visible rule as written removes the hang+reload recovery path that pending storage exists for, and does not quiet Retry in-flight. That blocks **clean**.

**Round 1 findings (closed):**

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Critical | design / tasks | Recovery chrome allowed only for `unknown` / `tooOld`, never `sending`. Hang + reload leaves `sending` → no Retry/Discard after remount. | Treat orphaned `sending` (`!saving`) as recoverable; quiet live in-flight via `saving`, not “hide all sending forever.” |
| Major | design / tasks | Quiet-in-flight on Retry under-specified; storage can stay `unknown` mid-retry. | Lock `!saving` gate **or** rewrite to `sending` on mutate start; unit for Retry mid-flight. |
| Enhancement | ui-ux | Recovery inside muted `helperText` `<p>` is invalid HTML / too quiet. | Dedicated recovery `<div>` + readable error weight; ≥44 actions. |
| Enhancement | diagram | Sequence missing remount / hang-reload / tooOld-on-mount. | Add remount branch; no auto-retry. |

**Round 1 Fix ask:**

1. Split quiet in-flight vs orphaned remount in Feedback contract.
2. Redefine recovery-visible + Retry rule; Task 1 acceptance/units.
3. Tasks 2–3 hang/reload → under-owner recovery; e2e not silent on orphaned `sending`.
4. Chrome + Task 2: recovery outside muted `<p>`.
5. Sequence remount / orphaned-pending branch.

### Round 1 — architect update (2026-09-19)

Addressed Fix ask 1–5 only; Decisions 1–3 untouched.

1. **`03-design.md` Feedback contract:** Split live quiet in-flight (`!saving` gates chrome) from orphaned pending after remount. Orphaned `sending` / `unknown` / `tooOld` show under-owner recovery when `!saving`. Documented chosen quiet rule: **`!saving` gate** (rejected alternate: rewrite to `sending` on every mutate start).
2. **`03-design.md` + Task 1:** Recovery-visible helper redefined; acceptance + units for remount-`sending` and Retry mid-flight.
3. **Tasks 2–3:** Hang/reload / seeded `sending` → under-owner recovery; e2e `reload mid-save` asserts recovery under owner, not silence.
4. **Chrome + Task 2:** Dedicated recovery `<div>` slot; not muted `helperText` `<p>`; feed/sleep optional default unchanged.
5. **Sequence:** Added remount / hang+reload branch (read pending → recovery if recoverable; no auto-retry).

### Round 2 — verifier (2026-09-19)

- Fresh read of `00-run.md`, `01-idea.md`, `02-analysis.md`, `03-design.md`, `04-tasks.md`, and prior Round 1 in this log. Did **not** author or edit `01`–`04`. No production code.
- **Locked Decisions 1–3 unchanged:** (1) under-trigger errors for all quick-care; (2) drop page `tooOld` strip; (3) confirm-then-start, quiet in-flight, no optimistic timer.
- **Round 1 Fix ask — verified closed:**
  1. Feedback contract splits live `!saving` quiet from orphaned remount; orphaned `sending` must show recovery; “never show for `sending`” rejected as sole rule.
  2. Recovery-visible helper + Task 1: `!saving` gate chosen; units for remount-`sending` and Retry mid-flight (`saving` + `unknown`).
  3. Tasks 2–3: hang/reload / seeded `sending` → under-owner recovery; e2e asserts recovery, not silence.
  4. Chrome + Task 2: dedicated recovery `<div>`, non-muted error weight, ≥44; not inside muted `helperText` `<p>`.
  5. Sequence has remount / hang+reload alt + tooOld note; no auto-retry.
- Spot-check still clean: analyze deep dive; patterns; API/DB N/A; OWASP table + trust/abuse; idea metric; Tasks have acceptance + TDD red-first.
- Zero Critical / Major / Enhancement → **clean**. Next: TDD test-case review → Gate B.
