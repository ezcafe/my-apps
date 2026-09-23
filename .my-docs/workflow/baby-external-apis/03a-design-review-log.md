# Design review log: baby-external-apis

**Result:** clean
**Round:** 3
**Updated:** 2026-09-22
**Note:** Re-review after Decision 3 Option 2 + Decision 4 Option 1 (`mny_`). Main-thread (Task usage limit).

## API contract review (when Has API)

**Result:** clean
**Updated:** 2026-09-22

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | naming | `mny_` prefix for Baby-only tokens | Document in Help/BABY_API — Task 5 |
| Nit | PATCH | Optional grant edit without rotate | Tasks allow; MVP create-only OK if PATCH slips |

**API checklist:** typed `apps[]` ✓ · one error shape ✓ · edge validation via `parseShareableWorkspaceAppKeys` ✓ · additive GraphQL ✓ · grant gates Money/Baby ✓ · idempotency unchanged ✓ · repo patterns (member grants + Bearer) ✓

**Contract verdict:** POST tokens takes `apps`; Bearer `mny_` allowed per grant; legacy `appKey` alias OK; no `bby_`.

## DB design review (when Has DB)

**Result:** clean
**Updated:** 2026-09-22

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | null apps | Nullable + derive from `app_key` vs NOT NULL after backfill | Prefer derive helper `tokenApps(row)` — Task 1 |

**DB checklist:** additive `apps` jsonb ✓ · backfill money/baby ✓ · keep `app_key` ✓ · sav/inv legacy ✓ · tenant via workspace_id ✓ · design↔schema match ✓

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | ui-concept | Gate A2 screenshot is App dropdown baseline | Re-capture after Build with checkboxes |
| Nit | tasks | PATCH grants optional | Fine for MVP |

No Critical / Major / Enhancement. Aligns with idea Outcome (revised), 01b checkboxes, analysis direction after Decision 3. System design + patterns teach grant model. OWASP present. Tasks TDD-ready. Reuses `SHAREABLE_WORKSPACE_APP_KEYS`.

## Fix ask for my-design-workflow

(none — clean)

## Round notes

- Round 1 (single-app `bby_`) voided by Decision 3.
- Round 2 design update; Decision 4 confirmed Option 1.
- Round 3: clean → TDD refresh → Gate B.
