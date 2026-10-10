# Tasks: app-improvement-discover-ship

**Scope note:** Expanded Decision 6 → **A + P1**. Remaining Build is **backlog #3 — Money cold-path copy**. #1 / #2 / #4 already on `main` (verify only).

**TDD:** Red tests first. Has UI yes (copy). Has API no. Has DB no.

## Task 0 — Expanded ship pick (S)

**Acceptance:**
- [x] Decision 6 Options 2+3+4A + packaging P1 recorded
- [x] #1 / #2 / #4 marked already shipped on `main`
- Remaining tasks = #3 only

**Tests:** N/A

## Task 1 — Verify #2 kiosk + #4 prune already shipped (S)

**Acceptance:**
- Confirm `docs/PERFORMANCE.md` has `/kiosk` measured (not “measure after change” only)
- Confirm `lib/baby-quick-care-prune.ts` + `app/api/cron/db-housekeeping` wired
- No code change unless a real gap is found (then stop and report)

**Tests:** Existing `lib/db-housekeeping.test.ts` stays green; source assert PERFORMANCE kiosk note if useful

## Task 2 — Cold-path copy module + unit tests (S)

**Acceptance:**
- `lib/money-cold-path-copy.ts` exports Spending / Bills / Savings empty title+description (+ optional Insights fallback + form picker messages)
- Voice: empty ≠ error; lead with add / Settings; “widen range” second

**TDD (red first):**
- Unit: Spending title/description mention add (or transaction) and are non-empty
- Unit: form account empty message mentions Settings / Accounts
- Unit: Insights fallback description mentions add or transaction

## Task 3 — Wire presets + Insights + form empties (S)

**Acceptance:**
- `lib/money-ledger-presets.ts` Spending/Bills/Savings `emptyState` use the module
- `components/analytics-transactions-table.tsx` default empty uses module (or shared strings)
- `components/analytics-chart-cards/spend-by-category-card.tsx` empty uses module / shared Insights cold copy
- `components/money-transaction-form.tsx` account/category/merchant emptyMessage uses module
- No layout / skeleton / href changes unless an existing CTA label string changes only

**TDD:**
- Unit/source: presets import or equal cold-path constants
- Existing preset consumers stay green

## Task 4 — Smoke verify (S)

**Acceptance:**
- Unit suite green for new + nearby tests
- Build green
- Manual optional: empty Spending / Insights look action-first (auth-blocked OK — note in `06-test-log`)

## Task order

0 → 1 → 2 → 3 → 4

## Planned tests summary (for 04a)

- Unit: cold-path copy constants (Spending, form accounts, Insights fallback)
- Source/unit: presets + call sites wired
- Existing housekeeping / PERFORMANCE checks unchanged
