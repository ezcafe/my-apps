# TDD test-case review: 20261012-kiosk-widgets

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-10-13  
**Prereq:** design-review clean (`03a` API/DB/general)

## Planned / existing test cases reviewed

| Task | Scenario type (real / edge) | Test case | Covered? |
|------|-----------------------------|-----------|----------|
| 1 | real | Zod accepts valid nested `kioskLayout` | yes — planned |
| 1 | edge | Zod rejects `columns: 5` / bad mode / unknown `focusWidgetId` | yes — planned |
| 1 | real | Layout-only PATCH writes `kiosk_layout` (no silent no-op) | yes — planned (critical vs today’s early-return) |
| 1 | real | Resolve null/missing layout → grid-1 | yes — planned |
| 1 | edge | `resolveFocusWidgetId` disabled/stale → first enabled; zero → null | yes — planned (also Task 4) |
| 1 | edge | Nested replace: key present but missing field → `400` | **no** |
| 1 | edge | Omit `kioskLayout` on widgets-only PATCH → stored layout unchanged | **no** |
| 1 | edge | Known-but-disabled `focusWidgetId` accepted at PATCH | partial — implied by “unknown rejected”; not named store-ok |
| 2 | real | `resolve(null)` / `DEFAULT_KIOSK_WIDGETS` = weather + month_board + loans | yes — planned (existing test will go red) |
| 2 | edge | Stored non-null widget set **not** migrated to new defaults | **no** |
| 2 | real | Old small money ids still in registry / Zod max length | partial — Zod length follows list; togglable not named |
| 3 | real | Mapper/loader builds `monthBoard` scalars + `budgetChart` | yes — planned |
| 3 | edge | No workspace-scope budget → `budgetChart: null`; metrics still set | yes — planned |
| 3 | edge | `loansMinor` = `monthlyObligationMinor`; `billsMinor` = bills-ledger expense | yes — planned |
| 3 | real | `money.month_board` disabled → **no** month-board finance fetch | **no** |
| 4 | edge | `effectiveKioskColumns(4,2)→2`; `(3,4)→3` | yes — planned |
| 4 | edge | Focus fallback + zero enabled (overlap Task 1) | yes — planned |
| 5 | real | Focus control visibility: fullscreen+2+ / grid / 1 widget | yes — planned |
| 5 | real | Settings save layout persists | deferred → Task 8 (vague) |
| 6 | real | Fullscreen focus cell; grid N cells; `--kiosk-pref-cols` | yes — planned |
| 6 | real | Month money card: six labels + empty chart + linear progress | yes — planned |
| 6 | real | Zero enabled → empty enable prompt | **no** |
| 6 | real | Money off → primary content = first enabled non-money (Gate A #2) | **no** |
| 7 | real | Skeleton default-only: three cells + month-board slots | yes — planned (replace band-order test) |
| 7 | edge | `loading.tsx` does not read prefs/DB | **no** — acceptance only |
| 8 | real | Settings → `/kiosk` layout match + month board glance | **partial** — “spec fails until wired”; no concrete asserts |

**Existing harness skim:** `widget-registry.test.ts` (defaults still old net_month), `user-preferences*.test.ts` (no `kioskLayout`), `kiosk-dashboard.test.ts` (band order / net widgets), `kiosk-dashboard-skeleton.test.ts` (band markers). No `/kiosk` e2e today. No loader unit for month board.

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Critical | 8 | User path Settings layout → reopen `/kiosk` | E2E: set grid cols=2 (or fullscreen + focus) → save → `/kiosk` shows matching mode/cols/focus cell; default widgets include month board labels (Expenses/Income or empty-chart + metrics). Name: `settings kiosk layout persists on /kiosk`. |
| Major | 3 | Widget-gated loader | Unit (mock deps): `money.month_board` **off** → `listMoneyBudgets` / month analytics / bills+loans month-board paths **not** called; `widgets.monthBoard` absent. On → called once. |
| Major | 6 | Empty board | Dashboard unit: `enabledWidgets: []` → enable-prompt copy (or Settings link text); no money/loan cells. |
| Major | 6 | Gate A #2 money off | Dashboard unit: enabled = weather + loans only → primary/first content is non-money (weather or loans); no Expenses/Income month-board block. |
| Major | 2 | Null-prefs-only defaults | Unit: `resolveKioskWidgets(["money.net_month","loans.payments"])` stays that set (does **not** inject `money.month_board`). |
| Major | 1 | Omit key vs nested replace | (a) Zod: `{ kioskLayout: { mode: "grid", columns: 1 } }` (no focus) → fail. (b) Service: seed layout fullscreen → PATCH `{ kioskWidgets: [...] }` only → `kioskLayout` still fullscreen. |
| Enhancement | 1 | Disabled focus stored | PATCH `focusWidgetId: "money.net_month"` while widgets omit it → persist id; board `resolveFocusWidgetId` still falls back. |
| Enhancement | 7 | Loading purity | Source/unit: `loading.tsx` import graph has no `getUserPreferences` / `db` await (string or static import check). |

## Real scenarios checked

- **Happy path:** Zod + layout-only write + registry defaults + monthBoard payload + Settings focus visibility + board cells/month card + skeleton default-only — mostly named. **Gap:** concrete e2e Settings → `/kiosk` (Task 8).
- **User-visible failures:** Zod `400` for bad layout planned. Empty board prompt **not** planned. API 401/429 unchanged — OK not to re-test.
- **Empty / loading / permission:** Empty chart + metrics planned (Task 3/6). Zero widgets empty prompt **missing**. Default-only skeleton planned; CLS for non-default prefs accepted (no test needed).

## Edge scenarios checked

- **Boundaries / invalid input:** Bad columns/mode/unknown focus planned. **Partial nested object** and **omit-key unchanged** not planned. Cap helper `min(pref, cap)` planned; live CSS caps are SoT (no JS measure assert required).
- **Concurrency / double-submit / idempotency:** Same-body upsert safe — no new store; OK to skip dedicated test if layout-only write + omit-key covered.
- **Offline / partial data / race:** No workspace budget → null chart planned. Disabled-widget no-fetch **missing**. No migrate of stored prefs **missing**.

## Fix ask for Build

Fold into `04-tasks.md` TDD bullets (prefer few strong reds):

1. **Task 8 (Critical):** `it("settings kiosk layout persists on /kiosk")` — save grid (or fullscreen+focus) → assert `/kiosk` mode/cols/focus + month-board glance (labels or empty chart + metrics).
2. **Task 3 (Major):** `it("skips month-board finance loads when money.month_board disabled")` — spies/mocks never called; payload omits `monthBoard`.
3. **Task 6 (Major):** `it("shows enable prompt when zero widgets enabled")`.
4. **Task 6 (Major):** `it("without month board shows first non-money widget as primary content")`.
5. **Task 2 (Major):** `it("resolveKioskWidgets keeps stored set without injecting month_board")`.
6. **Task 1 (Major):** Zod incomplete `kioskLayout` → fail; widgets-only PATCH leaves prior `kioskLayout` unchanged.
7. **Task 1 / 7 (Enhancement):** disabled focus may persist; `loading.tsx` has no prefs/DB read.

**Keep as-is (already strong enough):** Zod reject unknown focus / bad columns; layout-only write; focus resolve + `effectiveKioskColumns`; focus visibility matrix; month card six labels + linear empty chart; skeleton default-only three cells.

**Explicit non-goals (OK):** CLS assert for non-default prefs; ResizeObserver/JS width measure; dual-path Option 2; migrate existing stored widgets; live phone container-query pixel proof beyond e2e viewport helper if present.

## Round notes

- Design locks (layout-only write key, CSS column SoT, loans=`monthlyObligationMinor`, default-only loading, null-prefs-only defaults) are mostly in acceptance text; several lack a named failing test.
- Highest regression risk: **silent layout no-op** (Task 1 — planned) and **ungated finance load** (Task 3 — not planned).
- Task 8 must gain concrete asserts before Gate B; “spec fails until wired” is not a reviewable scenario.
- No product code in this stage. Parent: fold Fix ask into `04-tasks.md` → re-run 04a or Gate B with updated tasks.
- **2026-10-13:** Fix ask folded into `04-tasks.md` Test sections (Tasks 1, 2, 3, 6, 8). Task 7 enhancement (loading purity) left as acceptance-only.
