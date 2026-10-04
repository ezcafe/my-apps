# Design review log: app-improvement-discover-ship

**Result:** clean  
**Round:** 2  
**Updated:** 2026-10-04  
**Has API:** yes · **Has DB:** no  
**Ship pick:** Decision 6 → backlog #1 Safe retry Idempotency

## API contract review (Has API = yes)

**Result:** clean  
**Skill:** api-and-interface-design (main-thread — Task usage limit)  
**Updated:** 2026-10-04

### Contract under review

- Additive optional `Idempotency-Key` on `POST /api/money/import/[kind]`
- Client opt-in on Investment commit + workspace members POST + Money wizard (existing server contracts)

### Checks

| Check | Pass? | Note |
|-------|-------|------|
| Additive / non-breaking | yes | Absent key unchanged |
| Typed I/O + edge validate | yes | `{ rows }` before claim; raw body for hash |
| Idempotency | yes | Same library + 409 codes; route id includes kind |
| Auth / workspace | yes | Existing requireMoneyContext / RLS |
| Error shape | yes | 400 / 409 via existing helpers |
| Sequence covers failures | yes | Replay + 409 alts |
| Tasks catch mistakes | yes | Task 3 route tests + ARCHITECTURE row |

### Findings

| Severity | Finding | Status |
|----------|---------|--------|
| Major | Need raw body + validate-before-claim + kind in route id | **fixed** in `03-design` / Task 3 |
| Enhancement | Client 409 handling | **fixed** in Design + Task 4 |
| — | No open Critical/Major/Enhancement | — |

## DB design review (Has DB = no)

**Result:** skipped  
**Has DB:** no — reuse `http_idempotency` only

## General design review

**Result:** clean

### Alignment

| Check | Pass? | Note |
|-------|-------|------|
| Gate A #1/#2 | yes | Ranked backlog + ship criteria; #1 is spender trust |
| Grill locks | yes | Spender-first; tokens demoted; S/M; no Gate C paperwork |
| Decision 6 | yes | Backlog #1 locked |
| System design / patterns | yes | Overview + shared library + client helper |
| Sequence + OWASP | yes | |
| UI / skeleton | yes | No layout change; N/A skeleton OK |
| Tasks TDD-ready | yes | Tasks 1–4 red-first |

### Findings

| Severity | Area | Finding | Status |
|----------|------|---------|--------|
| — | — | None open after Round 1 Fix ask applied | — |

## Fix ask for my-design-subflow

None — clean.

## Round notes

- Round 1 (API): needs update — raw body, validate-before-claim, kind in `actor.route`, 409 client behavior, sequence alts.
- Design update applied to `03-design.md` + `04-tasks.md`.
- Round 2: API + general **clean**. DB skipped. Ready for 04a → Gate B.
- main-thread fallback — API contract review + design-review — Task usage limit.
