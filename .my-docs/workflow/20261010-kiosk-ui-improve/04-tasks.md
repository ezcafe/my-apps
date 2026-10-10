# Tasks: Kiosk attention-first glance (suggestion package)

**Pipeline note:** Build reopened (Decision 6 → 1+2). Implement Task 0 + Tasks 1–4 + 6. Task 5 stays Phase 2 stub / deferred.

## Task 0: Design-system parity on `/kiosk` + `/kiosk/weather`

**Description:**
Align both pages with DESIGN_GUIDE + existing analytics/status patterns before (or with) hierarchy reorder. Fix must-items from Gate B audit: honest unavailable titles, `AnalyticsEmptyState` empties, skeleton band parity, weather label/meta/error recovery, income/expense theme colors.

**Acceptance:**

- [ ] `KioskNetUnavailable` shows correct widget title (not always “Net”)
- [ ] No custom dashed empty panels on kiosk; use `AnalyticsEmptyState` (+ CTA where applicable)
- [ ] `kiosk-dashboard-skeleton` mirrors live band shapes (context + multi metric slots + attention list; insights if in max layout)
- [ ] Weather card labels use `text-muted`; fetch-fail empty has next action; loading meta stable
- [ ] Kiosk amounts use `chartIncomeColor` / `chartExpenseColor` pattern (or documented exception)
- [ ] No new hex / off-token radii / shadow cards

**Tests (TDD — what turns red first):**

- [ ] Unit: unavailable card for bills shows title “Bills” (not “Net”)
- [ ] Unit: empty widgets / no payments render `AnalyticsEmptyState` (or role/name assert)
- [ ] Unit: Net/ledger expense/income use chart tokens — not `--destructive` for normal expenses (`04a` Fix ask)
- [ ] Unit/skeleton: section order/count matches dashboard helper after Task 2 (or max-layout stub)
- [ ] Weather: label class / empty primaryAction smoke if cheap

**Files likely touched:** `kiosk-dashboard.tsx`, `kiosk-net-card.tsx`, `kiosk-loans-card.tsx`, `kiosk-dashboard-skeleton.tsx`, `kiosk-ledger-summary-card.tsx`, `weather-day-view.tsx`, `app/(shell)/kiosk/weather/page.tsx`, `weather-day-page-skeleton.tsx`, related tests

**Scope:** M

**Dependencies:** none (can ship alone if Build reopens for parity-only)

---

## Task 1: Failing tests for attention-first band order

**Description:**
Add unit (and e2e if order is UI-assertable) tests that expect dashboard/skeleton section order: context strip → loans payments (attention) → metrics → optional insights. Assert current production order fails these tests (TDD red).

**Acceptance:**

- [ ] Unit test(s) encode strip → attention(loans) → metrics → insights order
- [ ] Tests fail on today’s metrics-before-payments layout
- [ ] No production reorder yet in this task

**Tests (TDD — what turns red first):**

- [ ] Unit: render/order helper or dashboard structure asserts payments section before metrics when both enabled
- [ ] E2E (if feasible): with defaults, overdue/payments heading appears above net card on `/kiosk` — skip only if not UI-reachable; say so

**Files likely touched:** `components/kiosk/*.test.*`, `e2e/*kiosk*` (or new), test helpers

**Scope:** M

**Dependencies:** Task 0 preferred first (or parallel if tests stay order-focused)

---

## Task 2: Reorder live dashboard + skeleton (Phase 1)

**Description:**
Move loan payments attention band above metrics in `kiosk-dashboard.tsx`. Mirror exact order/grid/radii in `kiosk-dashboard-skeleton.tsx`. Keep insights below metrics; omit any bills-due chrome (Phase 2). Net remains first metric when on.

**Acceptance:**

- [ ] Live stack: strip → loans payments → metrics → insights
- [ ] Skeleton matches live (zero CLS)
- [ ] Task 1 tests green for order
- [ ] Defaults unchanged (weather, net, payments on)

**Tests (TDD — what turns red first):**

- [ ] Re-run Task 1 unit (+ e2e); must pass after reorder
- [ ] Skeleton parity: attention list band before metrics grid
- [ ] Unit: net+bills+savings enabled → first metric title is “Net” (`04a` Fix ask)

