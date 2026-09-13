# Design review log: baby-home-redesign

**Result:** clean
**Round:** 6
**Updated:** 2026-09-12

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Nit | Next-due / method type | `babyNextFeedDue` types `lastFeedMethod` as a closed union ending in `null`, while the comment and Task 1b require unknown runtime strings → `feedDefaultMinMs`. Call sites may cast instead of normalize. | Optional: widen the input to `string \| null` (or a small normalize helper) so unknown cannot be cast away. Mapping table + unit cases already cover behaviour. |
| Nit | Next-due / home clock | Tasks 8 and 9 both require the shared ≥30s clock. Same file, sequential tasks — fine — but neither names which task owns creating it vs reusing it. | Optional one-liner: Task 8 introduces the shared clock; Task 9 reuses it. Non-blocking. |

## Fix ask for my-design-workflow

None. Round 5 Fix ask is satisfied. Nits above do not block.

## Round notes

- **Focus:** Re-verify Round 5 Fix ask (method mapping, 30s tick, test mapping, i18n `{duration}`, over-3y hold-last, skeleton subtitle, `.at` anchors). Spot-check Option B contracts. Re-read next-due in `01`/`03` and Tasks 1b / 6 / 8 / 9 / 11 / 12 + Checkpoint C.
- **Verified from Round 5:**
  - **Method mapping:** `03` table + Task 1b — `pump` / null / unknown → `feedDefaultMinMs`; newborn breast/formula split unchanged.
  - **30s tick:** `03` home-clock note + Tasks 8/9 acceptance — shared visible ≥30s timer + `visibilitychange`; breast elapsed may stay ~1s.
  - **Test mapping:** `03` test-plan unit/markup/e2e rows; Task 8/9 markup verification; Task 12 three `01` next-due cases; Checkpoint C explicit map.
  - **i18n:** EN/VI examples with shared `{duration}`; Task 6 requires same var name; `formatBabyNextDueLabel` typed with `{ duration }`.
  - **Over-3y:** `01` row + `03` band + Task 1b hold-last `ageDays >= 1095` + unit case.
  - **Skeleton:** Tasks 8/9 idle subtitle placeholder height; Task 11 confirm checkbox.
  - **Anchors:** clocks use `lastFeed.at` / `lastDiaper.at` / `lastSleep.endedAt` (not `occurredAt` on TimelineItem).
  - **01 pointer:** frequency day bounds → `03` / `lib/baby-next-due.ts`; separate from ml `baby-age-guide`.
  - **Sub-minute `0m`:** documented as accepted.
- **Option B spot-check:** `babyHomeQuickStatus` read shape, `babyQuickCare` input/output, nap lock, pending/idempotency/replay wording unchanged; next-due stays client-only display on existing status fields.
- **Why clean:** Zero Critical / Major / Enhancement. Two residual Nits only.
