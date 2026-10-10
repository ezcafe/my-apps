# TDD test-case review: 20261010-kiosk-ui-improve

**Result:** needs more tests
**Round:** 1
**Updated:** 2026-10-10

**Build scope:** Task 0 + Phase 1 (Tasks 1–4, 6). Task 5 deferred — skipped stubs OK; add one Phase 1 regression guard below.

**Existing harness:** `renderToStaticMarkup` + `node:test` (`kiosk-context-strip.test.ts`, `weather-day-view.test.ts`). No `/kiosk` e2e yet — prefer strong dashboard units; skip e2e only with one-line note.

## Planned / existing test cases reviewed

| Task | Scenario type | Test case | Covered? |
|------|---------------|-----------|----------|
| 0 | real | Unavailable bills card title “Bills” ≠ “Net” | yes (planned) |
| 0 | real | Empty widgets / no-payments → `AnalyticsEmptyState` | yes (planned) |
| 0 | real | Skeleton section order/count vs live helper | yes (planned) |
| 0 | real | Weather label class / empty `primaryAction` | partial — “if cheap”; page already uses empty+CTA |
| 0 | real | Income/expense use chart tokens (not `--destructive` for normal expense) | no |
| 1 | real | Strip → attention(loans) → metrics → insights order | yes (planned) |
| 1 | real | E2E payments heading above net | partial — optional; no kiosk e2e today |
| 2 | real | Re-run order + thin skeleton parity | yes (planned) |
| 2 | real | Net first among metrics when bills/savings also on | no |
| 3 | — | Guide IA (manual) | N/A |
| 4 | edge | Payments off → no payments section | yes (planned) |
| 4 | edge | Empty overdue+upcoming → no urgency Alert / chrome | yes (planned) |
| 4 | real | Overdue present → Alert in attention before metrics | yes (planned) |
| 4 | edge | `bills.summary` on, payments off → no attention / no fake due | partial — not explicit |
| 5 | edge | bills-due only when payload; summary ≠ due | deferred (skip OK) |
| 6 | real | Glance / light-dark | prefer Task 1 e2e or manual |

## Gaps (must add before or during Build)

| Severity | Task | Missing scenario | Suggested test |
|----------|------|------------------|----------------|
| Major | 0 | Expense/income colors are acceptance + easy regression (`--destructive` today) | Unit/source: Net (or ledger) expense class uses chart expense token / `chartExpenseColor` pattern; income chart income; not `--destructive` for normal expenses |
| Major | 2 | D4 net = money #1 among metrics | Unit: enable net+bills+savings → first metric card label “Net” before “Bills”/“Savings” |
| Major | 4 | D2: ledger summary must not become attention | Unit: `bills.summary` on + `loans.payments` off → no payments heading / no overdue Alert; Bills only under metrics |
| Enhancement | 0 | Weather loading meta jump / KPI `text-muted` | Optional: meta helper stable string; class smoke on weather card labels |
| Enhancement | 1/6 | Phone-width order e2e | Skip with note if unit order assert is DOM-index strong; else thin Playwright later |
| Enhancement | 0 | Savings/insights unavailable titles | One Bills title prop test is enough if API is `title` |

## Real scenarios checked

- **Happy path:** Order + overdue Alert planned; net-first among metrics missing.
- **User-visible failures:** Unavailable title (Bills) planned; weather fail CTA already on page — optional smoke.
- **Empty / loading:** Empty widgets + empty payments planned; skeleton order planned; weather meta Enhancement.

## Edge scenarios checked

- **Boundaries / invalid input:** Payments off; empty loan rows; bills.summary ≠ attention (needs explicit fixture).
- **Concurrency / double-submit:** N/A (read-only UI).
- **Offline / partial data:** Unavailable metric cards planned; strip fail covered by existing strip tests.

## Fix ask for Build

Concrete tests to add or strengthen (fold into Tasks 0 / 1–2 / 4):

1. **Task 0 (Major):** Keep Bills unavailable title ≠ “Net”. Add income/expense chart-token assert (ban `--destructive` for normal expenses on kiosk money cards).
2. **Task 1 (Major):** One strong dashboard/helper unit: with defaults (weather+net+payments), DOM order strip → payments heading → “Money metrics” → insights (if on). Must fail on today’s metrics-before-payments layout.
3. **Task 2 (Major):** Same suite: net+bills+savings enabled → first metric title is “Net”.
4. **Task 2 (Major):** Skeleton band order matches live (attention list band before metrics grid).
5. **Task 4 (Major):** Payments off + `bills.summary` on → no payments section / no urgency Alert; Bills remains in metrics.
6. **Task 4 (Major):** Empty overdue+upcoming → no urgency Alert (omit or soft `AnalyticsEmptyState` per design — lock the chosen rule once).
7. **Task 4 (Major):** Overdue rows → Alert in payments band and that band before metrics.

## Round notes

- Prefer few strong `KioskDashboard` / skeleton / `KioskNetUnavailable` render tests over many class snapshots.
- Task 5 skipped stubs stay deferred; Fix ask #5 is the Phase 1 D2 guard only.
- Deferred Enhancements: weather meta/label smoke, e2e glance, extra unavailable titles.
- No product code this stage. Parent: fold Fix ask into `04-tasks.md` → Build (Gate B already approved).
