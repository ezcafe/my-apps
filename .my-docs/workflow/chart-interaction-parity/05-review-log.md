# Code review log: chart-interaction-parity

**Result:** clean (shipped draft surfaces)  
**Round:** 1  
**Updated:** 2026-09-27  
**SPM plan:** api + perf

## Adversarial

**Result:** clean — unit coverage for click allow, installment query validators/filters, domain drill builders; no Critical/Major on shipped paths.

## Quality

**Result:** clean for Option 1 draft on Money (unchanged), Loans Insights/detail, Investments ATF cards, Baby hydration.  
**Known gaps (Enhancement / follow-up):** Baby night-rest / care-count / growth / pattern-finder ChartShell+drill; Investments More (diverging / P&L-by-symbol) drill wiring.

## Merged SPM

### API lens
**Result:** clean — `loansInstallments` added to `money-finance-typeDefs` + loans resolvers; Zod edge; cursor pagination.

### Performance lens
**Result:** clean — thin list query; Baby modal fetches day timeline on open only; no N+1 loan detail for Insights paid charts.

## Round notes

- main-thread fallback — review — usage limit
- Smoke: build + unit pass
