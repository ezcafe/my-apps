# TDD test-case review: 20261015-kiosk-money-insights-heatmap

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-10-15  
**Prereq:** design-review clean (`03a` API clean · DB skipped · general clean)

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | `resolve(null)` includes `money.insights_heatmap` **and** `money.month_board`; excludes A/B insights | yes — planned |
| 1 | real / edge | Prefs Zod accepts `money.insights_heatmap`; rejects unknown; max = registry length | yes — planned (API contract) |
| 1 | edge | Stored non-null set **not** migrated / injected with heatmap | **no** — Design/API: defaultEnabled for null prefs only |
| 2 | real | Build from fixture daily counts → hero, 4 KPIs (order/labels), cell levels match locks | yes — planned |
| 2 | edge | Empty window → hero 0, streaks 0, peak 0, avg `0.0`, all cells level 0, length ≈ 365 | yes — planned |
| 2 | edge | Streak edges (gap breaks longest; today inactive → current 0; income-only day active) | yes — planned |
| 2 | edge | Bucket boundaries (0 / 1 / 2 / 3 / 4+) | yes — planned |
| 2 | edge | Skip loads when id disabled (spy never called) | yes — planned |
| 2 | edge | Sparse grain → mapper fills missing calendar days as `txCount: 0` / level 0; full window length | **no** — Design contract |
| 2 | edge | Average display one decimal on non-zero (e.g. `2.5`) | partial — empty `0.0` only |
| 3 | real | Footer year copy; A/B still “this month” if shared | yes — planned |
| 3 | real | Cell level classes/attrs expose 0–3 | yes — planned |
| 4 | real | Card renders hero + 4 KPI labels/values + footer from fixture | yes — planned |
| 4 | real | Empty fixture → zeros + level-0 grid (not error UI) | yes — planned |
| 4 | real | Skeleton band structure / footer stub parity | yes — planned |
| 4 | real | Dashboard renders heatmap when payload present; omits when absent | yes — planned |
| 5 | real | E2E heatmap toggle round-trip Settings → `/kiosk` | yes — planned |
| 5 | real | Defaults path includes heatmap + month_board; does not require A/B on | partial — month_board coexistence after heatmap off not named |
| 5 | edge | Heatmap off + month_board on → month glance remains (Grill edge) | **no** |

**Existing harness skim:** `widget-registry.test.ts` (defaults weather + month_board + loans; no-inject month_board pattern; A/B omitted), `user-preferences*.test.ts` (Zod `kioskWidgets`), `month-board.test.ts` / `insights-chart.test.ts` (gated load + skip), `e2e/kiosk-layout.spec.ts` (Settings → prefs PATCH → `/kiosk`). No `insights-heatmap*` modules yet.

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 1 | Null-prefs-only defaults | Unit: `resolveKioskWidgets(["money.month_board","loans.payments"])` stays that set (does **not** inject `money.insights_heatmap`). Name: `resolveKioskWidgets keeps stored set without injecting insights_heatmap`. |
| Major | 2 | Sparse calendar fill | Unit: fixture with only a few dated counts → payload `cells.length` ≈ window days; missing dates level 0. Name: `sparse daily grain fills missing days as level 0`. |
| Major | 5 | Coexistence with month_board | E2E (or dashboard unit): heatmap toggled off → heatmap cell gone **and** month_board still visible when enabled. Name: `heatmap off keeps month_board on /kiosk`. |
| Enhancement | 2 | Avg one-decimal non-zero | Unit: total txs / days → average string/value `2.5` (or one decimal). Name: `average per day uses one decimal`. |
| Enhancement | 2 | Explicit `range.from` / `range.to` | Unit: end = today (fixture TZ); span ≈ 365 inclusive. Covered partly by length ≈ 365. |
| Enhancement | 4 | No empty-copy line | Empty card unit already “not error UI”; optional assert absence of empty-state copy string. |

## Real scenarios checked

- **Happy path:** Registry + Zod new id, mapper hero/KPIs/cells, footer year copy, card + skeleton + dashboard wire, e2e toggle — mostly named.
- **User-visible failures:** Prefs unknown id / max → Zod (Task 1). Auth/rate-limit unchanged — OK not to re-test.
- **Empty / loading / permission:** Empty year zeros + level-0 grid planned (Task 2/4). Skeleton parity planned. Permission N/A beyond prefs auth.

## Edge scenarios checked

- **Boundaries / invalid input:** Unknown widget id + max length planned. Bucket 0/1/2–3/4+ planned. Streak gap / today inactive / income-only planned.
- **Concurrency / double-submit / idempotency:** Prefs upsert unchanged — OK to skip dedicated test (API Deferred).
- **Offline / partial data / race:** Gated skip-load planned. **Sparse grain fill** and **stored no-inject** need named units (mirror month_board 04a pattern).

## Fix ask for Build

Fold into `04-tasks.md` TDD bullets (prefer few strong reds):

1. **Task 1 (Major):** `it("resolveKioskWidgets keeps stored set without injecting insights_heatmap")` — stored set without heatmap stays unchanged (null-prefs-only defaults).
2. **Task 2 (Major):** `it("sparse daily grain fills missing days as level 0")` — sparse `{ date, txCount }[]` → full window cells; gaps level 0.
3. **Task 5 (Major):** E2E/unit `heatmap off keeps month_board on /kiosk` — disable heatmap → heatmap absent; month_board still present when enabled.
4. **Task 2 (Enhancement):** `it("average per day uses one decimal")` — non-zero avg formats to one decimal.

**Keep as-is (already strong enough):** Task 1 defaults + Zod accept/reject/max; Task 2 happy/empty/streaks/buckets/gated skip; Task 3 footer/levels DOM; Task 4 card + empty + skeleton + dashboard map; Task 5 toggle round-trip + no A/B default-on.

**Explicit non-goals (OK):** Visual pixel diff vs `refs/money-insights-heatmap.png` (manual checkpoint); week-start / column-pack pixel lock (Design Deferred); CLS for non-default prefs; 401/429 prefs re-test; PATCH idempotency unit; spend-as-intensity (out of scope).

## Round notes

- Mapped against Design metric map, dither buckets, footer Money / Insights · last year, defaults A (heatmap + month_board on; A/B off), Grill edges (income-only; empty year; heatmap off keeps month), API enum id `money.insights_heatmap`.
- Strongest planned reds: Zod/registry + gated loader + streak/bucket locks + empty year + card/skeleton labels.
- Highest remaining risk before Gate B: **stored prefs no-inject** (defaultEnabled true), **sparse day fill**, and **month_board coexistence** after heatmap off.
- No production code in this stage. Fix ask folded into `04-tasks.md` (Tasks 1, 2, 5) → Gate B.
