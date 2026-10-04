# TDD test-case review: app-improvement-discover-ship

**Result:** ok  
**Round:** 1  
**Updated:** 2026-10-04  
**Prereq:** `03a-design-review-log.md` Result **clean**

## Planned / existing test cases reviewed

| Task | Scenario type | Test case | Covered? |
|------|---------------|-----------|----------|
| 1 | real | Helper mints non-empty key ≤128 + Content-Type + Idempotency-Key | yes |
| 1 | edge | Optional header merge keeps key | yes |
| 2 | real | Investment commit + members POST source includes Idempotency-Key | yes |
| 3 | real | Same key + body → one write + Idempotency-Replayed | yes |
| 3 | edge | Absent key → success, no claim | yes |
| 3 | edge | Key >128 → 400, no claim | yes |
| 3 | edge | Invalid body → 400 before claim | yes |
| 4 | real | Money wizard fetch includes Idempotency-Key | yes |
| 4 | edge | 409 → error path (manual/source note OK; unit optional) | yes — acceptance; soft if hard to unit |

## Gaps / Fix ask

None blocking. Optional Enhancement: one unit that maps 409 body to “not success” if a thin response helper is extracted — not required if wizards keep existing `!res.ok` throw.

## Concurrency / double-submit

- Client: busy flags where present + new key per attempt.
- Server: claim/replay on Money `[kind]`; Investment/members already server-ready.

## Auto-approve for Gate B?

**Yes** for test-case plan quality — human still owns Gate B (HITL blocking) for design + tasks + tests approve.

## Round notes

- Planned tests in `04-tasks.md` match Design contracts.
- main-thread fallback — TDD test-case review.
