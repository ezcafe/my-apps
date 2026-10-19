# TDD test-case review: 20261015-kiosk-money-insights-eink

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-10-15  
**Prereq:** design-review clean (`03a` API clean · DB skipped · general clean)

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | `resolve(null)` defaults = weather + month_board + loans; new ids absent | yes — planned |
| 1 | real / edge | Prefs Zod accepts `money.insights_stats_grid` / `money.insights_chart`; rejects unknown; max = registry length | yes — planned (API contract) |
| 2 | real | Build A → 8 slots in metric-map order + labels | yes — planned |
| 2 | edge | MoM signed %; missing prior → `—` | yes — planned |
| 2 | real | Build B daily spend deltas from cumulative expense | yes — planned |
| 2 | edge | Disabled id → finance loaders not called; payload omitted | yes — planned |
| 2 | edge | No workspace budget → Budget slot unavailable/`—`; other A slots still present | **no** — acceptance only |
| 2 | edge | Null savings % → `—` (Design empty lock) | **no** |
| 2 / 5 | edge | Empty B series → soft empty (no error); chart region not mounted as “loaded series” | **partial** — Task 5 only mounts when non-empty |
| 3 | real | Footer copy + row/dither class structure (DOM) | yes — planned |
| 4 | real | Card A: 8 labels/values + footer strings | yes — planned |
| 4 | real | Skeleton A band structure / footer stub parity | yes — planned |
| 5 | real | Card B: 3 KPI labels + footer; chart region when series non-empty | yes — planned |
| 5 | real | Skeleton B mirrors live | yes — planned |
| 6 | real | Settings lists both ids; dashboard maps payloads → cards | yes — planned |
| 6 | real | E2E enable A; enable B; board chrome/footer | **partial** — does not lock **alone** (Design two-toggle) |
| 6 | real | Default `/kiosk` does not show A/B cells | partial — Task 1 unit; e2e not named |

**Existing harness skim:** `widget-registry.test.ts` (defaults weather + month_board + loans), `user-preferences*.test.ts` (Zod `kioskWidgets`), `month-board.test.ts` (gated load + no-budget pattern), `e2e/kiosk-layout.spec.ts` (Settings → prefs PATCH → `/kiosk`). No insights A/B modules yet.

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 2 | Partial money data (Design + Task 2 acceptance) | Unit: no workspace budget → Budget slot `unavailable`/`—`; Expenses…Loans + MoM still present in locked order. Name: `budget unavailable keeps other stats-grid slots`. |
| Major | 2 | Null savings empty lock | Unit: `savingsRatePct: null` → Savings % display `—` (not `0%` / crash). Name: `null savings rate shows em dash`. |
| Major | 2 or 5 | Empty B series soft empty | Unit: `series: []` → card renders 3 KPIs + footer; no error UI; chart mount skipped or empty placeholder. Name: `empty daily spend series is soft empty`. |
| Major | 6 | Independent toggles (Design UI / Gate A two cells) | E2E: enable **A only** → stats-grid footer/cell; chart cell absent. Enable **B only** → chart footer/cell; stats-grid absent. Name: `kiosk insights A alone` / `kiosk insights B alone`. |
| Enhancement | 6 | Default board omits A/B | E2E or dashboard unit: default enabled set → no insights-grid / insights-chart test ids (unit defaults already strong). |
| Enhancement | 5 | Visx-only lock | Keep acceptance / code review; no new fragile import-graph unit required. |

## Real scenarios checked

- **Happy path:** Registry + Zod new ids, A/B mappers, card labels/footer, skeleton parity, Settings list + dashboard wire, e2e enable path — mostly named.
- **User-visible failures:** Prefs unknown id / max → Zod (Task 1). Auth/rate-limit unchanged — OK not to re-test. Soft empty for B series **under-specified**.
- **Empty / loading / permission:** Skeleton A/B planned. No-budget + null savings **missing** as named reds. Permission N/A beyond existing prefs auth.

## Edge scenarios checked

- **Boundaries / invalid input:** Unknown widget id + max length planned (API). MoM missing prior planned.
- **Concurrency / double-submit / idempotency:** Prefs upsert unchanged — OK to skip dedicated test (API Deferred).
- **Offline / partial data / race:** Gated skip-load planned. **No workspace budget** and **empty series** need named units (mirror month_board 04a pattern).

## Fix ask for Build

Fold into `04-tasks.md` TDD bullets (prefer few strong reds):

1. **Task 2 (Major):** `it("budget unavailable keeps other stats-grid slots")` — fixture without workspace budget → Budget `—`/unavailable; other 7 slots still ordered/labeled.
2. **Task 2 (Major):** `it("null savings rate shows em dash")` — `savingsRatePct: null` → Savings % value `—`.
3. **Task 2 or 5 (Major):** `it("empty daily spend series is soft empty")` — `series: []` → KPIs + footer; no error; chart not treated as loaded series.
4. **Task 6 (Major):** E2E `kiosk insights A alone` and `kiosk insights B alone` — each toggle on without the other; assert matching footer/cell (`Money` / `Insights · this month`) and absence of the other widget.

**Keep as-is (already strong enough):** Task 1 defaults + Zod accept/reject/max; Task 2 order/MoM/daily-spend/gated skip; Task 3 footer/structure DOM; Task 4/5 card + skeleton parity; Task 6 settings list + dashboard map.

**Explicit non-goals (OK):** Visual pixel diff vs refs (manual checkpoint); CLS for non-default prefs; 401/429 prefs re-test; visx import-graph unit; PATCH idempotency unit.

## Round notes

- Mapped against Design metric map, visual locks A/B, footer copy, defaults off, API enum ids `money.insights_stats_grid` / `money.insights_chart`, and Task acceptance.
- Strongest planned reds: Zod/registry + gated loaders + MoM + card/skeleton labels.
- Highest remaining risk before Gate B: **partial A data (no budget / null savings)** and **B empty series** without named failing tests; e2e must prove **independent** A vs B toggles (not only both on).
- No production code in this stage. Parent: fold Fix ask into `04-tasks.md` → Gate B (or re-skim 04a if tasks change a lot).
