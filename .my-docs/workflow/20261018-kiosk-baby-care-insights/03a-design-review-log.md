# Design review log: 20261018-kiosk-baby-care-insights

**Result:** clean
**Round:** 2
**Updated:** 2026-10-18

**Isolated reviews (parallel-safe):** Has API yes · Notes `tiny-contract-tweak` → API isolated **skipped** (folded light checks here). Has DB no → DB isolated **skipped**. Overall clean needs this log clean + isolated clean|skipped.

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | diagram | Sequence still shows happy inject + load only; no prefs patch-fail or soft-empty return. | Optional alt: inject patch fails → render merged in-memory this request or skip persist; no crash. |
| Enhancement | glossary-adr | Glossary nursery line may still mention optional schedule pill; Design v1 hides schedule always. | Task 10: align glossary to v1 no pill / hide-until-SoT. |
| Enhancement | practice | `00-run.md` Task count may still say 8 vs `04-tasks.md` has 10. | Parent metrics: Task count = 10. |
| Enhancement | contracts | Overdue `timeLine` locks `Overdue · {duration}`; Home i18n is `{duration} overdue`. Duration helper is clear; string shape differs on purpose. | Keep Design template for kiosk e-ink; do not call full `formatBabyNextDueLabel` as the cell line. |
| Nit | design | “Chosen design (user-approved)” empty — expected pre–Gate B. | Fill after Gate B yes. |

**R1 Majors — re-check (closed):**

| R1 Fix ask | Status in 03 + 04 |
|------------|-------------------|
| Next-care overdue + `timeLine` from `BabyNextDue` (no invented range) | Closed — Contracts table + Task 3 acceptance/tests |
| Full `kioskLayout` merge + `resolveKioskLayout`/Zod flag pass-through + round-trip | Closed — Concept 2, Inject rule, Tasks 1–2 |
| Per-ref footer left marks (none / shutter / open-circle) | Closed — UI mark table + Tasks 5–8 |

**Light API (tiny-tweak):** Existing `GET`/`PATCH /api/user/preferences` only; enum gains three `baby.*` ids; optional `kioskLayout.babyDefaultsInjected`; inject write-back sends full layout. Auth/errors unchanged. No new baby routes. No isolated `03a-api-contract-review.md` required.

**UI vs refs / Gate A:** Hierarchy #1/#2 match. Settled remaps (no booking copy; dueAt clock / overdue duration vs ref booking range; hide bed time / schedule / Solids) match Grill — not drift. Footer marks now locked to refs.

**Checklist pass notes:** Problem map + Analyze What/Why/How + Solution branches OK. Grill frontier-empty; Design honors Q1–Q5 / ADR-004 / Option 1. System design + three patterns taught; OWASP table present; tasks have acceptance + TDD red-first. No Critical / Major open.

## Fix ask for my-dev-flow-design

None — Round 2 clean.

## Deferred Enhancements (do not block clean)

- Sequence: inject patch-fail / soft-empty alts.
- Glossary nursery schedule wording vs v1 hide (Task 10).
- `00-run.md` Task count vs 10 tasks in `04-tasks.md`.
- Overdue line: keep kiosk `Overdue · {duration}`; avoid swapping in full Home i18n label.

## Round notes

- Verifier fresh context; did not author 01–04; did not rewrite them.
- Mode full · Has UI yes · Has API tiny-tweak · Has DB no.
- Side-by-side vs `refs/funny-time.png`, `refs/next-event.png`, `refs/nursery-dashboard.png`.

### Round 1

- Result **needs update** — three Majors: next-care timeLine/overdue; layout flag merge/pass-through; per-ref footer marks.
- Light API folded; no isolated API/DB files.
- Enhancements deferred (diagram, glossary, task count).

### Round 1 — design-update (Architect)

- Addressed Fix ask 1–3 in `03-design.md` + `04-tasks.md` (Tasks 1–3, 5–8).
- **Next-care:** locked `next` → dueAt 12h clock; `overdue` → same title + `Overdue · {duration}`; `hidden` → empty; no start–end invent.
- **Inject:** full `kioskLayout` merge (mode/columns/focus + flag); `resolveKioskLayout`/Zod pass-through; round-trip unit in Tasks 1–2.
- **Footers:** Funny Time labels only; next-care shutter+Baby Care; nursery open-circle+Huckleberry.
- Deferred Enhancements left for later.

### Round 2

- Re-read updated `03-design.md` and `04-tasks.md`. All three R1 Majors closed with matching task acceptance/TDD.
- No new Critical/Major. Result **clean** — ready for 04a / Gate B.
