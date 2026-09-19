# Idea: Baby home — timer status, inline error (remove pending bar)

## Problem

On baby home, tapping Breast/Pump timed start writes a pending record immediately and shows the bar **"We could not confirm your last save."** even while the request is still in flight. That copy sounds like failure during a normal start. Caregivers already have the timer chip as status; a separate pending bar is noisy and wrong for start.

## User / audience

Parents/caregivers using baby home quick care (especially Breast L·R / Pump L·R timed chips).

## Outcome

- **Remove** the home pending confirmation bar (`home.pendingTitle` / Retry / Discard strip) as the primary feedback for in-flight and failed quick-care on these triggers.
- **Use the timer chip as status** while saving / running (existing selected + elapsed / tap-to-stop chrome).
- **Show errors below the trigger button** that was pressed (inline under that chip), not in a page-level pending banner.
- Keep safe retry/idempotency behavior in storage if still needed — but do not surface the misleading pending title bar on start.

## Metric

Starting Left (idle) no longer flashes “We could not confirm your last save.” Failure shows under the pressed chip; success shows running timer without that bar.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes (tiny tweak on existing chips)
- **Copy/token-only?** no (layout: remove bar; error placement under chip)

## 80/20 UI (day-to-day)

### Main user goals

- Start/stop breast or pump timer quickly
- Know the timer is running
- Know when save failed and how to recover

### Vital few (high-impact ~20%)

- Timer chip as live status
- Clear inline error under the trigger on failure
- No false “could not confirm” on successful/in-flight start

### Can defer (~80%)

- Redesigning all care feedback (bottle/diaper/sleep) unless the same pending bar shares the same bug path and a one-pattern fix covers them
- New pending UX elsewhere (Activities)

## Scope

- Baby home quick-care pending UI for timed care triggers (at least Breast/Pump L·R; align other quick chips if they share the same bar)
- Inline error under the pressed trigger
- Tests covering: no pendingTitle on successful/in-flight start; error under chip on ambiguous failure

## Non-goals

- Changing server saveBreast / start-is-local-only rules
- Redesigning the whole home layout
- New auth or schema

## Constraints

- Match existing clean-minimal / DESIGN_GUIDE tokens
- Skeleton parity if layout above the fold changes
- Keep idempotent clientRequestId / pending storage semantics unless design proves they can stay fully invisible

## Open questions

- Should bottle / diaper / sleep failures also move under their trigger in the same change, or only timed Breast/Pump chips first?
