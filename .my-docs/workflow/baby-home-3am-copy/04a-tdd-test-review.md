# TDD test-case review: baby-home-3am-copy

**Result:** needs more tests
**Round:** 1
**Updated:** 2026-09-13

**Note:** Task subagent unavailable (usage limit); parent ran this review in-session.

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | i18n keys for sentence headers EN+VI | partial — keys exist today as fragments |
| 1 | real | nap blend keys as full sentences | no |
| 2 | real | care-when sentence tails | partial — compact ago forms today |
| 2 | real | next-due sentence phrases | partial — `next in` fragments |
| 3 | real | breast/diaper empty + next + overdue headers | partial — asserts old middot + fragments |
| 3 | edge | bottle guide + progress when birth set | partial — old `recommend ~ml` |
| 3 | edge | no birth: bottle/nap without guide | partial — nap no recommend only |
| 3 | real | scan emphasis on facts | no |
| 4 | real | status one sentence (feed/sleep/diaper) | no — still label + summary · when |
| 4 | edge | open nap status sentence | no |
| 4 | edge | plain detail + emphasis on ml/kind/when | no |
| 5 | real | e2e header/status sentence expectations | no — still `next in` / recommend |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 3 | One-line sentence header, no middot | `breast header is full sentence without middot join` |
| Major | 3 | Scan emphasis on duration / ml / n of max | assert `font-medium` (or strong) around fact spans |
| Major | 3 | Birth unset: bottle/nap action sentences only | assert no ml/`n of` / sleep totals |
| Major | 4 | Status single sentence | `Last feed was…` / no `Last feed` title + middot |
| Major | 4 | Open nap sentence + emphasis | `napping now` + elapsed emphasized |
| Major | 5 | E2E expects sentence + scannable facts | update option-b assertions |
| Enhancement | 2 | Expanded “about N minutes/hours” if helpers change | unit on formatBabyCareWhen |
| Enhancement | 4 | Fallback when plain-detail mapper fails | still a full sentence |

## Real scenarios checked

- Happy path: birth set → bottle guide sentence + nap blend sentence; next-due breast/diaper; last feed sentence
- User-visible failures: status error sentence kept honest
- Empty / loading: empty action sentences; loading short

## Edge scenarios checked

- Boundaries / invalid input: birth unset (no fake guide)
- Concurrency / double-submit / idempotency: N/A (copy only)
- Offline / partial data: empty last-care; open sleep override path

## Fix ask for Build

Concrete tests to add or strengthen:

1. **Task 3** — Fail/update `baby-home.test.ts`: headers are full sentences, no ` · ` join, facts have `font-medium` (duration, ml, n/max, Left/Right, overdue).
2. **Task 3** — Birth unset: bottle “Pick an amount”, nap tap start/end; no recommend/ml progress.
3. **Task 4** — Status rows are one sentence; feed formula emphasizes ml; diaper emphasizes kind; open nap emphasizes napping now + elapsed.
4. **Task 1** — i18n samples EN+VI for new sentence keys (not telegram fragments).
5. **Task 5** — E2E: replace `next in` / `recommend ~` asserts with sentence patterns.

## Round notes

- Existing header tests lock the old Label · tip design — expect them to go red first (good TDD).
- Emphasis is visual weight only; tests can assert class names and still match text content.
