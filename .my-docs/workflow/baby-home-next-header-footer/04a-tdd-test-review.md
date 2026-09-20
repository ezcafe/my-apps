# TDD test-case review: baby-home-next-header-footer

**Result:** needs more tests (Gate B Task 6; Task 7 single pump withdrawn)  
**Round:** 1 · Gate B deltas noted 2026-09-20 · single-pump withdraw 2026-09-20  
**Updated:** 2026-09-20

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Nap header body from sleep next-due; chip subtitle blank / elapsed-only | yes — planned |
| 1 | real / edge | Bottle with birth band → heading body empty; without band → empty/pick key | yes — planned |
| 1 | real | Pump heading body empty / lead only | yes — planned |
| 1 | real | E2E breast/diaper next/overdue still pass; nap next on **header** not chip | yes — planned |
| 2 | real | Bottle footer has ml + progress; header does not | yes — planned |
| 2 | real | Nap footer uses blend key; header does not when next exists | yes — planned |
| 2 | real | Breast footer feed band min/max for fixed age | yes — planned |
| 2 | real | Diaper/pump footer stage key for fixed ageDays (e.g. day 0 → `.newborn`) | yes — planned |
| 2 | real | Helper keys unused/removed; pinned footer keys exist EN+VI | yes — planned |
| 2 | edge | No birth / null age → empty diaper/pump footer (no tip) | **no** — acceptance only |
| 3 | real | breast_l pending → recovery under breast **section** footer | yes — planned |
| 3 | real | pump_amount pending → one pump recovery; age tip suppressed | yes — planned (pending > tip) |
| 3 | real | too-old → Activities + Discard on wrap row | yes — planned |
| 3 | real | E2E pending under section; retry/discard still work | yes — planned |
| 3 | edge | Multi-owner tie-break (breast L→R; pump **L → R → amount**) | yes — planned (restored) |
| 3 | edge | Footer recovery/status-fail polite live region (`aria-live` / `role="status"`) | **no** — acceptance only (was gap; still fold) |
| 4 | real | Nap status-fail → fixed shell + footer fail+retry (not tall box) | yes — planned |
| 4 | real | Fail shell keeps `BABY_HOME_BIG_CONTROL_MIN_H` | yes — planned |
| 4 | edge | Pending + nap status-fail → pending wins (footer priority) | **no** — acceptance only |
| 5 | real | Skeleton fails until footer stubs (header → controls → footer) | yes — planned |
| 5 | real | Pump skeleton stays L/R pair + amount (+ footer stub) | yes — planned (keep current shape) |
| 5 | real | E2E smoke: next headers, bottle progress in footer, pending inline, nap fail height | yes — planned (keep assert targets sharp) |
| 6 | real / edge | Birthday modal / status icons / title age | yes — planned Task 6 |
| 7 | — | Single timed Pump | **withdrawn** — do not plan reds |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 3 | Tie-break when two owners pending in one section | Unit: seed pending for both `breast_l` and `breast_r` → one recovery, `data-pending-owner="breast_l"`. Pump: `pump_l` + `pump_r` + `pump_amount` → owner `"pump_l"`. |
| Major | 4 | Pending beats status-fail in same nap footer slot | Unit: nap status error **and** nap pending seed → recovery present; **no** `home.napCheckFailed` / fail-retry-only footer; age tip still suppressed. |
| Major | 2 | Unknown / null age → no diaper or pump tip | Unit: `birthDate: null` (or ageDays unset) → diaper and pump sections have **no** `home.footer.diaper.*` / `home.footer.pump.*` tip text; bottle/breast rules unchanged. |
| Enhancement | 3 | Screen reader announcement when footer swaps to recovery/fail | Unit: recovery (or nap fail) markup includes `aria-live="polite"` or `role="status"` wrapping the message+actions. |

## Real scenarios checked

- **Happy path:** Next-only headers (Task 1); age footers + drop helpers (Task 2); shared section pending (Task 3); nap fail shell+footer (Task 4); skeleton parity (Task 5); birthday/status/title (Task 6). Pump L/R stays current (no Task 7).
- **User-visible failures:** Pending recovery + too-old wrap (Task 3); nap status-check fail in footer (Task 4). Retry/discard kept in e2e.
- **Empty / loading:** Bottle empty/pick when no band (Task 1); empty next headers (implied via existing next/empty keys); skeleton footer stubs (Task 5). Null-age empty diaper/pump tip is the main empty gap (above).

