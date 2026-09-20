# Design review log: baby-home-layout-custom-diaper

**Result:** clean  
**Round:** 2 (general design review)  
**Updated:** 2026-09-20

## API contract review (when Has API)

Filled by the isolated **API contract review** Task only. Skip section when Has API = no.

**Result:** clean  
**Updated:** 2026-09-20  
**Round:** 3

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | No Critical / Major / Enhancement remaining after Round-2 design update | — |

**API checklist:**

- **Typed I/O:** Additive optional `occurredAt` / `endedAt` on `BabyQuickCareInput`; success = existing `BabyQuickCareResult` — matches create inputs + `lib/graphql/baby-typeDefs.ts` shape. Truth table + Precedence + IGNORE rules coherent.
- **One error shape:** Invalid ISO → Zod/GraphQL `BAD_REQUEST` (create-input parity). Auth/workspace unchanged. Sequence alts: auth miss + `replayed: true`.
- **Edge validation:** Zod `datetime({ offset: true })` at edge; present strings validated **before** path IGNORE (Semantics + Errors). Matches `runBabyQuickCare` parse-then-write edge.
- **Pagination:** N/A (single mutation).
- **Additive fields:** Optional strings only; omit = server now — addition-over-modification OK.
- **Naming:** `occurredAt` / `endedAt` / `clientRequestId` match create + quick-care repo names.
- **Idempotency:** Replay-by-id only (no body hash); same id + different times → first write — matches `runBabyQuickCare`. Task 1 covers replay case.
- **Auth / trust:** Workspace write from session; no client `babyId`; times untrusted until Zod. OWASP replay note aligned.
- **Tasks:** Task 1 acceptance + units cover SLEEP-open precedence (`occurredAt`-only → server now; `endedAt` → that end), Auto-endNap non-SLEEP clock, IGNORE on BREAST/FORMULA/PUMP_AMOUNT, invalid ISO, idempotent replay. Task 7 e2e helpers accept times.

**Fix ask (API-related only):**

None — Round-2 Fix ask verified in `03-design.md` / `04-tasks.md`.

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
| — | — | No Critical / Major / Enhancement remaining after Round-1 general Fix ask | — |

**Nits (do not block):**

- Chosen design still `<!-- Fill after Gate B -->` — Recommendation Option 1 is enough until Gate B.
- Analysis header still shows Has API recommendation **no** (pre-decision framing); Settled + `00-run` + Design lock **yes** — do not treat header as open.
- Idea Open questions still assume Analyze may flip Custom meaning; Settled D1 already locks clock time.
- Task 2 could also say clear pending clock after successful save (UI section already says it).

**What looks solid:**

- Round-1 Fix ask verified: pending clock field map (UI + Task 2 acceptance/units); Edit outside ml 2×2 (Pattern 3 + UI + Task 6); Blocking Q1–Q4 settled; Overview `POST /api/graphql/baby`.
- Idea ↔ Design: Nap/Diaper clock Custom, Diaper above Pump + Nap-sized sibling, Pump 12rem = Breast, merged stop all chips, Done center, home + log, D4 ml save + Edit — aligned; Gate A/A2 skipped (simple).
- Analyze deep dive What/Why/How overall + 5 pieces; Spike matches Design (quickCare gains times).
- System design Overview present (Has API); Concepts teach optional backdate; patterns teach (not name-drop); OWASP Top 10 table complete; skeleton parity in UI + Tasks 3–4; Tasks 1–7 have acceptance + TDD red-first.
- API section clean (no deep re-review); DB skipped. Cross-cutting: Task 1 API acceptance present.

## Fix ask for my-design-workflow

**Status:** None — design review clean. Do not reopen settled API contracts or D1–D4.

## Round notes

- API contract review (round 1): **needs update** — additive optional times on `babyQuickCare` match naming and create-input patterns; Majors are SLEEP/auto-endNap semantics and incorrect idempotency wording vs `runBabyQuickCare`. DB skipped (Has DB = no). General design review not run in this Task.
- Design update (round 1 Fix ask): Applied all 5 items — `03-design.md` time truth table (IGNORE unused fields; auto-endNap = endedAt → occurredAt → now); idempotency = replay-by-id only; BREAST/FORMULA/PUMP_AMOUNT times IGNORE this pass; sequence alts for auth/workspace + `replayed: true`; OWASP replay note aligned. `04-tasks.md` Task 1 acceptance/tests for IGNORE, auto-endNap clock, same-id different-times replay. Gate A / D1–D4 unchanged.
- API contract review (round 2): **needs update** — Round-1 Fix ask verified in `03`/`04` (truth table, IGNORE, replay-by-id, sequence alts, Task 1 tests). Remaining Major: SLEEP end vs auto-endNap rows still disagree when `kind: SLEEP` closes an open nap with only `occurredAt` (shared pre-kind end path in `runBabyQuickCare`). Enhancement: Zod still validates present times that IGNORE later. DB skipped. General design review not run in this Task.
- Design update (round 2 Fix ask): Applied all 3 items — `03-design.md` Precedence line (SLEEP + open → SLEEP end wins; Auto-endNap non-SLEEP only); Semantics/Errors: present times Zod-validated before IGNORE; Auto-endNap row wording narrowed to non-SLEEP side effect. `04-tasks.md` Task 1 acceptance + units for open nap + SLEEP + only occurredAt → server now, and + endedAt → that end. Round-1 settled items not re-opened. Gate A / D1–D4 unchanged.
- API contract review (round 3): **clean** — Verified Round-2 Fix ask in `03-design.md` (Precedence; Zod-before-IGNORE; Auto-endNap non-SLEEP only) and `04-tasks.md` Task 1 (SLEEP end units + acceptance). Zero Critical/Major/Enhancement. DB skipped. General design review not run in this Task.
- Design review (round 1): **needs update** — API clean, DB skipped. Two Majors (pending clock → field map in Task 2/UI; Edit placement vs ml 2×2) + two Enhancements (close analysis Blocking; Overview path `/api/graphql/baby`). Did not deep-re-review API contracts. No edits to 01–04.
- Design update (general design review round 1 Fix ask): **Applied all 4 items** — `03-design.md` UI pending clock map (Nap idle → `occurredAt`; Nap running → `endedAt`; Diaper → `occurredAt` + Auto-endNap truth table on same request); Pattern 3 + UI Edit outside ml 2×2 (accessible name, ≥44px, no Custom overlap, flush grid intact); Overview path → `POST /api/graphql/baby`. `04-tasks.md` Task 2 acceptance + unit for three map cases; Task 6 Edit placement/a11y/hit acceptance + tests. `02-analysis.md` Blocking Q1–Q4 closed → Settled / `00-run` D1–D4. API contracts and D1–D4 not re-litigated. No production code.
- Design review (round 2): **clean** — Verified all 4 general Round-1 Fix ask items in `02`/`03`/`04`. Zero Critical/Major/Enhancement. API section left clean (no deep re-review). DB skipped. Nits only (Chosen placeholder; analysis Has API header framing; idea Open Q stale vs Settled; Task 2 clear-pending optional). No edits to 01–04. No production code.
