# TDD test-case review: per-app-workspace-share

**Result:** clean
**Round:** 1
**Updated:** 2026-09-21

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | edge | shareable keys accept money/baby reject notes | yes |
| 1 | real | migration/schema insert shape for grants | yes (partial — harness dependent) |
| 2 | edge | email normalize | yes |
| 2 | real | upsert then findByEmail | yes |
| 3 | real / edge | access matrix owner / grant / no-grant / personal | yes |
| 3 | real | list filter money vs baby | yes |
| 4 | real | Money verify false without grant | yes |
| 4 | real | Baby membershipVerified false without grant | yes |
| 4 | real | active forbidden without grant | yes |
| 5 | real / edge | validators + 404/409/403 | yes |
| 6 | real | grant toggle payload | yes (partial) |
| 7 | real | e2e add + split grants + block | yes (may be blocked without dual auth) |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Enhancement | 5 | PATCH owner grants rejected | `rejects_patch_when_target_is_owner` |
| Enhancement | 3 | cookie/active ungranted shared WS | already in Task 4 active — OK |
| Enhancement | 7 | document skip when no second storageState | assert in spec header |

No Critical/Major gaps for Gate B — Enhancement can be folded during Build.

## Real scenarios checked

- Happy path: add member with apps → list/active/feature allow
- User-visible failures: unknown email 404, forbidden active, non-owner 403
- Empty / loading / permission: owner-only members API; UI empty = owner + add

## Edge scenarios checked

- Invalid apps / empty apps array
- Duplicate member 409
- Member money-only cannot use baby workspace
- Personal + owner bypass

## Fix ask for Build (fold into tasks if needed)

1. Task 5: add unit `rejects_patch_when_target_is_owner`
2. Task 7: if dual auth missing, keep unit matrix green and mark e2e blocked explicitly

## Decision

**clean** — enough for Gate B; Enhancements during Build.

## Round notes

- Parent ran TDD review in-session (Task subagents unavailable).