**Files likely touched:** `components/kiosk/kiosk-dashboard.tsx`, `kiosk-dashboard-skeleton.tsx`

**Scope:** M

**Dependencies:** Task 1

---

## Task 3: Update DESIGN_GUIDE Kiosk glance IA

**Description:**
Rewrite `docs/DESIGN_GUIDE.md` § Kiosk glance to: context strip → **attention (action list)** → metrics → optional insights. Note Kiosk attention = loans now; bills-due later when honest signal exists. No fake due from ledger.

**Acceptance:**

- [ ] Guide band order matches live + skeleton
- [ ] Explicit: status board; no builder; insights opt-in/below
- [ ] Bills-due called out as future, not `bills.summary`

**Tests (TDD — what turns red first):**

- [ ] N/A automated — manual doc review checklist in PR; optional snapshot of guide heading list if repo already docs-tests

**Files likely touched:** `docs/DESIGN_GUIDE.md`

**Scope:** S

**Dependencies:** Task 2

---

## Task 4: Attention empty / all-clear behavior

**Description:**
When `loans.payments` off or no overdue/upcoming rows, attention zone omits phantom urgency (no empty “needs you” banner — use soft `AnalyticsEmptyState` only if design chose it; lock one rule). Calm metrics-led board still scannable. Overdue Alert remains inside payments when rows exist. `bills.summary` alone must never create attention / fake due.

**Acceptance:**

- [ ] No fake attention when no loan due data
- [ ] Overdue Alert still shows when overdue rows exist
- [ ] Net still readable as money #1 below when on

**Tests (TDD — what turns red first):**

- [ ] Unit: payments off → no payments section
- [ ] Unit: empty overdue+upcoming → no urgency Alert / list chrome per agreed empty rule
- [ ] Unit: overdue present → Alert visible above/within list before metrics
- [ ] Unit: `bills.summary` on + `loans.payments` off → no payments heading / no overdue Alert; Bills only under metrics (`04a`)

**Files likely touched:** `kiosk-dashboard.tsx`, `kiosk-loans-card.tsx`, tests

**Scope:** S

**Dependencies:** Task 2

---

## Task 5: Phase 2 stub spec — honest bills-due (no Build until data)

**Description:**
Document-only (or skipped test placeholders) for Phase 2: bills-due co-located in attention when real due payload exists; never map `bills.summary` to due. If Build reopens for Phase 2 only after a due loader exists, implement registry/loader/UI then.

**Acceptance:**

- [ ] Written contract: bills-due ≠ `bills.summary`
- [ ] Placeholder tests marked skip or file under future until loader exists
- [ ] No production bills-due UI that fakes ledger totals

**Tests (TDD — what turns red first):**

- [ ] Skipped/future unit: attention shows bills-due rows only when `widgets.billsDue` present
- [ ] Assert: enabling `bills.summary` alone must **not** create attention bills-due

**Files likely touched:** tests stubs; later `load-kiosk-page.ts`, `widget-registry.ts`, dashboard attention zone

**Scope:** S (spec now) / M (when Build Phase 2)

**Dependencies:** Task 2; blocked on honest bills-due data path

---

## Task 6: Manual glance verify + light/dark

**Description:**
When Build runs: phone-width check time-to-answer (urgency then net ~5s with defaults). Verify light/dark tokens; no hover-only; ≥44px hits on loan deep links.

**Acceptance:**

- [ ] Defaults path: urgency (if any) named before scrolling past first screen
- [ ] Light and dark OK
- [ ] Insights stay off critical path unless user enabled them

**Tests (TDD — what turns red first):**

- [ ] Prefer e2e from Task 1; else manual checklist recorded in PR / `06-test-log` when test stage runs

**Files likely touched:** none (verify) or e2e tweaks

**Scope:** S

**Dependencies:** Tasks 2–4

---

## Checkpoints

After every 2–3 tasks:

- [ ] Focused tests pass
- [ ] Slice works end-to-end where applicable
- [ ] Skeleton order still matches live
- [ ] No bills-due faked from `bills.summary`