## Edge scenarios checked

- **Boundaries:** Bottle with/without band (planned); diaper/pump stage map for a known age (planned); null age tip empty (**gap**).
- **Concurrency / races:** Not a new write surface beyond existing mutations; mid-flight quiet recovery stays on existing pending tests — keep green.
- **Partial data / ownership:** Single-owner section footer planned; **multi-owner tie-break** and **pending > status-fail** remain important edges.

## Fix ask for Build

Concrete tests to add or strengthen (fold into `04-tasks.md` Task 2 / 3 / 4 / 6 TDD):

1. **Task 3 — tie-break (Major):** `it("breast shared footer picks breast_l over breast_r when both pending")` — one recovery, `data-pending-owner="breast_l"`. Pump: `pump_l` over `pump_r` over `pump_amount`.
2. **Task 4 — footer priority (Major):** `it("nap pending recovery wins over status-check fail in footer")` — pending visible; fail copy absent; tip absent.
3. **Task 2 — null age (Major):** `it("diaper and pump footers stay empty when birth age unknown")` — no stage tip line.
4. **Task 3 — live region (Enhancement):** Assert polite live region / `role="status"` on recovery (and nap fail) footer content.
5. **Task 6 — Gate B birthday/status/title:** keep Task 6 reds.

**Task 7 single-pump reds: withdrawn** — do not add one-timer / duration-only `pump` / drop L/R UI tests.

Keep the rest of Tasks 1–5 planned reds. Prefer updating existing under-chip pending / bottle-header progress asserts over adding duplicate weak cases. Keep existing Pump L/R e2e asserts green.

## Round notes

- Design-review Result **clean** (round 2 / 4) — **stale** after single-pump withdraw; re-run after design-update.
- Existing suite still assumes under-chip helpers, under-chip pending (nap), bottle **header** progress, and **Pump L/R** — Build must rewrite chrome asserts (Tasks 1–5); **keep** Pump L/R control asserts.
- Prefer few strong tests: ownership, priority, empty tip, live region, Task 6 birthday/status/title.
- No product code in this stage. Parent: design-review → 04a re-pass → Gate B (Decision 7 + approve).

### Gate B delta (2026-09-20) — new tests needed

User Gate B added birthday / status icons / title. Prior Fix ask (Tasks 2–4) stays folded. **Additional TDD reds** in **Task 6**.

| Area | Must-have reds (also listed under Task 6) |
|------|--------------------------------------------|
| Birthday | No `home.birthDatePrompt` strip; modal open when unset + not dismissed; Not now dismisses visit; save uses existing mutation |
| Status icons | feed/sleep/diaper/pump lines render locked icon components (feed empty → bottle; breast last → breast) |
| Title age | `home.titleWithAge` when birthDate known; `home.title` when unknown; months floor helper; EN+VI key present |
| Chrome / CLS | Skeleton or page title stub if layout changed |

### Gate B delta: single pump — WITHDRAWN (2026-09-20)

User rejected merging Pump L/R. **Remove** Task 7 single-pump test gaps:

| Area | Status |
|------|--------|
| UI one timed chip / no L/R | **Withdrawn** |
| Pending owner `pump` + timed→amount | **Withdrawn** — restore L→R→amount |
| Option 1 validator duration-only `pump` | **Withdrawn** |
| Display map legacy L/R → Pump | **Withdrawn** (not in scope) |
| Skeleton one big chip | **Withdrawn** — keep L/R stubs |
| E2E single Pump timer | **Withdrawn** — keep Pump L/R flows |

**Fix ask for next TDD review / Build:** Confirm Task 6 reds + Tasks 2–4 gaps; keep Tasks 1–5 reds; **no** Task 7 single-pump reds.

**Result note:** needs more tests for Gate B Task 6 (+ Tasks 2–4 gaps). Task 7 withdrawn. Re-run 04a after design-review clean on withdraw delta.
