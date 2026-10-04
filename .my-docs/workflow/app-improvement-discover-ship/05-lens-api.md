# API lens: app-improvement-discover-ship

**Result:** clean  
**Skill:** api-and-interface-design  
**Updated:** 2026-10-04

## Checks

| Check | Pass? | Note |
|-------|-------|------|
| Additive contract | yes | Optional Idempotency-Key on `[kind]`; absent unchanged |
| Validate before claim | yes | `{ rows }` check before `beginIdempotencyRequest` |
| Route id includes kind | yes | ``POST /api/money/import/${kind}`` |
| Error codes | yes | 400 too-long/bad body; 409 in_progress/body_mismatch via library |
| Client headers | yes | Investment commit, members POST, Money wizard |
| Docs | yes | ARCHITECTURE routes table updated |
| Tests | yes | Route smokes + wiring source tests |

## Findings

None.
