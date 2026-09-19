# Design review log: baby-log-money-new-form

**Result:** clean  
**Round:** 2  
**Updated:** 2026-09-19

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | analysis | `02-analysis.md` piece 4 still says Vaccine field block “when that type is the loading target,” while `03` / Task 6 lock a **static** skeleton (no `?kind=`). | Optional: one-line sync in analysis so Build does not skim the old wording; design/tasks already win. |
| Nit | diagram | Sequence shows validation fail only; contracts mention auth errors. | Optional auth/workspace-fail alt; not blocking. |
| Nit | design | Redirect example in sequence is `/baby/vaccines`; Task 3 already has `+ path*`. | Optional: mirror measure-style `/:path*` in `03` like Task 3. |

*(Round 1 Critical/Major/Enhancement rows cleared by Architect design-update — see Round notes.)*

## Fix ask for my-design-workflow

None — Round 2 clean.

## Round notes

- Fresh read of listed artifacts + `docs/ARCHITECTURE.md`; did not author or edit 01–04; no production code.
- Deep dive in `02-analysis.md` is solid (Overall + 5 pieces What/Why/How; D1–D4 locked). Decision 1 Option 1 matches analysis; Option 2 correctly rejected (Non-goal / Gate A).
- Skim hard constraints honored (chrome-only one-tap; vaccine UI sentinel + keep API; `?kind=vaccine`; redirect; DESIGN_GUIDE / skeleton parity; Patterns table present).
- UI IA matches Gate A / `01a` / `01b` / ui-refs (chip order, Vaccine always visible, name + First/Second + primary CTA, default Weight). No layout drift that needs Gate A2 reconfirm — only post-save behavior under-specified vs Success state.
- OWASP Top 10 table complete; trust boundaries + abuse cases present (https://owasp.org/Top10/).
- Contracts reuse existing GraphQL + workspace scope; no schema change; sequence has actors, main path, validation failure returns.
- Tasks sized S/M with acceptance; Task 1–4/7 TDD clearer than Task 5.
- Clean blocked until Major + Enhancements above are fixed in design/tasks (Nits optional).

### Round 1 — Architect design-update (2026-09-19)

- Addressed all 4 Fix-ask items; no production code; did not re-litigate Gate A 80/20.
- **`03-design.md`:** Locked Growth post-save = stay + toast + reset to Weight (design lock + sequence success steps + Patterns row rejects `BABY_CARE_AFTER_SAVE.diaper` / home). Skeleton = static 8-chip + vaccine-sized field/Save block (no `?kind=` in `loading.tsx`).
- **`04-tasks.md`:** Task 2 acceptance + TDD for stay / no `router.push("/baby")` + invalidate/toast; Task 5 concrete one-tap red-first tests; Task 6 static Growth skeleton acceptance/TDD.
- UI layout still matches `01b` / ui-refs (IA unchanged); Success state now explicit. No Gate A2/B image reconfirm needed for this fix.
- Nits (auth alt in diagram; redirect `/:path*`) left optional — not in Fix ask.
- Ready for parent to re-run design-review.

### Round 2 — Verifier (2026-09-19)

- Re-read `01`–`04`, prior `03a`, `docs/ARCHITECTURE.md`; did not edit 01–04; no production code.
- **Fix ask 1:** Verified — Design locks **Post-save (Growth)**; UI Success + sequence success arms; Patterns reject `BABY_CARE_AFTER_SAVE.diaper` / home; `afterSave: "stay"` (or Growth stay constant).
- **Fix ask 2:** Verified — Task 2 acceptance + red-first stay / reset Weight / no `router.push("/baby")` + invalidate/toast.
- **Fix ask 3:** Verified — `03` UI + Task 6 static 8-chip skeleton; no `?kind=` branching in `loading.tsx`.
- **Fix ask 4:** Verified — Task 5 red-first one-tap feed/diaper + sleep primary without new required Save.
- No new Critical / Major / Enhancement. Remaining items are Nits only → **Result: clean**.
- Next (parent): TDD test-case review → Gate B → Build → Smoke → review/test per Review profile.
