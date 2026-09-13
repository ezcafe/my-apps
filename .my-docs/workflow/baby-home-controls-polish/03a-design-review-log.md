# Design review log: baby-home-controls-polish

**Result:** clean  
**Round:** 4 (user authorized continue past round-3 cap)  
**Updated:** 2026-09-13

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | design | **Chosen design** still empty (Gate 2). Recommendation = Option B. | Fill after Gate 2. Not blocking. |
| Nit | design | Settled roll-up says breast `durationSec` sum; payload type comment also mentions pump. | Align one sentence (include or exclude pump in the sum). Optional. |

## Fix ask for my-design-workflow

None — design is clean for Gate 2 / build. Nits above are optional and do not block.

## Round notes

### Verified fixed from Round 3

| Round 3 item | Status in 03/04 |
|--------------|-----------------|
| Major — **2A one-row on all insert outcomes** (omit id **and** non-mergeable owned id: past 6h open / post-stop expired) | **Fixed** |

**Evidence in `03-design.md`:**

- Settled **First physical row (2A on every insert)** — omit id **or** non-mergeable owned id → one INSERT (or insert-then-update **new** row under one lock); one `wrote: "insert"`; one notify; non-mergeable id not an update target; bad id stays error.
- Option B matrix note **2A on insert outcomes**; sequence notes; Key failures **2A on insert**; API **First-write 2A** + merge checks; Example SQL 1; OWASP A04 note.

**Evidence in `04-tasks.md`:**

- Task **4** acceptance: 2A on every insert (omit **and** non-mergeable); past-6h + FORMULA → still one new row; failing-first unit/db for sticky/non-mergeable + `breastRunning` + `FORMULA`.
- Checkpoint A: 2A omit **and** sticky/non-mergeable; max-open + FORMULA still one row; adopt-on-insert still holds with 2A.

### Prior rounds (still hold)

| Item | Status |
|------|--------|
| Round 2 — max open-session window (6h) | Still fixed |
| Round 2 — client adopt-on-insert | Still fixed |
| Round 2 — ignore `feedSessionEventId` on non-feed | Still fixed |

### Round 4 scan

- Artifacts reviewed: `01-idea.md`, `02-analysis.md`, `03-design.md`, `04-tasks.md`, prior Fix asks in this log.
- **No new Critical / Major / Enhancement.** Only optional Nits (Chosen design for Gate 2; pump vs breast `durationSec` wording).
- OWASP A01–A10 table complete; A01/A04 still sound (workspace-scoped id, capped open window, 2A on every insert path, adopt-on-insert).
- UI / skeleton / a11y / ≥44 hits / ripple + reduced-motion contracts remain adequate; no new UI blockers.
- Clean = zero Critical, Major, Enhancement. Ready for Gate 2 (if needed) then `my-code-workflow`.
