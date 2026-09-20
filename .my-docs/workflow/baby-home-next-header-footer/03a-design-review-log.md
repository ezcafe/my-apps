# Design review log: baby-home-next-header-footer

**Result:** clean  
**Round:** 5  
**Updated:** 2026-09-20

## API contract review

**Result:** skipped  
**Updated:** 2026-09-20

**Has API = no** — birthday reuses `updateBabyProfile` only. Single-pump merge / Decision 8 withdrawn → no CreateBabyFeed validation change. Skip API lens.

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | — | — |

**API checklist:** N/A (skipped)

## DB design review

**Result:** skipped  
**Updated:** 2026-09-20

Has DB = no — no schema, migrations, or persistence query change.

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | — | — |

**DB checklist:** N/A (skipped)

## Findings (Round 5)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | None. Gate B approve + Decision 7 Option 2 lock verified; Option 1 + Gate B deltas coherent and buildable; single-pump withdrawn. | — |

**Gate B approve / Decision 7 lock check**

| Check | Status | Evidence |
|-------|--------|----------|
| Decision 7 → Option 2 locked | **Yes** | `01-idea` Settled; `02-analysis` piece 7 + Settled; `03-design` Chosen + title table EN/VI full-word; Task 6 acceptance + i18n asserts; `00-run` Gate B checked |
| Months formula | **Yes** | floor(`ageDays` / 30.4375) from `status.birthDate` — consistent across idea / analysis / design / Task 6 |
| birthDate source pinned | **Yes** | Status query only; invalidate on modal save; no chrome profile fetch (Round 3 Fix ask still closed) |
| Single-pump / Decision 8 | **Withdrawn** | Idea non-goal; Analysis piece 8 + Settled; Design Decision 8 void + Pump UI keep L/R; Task 7 withdrawn; Has API/DB no |
| Chosen design filled | **Yes** | Option 1 + Gate B deltas; D7 Option 2; D8 withdrawn |
| Blocking questions | **None** | `02-analysis` Blocking empty |

**Option 1 + Gate B deltas buildability**

| Delta item | Clear + buildable? | Notes |
|------------|--------------------|-------|
| Header next-only + nap subtitle (D1/D4) | **Yes** | Locked table + Task 1 |
| Age footers + drop helpers (D2/D3) | **Yes** | Pinned diaper/pump keys; breast from feed band; Task 2 |
| Shared pending footer + tie-break (D5/D6) | **Yes** | Breast L→R; pump **L → R → amount**; Task 3 |
| Nap status-fail fixed height | **Yes** | Task 4 |
| Skeleton parity | **Yes** | Task 5; pump L/R stubs stay |
| Birthday modal | **Yes** | Status-ready open guard; visit dismiss; `updateBabyProfile`; Task 6 |
| Status Row 4 icons | **Yes** | Locked map; pump = one `IconBabyPump` |
| Title with age months | **Yes** | **Option 2** full-word EN/VI; Task 6 |
| Single timed Pump | **Withdrawn** | Do not build Task 7 |

**Option 1 / D1–D6 coherence**

Still coherent for header/footer/errors + birthday/status/title. Pump stays L/R + amount; shared footer only (not one timer). No leftover single-pump or abbreviated `mo`/`th` title strings in live design/tasks.

**Analyze deep dive:** Pieces 1–8 present (What/Why/How). Piece 8 = keep L/R. Blocking = none.

**UI alignment:** Gate A/A2 skipped (simple). Idea ↔ Design aligned; no 01b drift to re-litigate.

**OWASP:** Table complete; birthday reuses auth’d mutation; no new CreateBabyFeed field rules.

**Tasks:** Tasks 1–6 ordered with acceptance + TDD; Task 7 withdrawn; checkpoints note Gate B / D7 Option 2.

**Nits (do not block):**

- Sequence diagram shows Save success / Not now but not invalid-date field error (UI section already covers inline errors).
- Mixed feed legs (breast + formula) icon choice not pinned — either glyph is fine.
- Modal `data-testid` not named — unit coverage in Task 6 is enough for lite profile.
- `02-analysis` Clarity check still has template prompts (no open Blocking asks).
- System design / Design patterns teach blocks absent as formal sections; architecture unchanged (UI chrome only) and “Patterns to reuse” + locked placement are enough for simple mode — prior rounds accepted same shape.

## Findings (Round 4 — history)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | None. Round 3 Fix ask closed; Gate B birthday/status/title + Option 1 buildable. | — |

**Round 3 Fix ask closure check** (still closed)

| # | Ask | Status | Evidence |
|---|-----|--------|----------|
| 1 | Birthday modal **When open** = status loaded OK (`!statusError`, `!statusLoading`/defined) + `status.birthDate == null` + visit not dismissed; Task 6 acceptance/tests | Closed | `03-design.md` Gate B birthday table + sequence; `02-analysis.md` piece 5; Task 6 |
| 2 | Title age **pinned** to status `birthDate` only + invalidate-on-save | Closed | Design title pin; Analysis piece 7; Task 6 |

## Findings (Round 3 — history)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Major | design | Gate B birthday **When open** omitted status-ready / `!statusError` guard. | Closed in Round 3 Fix → Round 4. |
| Enhancement | design | Title birthDate source “status or profile.” | Closed — pinned to status only. |

## Findings (Round 2 — history)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | — | None. Round 1 Fix ask items closed in `02` / `03` / `04`. | — |

## Findings (Round 1 — history)

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Major | design | Bottle header body unclear when birth band exists. | Closed Round 2. |
| Major | design | Diaper/pump “invent medical claims” escape hatch. | Closed Round 2. |
| Enhancement | analysis | Blocking questions left open after D1–D6 settled. | Closed Round 2. |
| Enhancement | design | Multi-owner pending tie-break missing. | Closed Round 2. |
| Enhancement | ui-ux | Footer swap missing polite live region. | Closed Round 2. |

## Fix ask for my-design-workflow

None. Round 5 clean.

## Round notes

- Round 1 — needs update (2 Major + 3 Enhancement) → design Update → Round 2 clean.
- Round 3 — Gate B birthday/status/title delta → needs update → Fix → Round 4 clean.
- Single-pump delta folded then **withdrawn**; Decision 8 + Task 7 void; Has API/DB no.
- Gate B approve (2026-09-20): Decision 7 → Option 2; Chosen filled; Round 4 clean marked stale.
- **Round 5** — Senior Architect verifier, fresh context; post–Gate B approve re-review. Has API/DB **skipped**. Confirmed D7 Option 2 locked, single-pump withdrawn, Option 1 + Gate B deltas coherent and buildable. Zero Critical / Major / Enhancement. Result **clean**.
- Generation ≠ verification; did not edit `01`–`04`.
- Next (parent): TDD re-check → Build → Smoke → review/test per Review profile **lite**.
