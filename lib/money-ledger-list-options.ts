/**
 * Locked first-load list policy for Money ledger tabs after Task 1 measure.
 * Drilldown / analytics omit these helpers and keep includeTotal default true.
 */

/** Default `/money` ledger list skips COUNT (measure ranked list.count high). */
export function moneyLedgerListIncludeTotal(): boolean {
  return false;
}

/** Grill Q3: do not pass includeSummary on SSR critical path. */
export function moneyLedgerSsrIncludeSummary(): boolean {
  return false;
}
