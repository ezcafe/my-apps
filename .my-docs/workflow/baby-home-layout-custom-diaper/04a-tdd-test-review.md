# TDD test-case review: baby-home-layout-custom-diaper

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-20

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Zod accepts valid ISO; DIAPER + `occurredAt` reaches handler | yes |
| 1 | real | SLEEP **start** (no open nap) + `occurredAt` → start time persisted | no |
| 1 | real / edge | SLEEP end + `endedAt`; open nap + SLEEP + only `occurredAt` → end = now | yes |
| 1 | edge | IGNORE unused times on BREAST/FORMULA/PUMP; Auto-endNap clock; bad ISO; same-id replay keeps first times | yes |
| 1 | edge | DIAPER (no open nap) + only `endedAt` → insert uses server now (`endedAt` IGNORE) | no |
| 2 | real | Pending clock map (Nap idle → `occurredAt`; Nap running → `endedAt`; Diaper → `occurredAt`) | yes |
| 2 | real | Modal set / change / clear; home/log vars include ISO when pending | partial |
| 2 | real | After successful save, pending clock cleared (design UI rule) | no |
| 3 | real | Live + skeleton row markers; Diaper Custom uses Nap height token | yes |
| 4 | real | Pump not equal 3-col with amount; skeleton pump sections; existing side/amount | yes |
| 5 | real | Merged `{endTitle} - {tapToStop}`; no stop subtitle; Done centered; update old asserts | yes |
| 6 | real / edge | Second Custom saves; Edit outside 2×2 + a11y/hit; flush grid; confirm-then-save | yes |
| 7 | real | Home row order, Custom time, ml+Edit, merged stop, log custom time; GQL helpers | partial |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Critical | 1 | SLEEP start (idle) + `occurredAt` | `runBabyQuickCare` / Yoga: no open nap + SLEEP + `occurredAt` → sleep row `occurredAt` equals that ISO |
| Major | 1 | DIAPER + only `endedAt`, no open nap | Assert diaper insert clock is server now; `endedAt` not applied to diaper |
| Major | 2 | Home/log save pins field map (not ISO alone) | Nap running + pending → vars have `endedAt` (not only `occurredAt`); Diaper → `occurredAt` |
| Major | 7 | E2E Custom time must assert request body | Capture quick-care / create body: Nap start → `occurredAt`; Nap end → `endedAt`; Diaper → `occurredAt` |
| Enhancement | 2 | Clear pending clock after success | Helper/component: after success flash, pending ISO null |
| Enhancement | 2 | Diaper kind still selectable with Custom sibling | Kind tile click still sets kind; Custom does not steal kind |

## Real scenarios checked

- Happy path: Task 1 DIAPER/`endedAt` end/map units + Tasks 2–6 UI plans strong; **SLEEP start + `occurredAt` missing** from red-first list.
- User-visible failures: Bad datetime Zod/BAD_REQUEST planned (Task 1). Auth/workspace unchanged — no new cases needed.
- Empty / loading / permission: Reuse existing pending/Done; N/A for new empty/permission surfaces.

## Edge scenarios checked

- Boundaries / invalid input: Valid vs garbage ISO; present-but-IGNORE fields still Zod-checked (design); SLEEP open + only `occurredAt` → now — planned. **DIAPER-only-`endedAt` IGNORE gap.**
- Concurrency / double-submit / idempotency: Same `clientRequestId` + different times → `replayed: true` + first write — planned (Task 1).
- Offline / partial data / race: N/A beyond existing replay store (Has DB no).

## Fix ask for Build

Concrete tests to add or strengthen:

1. **Task 1 — Critical:** Unit/Yoga `SLEEP start with occurredAt persists start time` — no open nap; assert inserted sleep `occurredAt` matches input (not server now).
2. **Task 1 — Major:** Unit `DIAPER with only endedAt ignores end for insert` — no open nap; diaper `occurred_at` ≈ now; unused `endedAt` not written as diaper time.
3. **Task 2 — Major:** Strengthen home/form test(s) so Nap **running** pending maps to **`endedAt`** in mutation vars (and Diaper/`Nap idle` to `occurredAt`) — not merely “ISO present”.
4. **Task 7 — Major:** E2E Custom time paths assert GraphQL/input body fields (`occurredAt` / `endedAt`) per map; update helpers so mocks accept those fields.
5. **Task 2 — Enhancement (optional):** Clear pending clock after successful save; kind tiles still work beside Custom.

Fold 1–4 into `04-tasks.md` Task 1/2/7 test checklists before Gate B.

## Round notes

- Design review clean; API truth table + Task 1 edge list are otherwise strong (IGNORE feed kinds, SLEEP precedence, Auto-endNap, replay-by-id, bad ISO).
- Existing chip/home/skeleton tests still expect old subtitle stop + `home-row-nap-diaper` — Task 5/3/7 already plan updates; keep those red-first.
- Prefer few strong asserts over more UI snapshots; Critical/Major above are enough to flip Result **clean** next round.
- **11:20** Parent folded Fix ask 1–4 into `04-tasks.md` Task 1/2/7 test checklists → Gate B (Build will implement red-first).
