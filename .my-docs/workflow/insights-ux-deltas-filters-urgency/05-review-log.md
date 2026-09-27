# Review log: insights-ux-deltas-filters-urgency

**Updated:** 2026-09-27  
**Round:** 1  
**Mode:** main-thread (Task usage limit)

## Adversarial (tests)

**Result:** clean

| Check | Pass? | Note |
|-------|-------|------|
| MoM null / up / down / flat units | yes | `analytics-stats.test.ts` |
| MoM wire contract | yes | `column={overviewColumn}` + overview query |
| Loans due math + mixed fixture | yes | `loans-due.test.ts` |
| Urgency strip quiet zero + warning + link | yes | component unit |
| Baby Care/Growth multi-select map | yes | chrome-labels unit + dirty helper existing |
| Skeletons | yes | urgency placeholder; Baby triggerCount 3 |
| E2E Care→Sleep planned | yes | baby-care.spec updated (run in full test) |

Notes: No mock theater; due-soon excludes overdue at count helper.

## Quality

**Result:** clean

| Check | Pass? | Note |
|-------|-------|------|
| Matches Gate A2 HTML (MoM / Care+Growth / urgency) | yes | texts + stack order |
| Option 1 client compose | yes | no new API/DB |
| Shared RQ overview for MoM | yes | same query key as charts |
| Independent Care vs Growth filters | yes | `filterGrowthByKindChips` |
| Not color-only | yes | MoM text + arrow; urgency labels |
| Skeleton parity | yes | Loans urgency; Baby triggers |

**FYI:** On loans list query error, strip shows quiet zeros (ATF errors still alert). Acceptable for this chrome pass.

## Merged SPM

**SPM plan:** none — no API/DB/security/perf/memory lenses.

## Fix ask

(none)

## Round notes

- Main-thread adversarial + quality after smoke-pass.
- Ready for full `my-test-workflow` (e2e incl. Baby Care→Sleep).
