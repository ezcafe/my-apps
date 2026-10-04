# Design review: money-new-vnd-amount-suggestions

**Round:** 1  
**Mode:** simple  
**Result:** clean

## API contract review

**Result:** skipped — Has API = no

## DB design review

**Result:** skipped — Has DB = no

## General design review

| Check | Status | Note |
|-------|--------|------|
| Idea Outcome alignment | yes | Hide recent for VND while typing; show `000` / `000.000`; append |
| Decision 1 honored | yes | Option 1 append; plain digits fill |
| UI locks vs idea #1/#2 | yes | Amount + suffix chips under Amount; recent deferred for VND |
| System design / patterns | yes | Pure helper + recentSlot branch |
| Sequence | yes | VND vs recent paths |
| OWASP | yes | Client-only; parse trap called out |
| Tasks TDD-ready | yes | Helper units + wire + parse regression |
| Grill frontier | yes | Empty; no re-open |

### Findings

None Critical / Major / Enhancement.

### Fix ask

None.

## Round notes

- main-thread fallback — design review (usage limit after wait 5s + one retry)
- Verified against `01-idea` / `02-analysis` / `03-design` / `04-tasks` without rewriting them
