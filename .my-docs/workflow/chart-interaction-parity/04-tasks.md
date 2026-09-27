# Tasks: chart-interaction-parity

**TDD:** Red first per task. Match approved `ui-refs/_proposed-chart-interactions.html`.  
**Has API:** yes — Task 2 before Loans multi-loan modal wiring.

## Task 1 — LoanProgressChart onItemClick (S)

**Acceptance:**
- `LoanProgressChart` accepts optional `onItemClick` with `{ label, series?, index }` (or equivalent)
- Pointer click on a point/hit target invokes handler; hover tooltip unchanged
- Detail + Insights can pass handlers later

**TDD:**
- [ ] Unit: click fires payload for visible series point
- [ ] Unit: hidden series point does not fire (if applicable)

## Task 2 — Loans installments list API (M)

**Acceptance:**
- GraphQL `loansInstallments(query)` with `loanId?`, `from?`, `to?`, `status?`, `limit`, `cursor`
- Workspace-scoped; Zod-validated; returns items + nextCursor
- Client `loansInstallmentsQueryOptions` helper
- No schema migration

**TDD:**
- [ ] Unit: validator rejects bad dates / limit
- [ ] Unit/service: filters by loanId + dueDate range + status
- [ ] Unit: empty result → empty items, null cursor

## Task 3 — Loans drill modal + Insights/detail wiring (L)

**Acceptance:**
- `LoansChartDrilldownModal` (or named peer) lists installments for filter
- Remaining pie: click → modal (not primary navigate); footer Open loan → `/loans/[id]`
- Paid principal/interest + combined payoff + loan detail progress: click → modal with Task 2 or `loan(id)` as Design locked
- Insights combined chart: `ChartLegendList` + `hiddenSeries` wired

**TDD:**
- [ ] Unit: merge click → query input (loanId / dates / status)
- [ ] Component: modal renders rows / quiet empty
- [ ] E2E or component: Remaining pie click opens dialog (not only navigation)

## Task 4 — Investments drill modal + card onItemClick (M)

**Acceptance:**
- Modal loads `investmentActivitiesQueryOptions` with instrumentId/kind/from/to
- Allocation, results-over-time, diverging, P&L-by-symbol wire click (symbol→id map)
- Hover unchanged; allocation legend toggle remains

**TDD:**
- [ ] Unit: symbol → instrumentId resolver
- [ ] Component/unit: click builds activities query
- [ ] E2E or component: allocation click opens modal

## Task 5 — Baby ChartShell hover + legend toggle (L)

**Acceptance:**
- Hydration, night rest, care count, growth charts use `ChartShell` tooltips
- Hydration (and other multi-series) use `ChartLegendList` + hidden keys
- Pattern-finder: hover only; no drill required
- Skeleton parity if legend adds height

**TDD:**
- [ ] Unit/component: tooltip show path exists (or legend toggle hides series)
- [ ] Unit: toggle hides series geometry / keys
- [ ] Source: pattern-finder has no onItemClick drill this pass

## Task 6 — Baby drill modal (M)

**Acceptance:**
- Click care chart slice/day → modal of timeline rows filtered by date (+ care type client-side)
- Click growth point → growth entries via existing kind/date query
- Quiet empty; Close works
- Optional Open activities link

**TDD:**
- [ ] Unit: filter timeline rows by day + type
- [ ] Component: modal opens with title from click
- [ ] E2E: Baby Insights click chart opens dialog

## Task 7 — Money regression + a11y/skeleton spot-check (S)

**Acceptance:**
- Money Insights drill/hover/toggle still work (no regression)
- Touched skeletons match legend/modal chrome
- Meaning not color-only on legend/tooltip

**TDD:**
- [ ] Existing Money chart unit/e2e still green (smoke)
- [ ] Skeleton contract for any new legend slot

## Task order

1 → 2 → 3 → 4 → 5 → 6 → 7  
(Progress chart click can parallel Task 2; Baby hover before Baby drill.)
