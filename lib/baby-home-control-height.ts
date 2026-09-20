/**
 * Big care buttons (Breast L/R, Nap, Pump L/R) match two stacked small tiles
 * (bottle ml / diaper kind): 2 × min-h-11 + top + mid + bottom 1px borders.
 * Fixed height (not min-only) so header stretch / h-full cannot skew pairs.
 */
export const BABY_HOME_BIG_CONTROL_MIN_H =
  "h-[calc(2*2.75rem+3px)] min-h-[calc(2*2.75rem+3px)]";

/** Flush 2×2 bottle/diaper/pump-amount grids — same floor as one big control. */
export const BABY_HOME_SMALL_GRID_MIN_H = BABY_HOME_BIG_CONTROL_MIN_H;
