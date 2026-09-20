# Design review log: baby-home-polish-guideline-pump

**Result:** clean
**Round:** 2
**Updated:** 2026-09-20

## API contract review (when Has API)

Filled by the isolated **API contract review** Task only. Skip section when Has API = no.

**Result:** clean
**Updated:** 2026-09-20
**Round:** 2 (re-check after design update)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | None — zero Critical / Major / Enhancement | — |

**API checklist:**

- **Typed I/O:** Enum extend only (`PUMP_AMOUNT`); Success = full existing `BabyQuickCareResult` — matches `lib/graphql/baby-typeDefs.ts`.
- **One error shape:** GraphQL enum 400 today; after fix, same Zod codes as FORMULA amount — documented; duplicate `clientRequestId` → success + `replayed`.
- **Edge validation:** GraphQL enum edge then Zod — correct; Task 1 covers yoga reach + missing-amount Zod.
- **Pagination:** N/A (single mutation).
- **Additive fields:** New enum value only — one-version extend-in-place; no breaking field changes.
- **Naming:** `PUMP_AMOUNT` matches Zod / `runBabyQuickCare` / client — good.
- **Idempotency:** Contracts table states pump keeps `clientRequestId` → `replayed: true`, no second write.
- **Repo patterns:** Auth via `requireBabyWriteWorkspace` (no `babyId` on input); examples match `BabyQuickCareInput` + selection parity with `BABY_QUICK_CARE_MUTATION` / diaper yoga tests.

**Fix ask (API-related only):**

None — prior Majors (examples + request fields) and Enhancement (idempotency line) fixed in `03-design.md`. Optional Nit (Zod alt on sequence B) left unapplied; does not block clean.

## DB design review (when Has DB)

Filled by the isolated **DB design review** Task only. Skip section when Has DB = no.

**Result:** skipped
**Updated:** 2026-09-20

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | Has DB = no — section skipped | — |

**DB checklist:** N/A

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | None — zero Critical / Major / Enhancement | — |

**Prior round 1 findings — verified fixed:**

- **Major (Done centering + Task 4 TDD):** `03-design.md` Centering locks absolute-centered Done overlay + CLS reserved idle slots; forbids alternate approaches. Task 4 description/acceptance/TDD require that structure with a red-first unit on `doneText` + reserved slots.
- **Enhancement (guideline subsections):** Quiet guideline + Task 5 acceptance/TDD require per-stage subsection structure from `01-guideline-content.md` (sleep, milk/pump, WHO, vitamins, diaper notes), not headings-only flatten.

**Nits (do not block clean):**

- Sequence A (Custom Done) has no mutation-failure return (no Done flash) — optional diagram add.
- `baby-page-skeleton.tsx` still has many inline `+1px` calcs beside the shared token — Task 2 acceptance already covers skeleton floor; implementer should grep those strings.

**What looks solid (no Fix ask):**

- Analyze deep dive What / Why / How for overall + five pieces; locked defaults match `00-run.md`.
- Option 1 + short rejected alternative; patterns to reuse; Custom Done root cause → design wiring clear; Diaper N/A settled.
- Height formula `2×2.75rem+3px`; enum-only API; skeleton parity called out; OWASP table complete; mobile ≥44px / a11y basics noted.
- Tasks 1–5 have clear acceptance + TDD (Task 4/5 now concrete after Fix ask). Cross-cutting: API clean, DB skipped.

## Fix ask for my-design-workflow

None — overall clean. API Fix ask: none. DB: N/A.

## Round notes

- API contract review (round 1): **needs update** — example mutations and request-field table do not match live GraphQL `BabyQuickCareInput` / result types. Enum-only change itself is sound and additive.
- Design update (round 1): Applied API Fix ask 1–3 in `03-design.md` — examples use `clientRequestId` (no `babyId`) + real `replayed` / `steps { step wrote event }`; contracts table documents required `clientRequestId`, workspace/auth from baby write context, full `BabyQuickCareResult`, and pump idempotency (`clientRequestId` → `replayed`). `04-tasks.md` unchanged (no Fix ask task edits). Optional Nit (Zod alt on sequence B) not applied.
- Design review (round 1): **needs update** — API clean, DB skipped; general review found 1 Major (Done centering lock + Task 4 TDD) and 1 Enhancement (guideline subsection fidelity). Overall not clean until Fix ask applied and re-reviewed.
- Design update (round 2): Applied general Fix ask 1–3 only — locked absolute-centered Done overlay + reserved slots in `03-design.md` Centering; Task 4 red-first unit on Done overlay/markers + reserved slots (idle centering kept); Quiet guideline + Task 5 require per-stage subsection structure from `01-guideline-content.md`. API section Result untouched (stays clean). No production code.
- Design review (round 2): **clean** — re-checked prior Major/Enhancement against `03-design.md` + `04-tasks.md`; both fixed. No new Critical/Major/Enhancement. API remains clean; DB skipped. Overall Result = clean.
