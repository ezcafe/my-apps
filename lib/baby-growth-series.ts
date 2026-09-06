/** Map growth rows to chart points (x = time ms, y = numeric value). */
export function growthEntriesToSeries(
  entries: Array<{ recordedAt: Date; valueNum: string | null }>,
): Array<{ x: number; y: number }> {
  return entries
    .map((e) => {
      if (e.valueNum == null) return null;
      const y = Number(e.valueNum);
      if (!Number.isFinite(y)) return null;
      return { x: e.recordedAt.getTime(), y };
    })
    .filter((p): p is { x: number; y: number } => p != null)
    .sort((a, b) => a.x - b.x);
}

/**
 * Empty vs partial copy when growth infinite pages may still remain.
 * Never claim “no measurements” while more growth rows exist.
 */
export function babyGrowthChartCopy(opts: {
  pointCount: number;
  growthIncomplete: boolean;
  canLoadMore?: boolean;
}): "empty" | "partial" | "partialCapped" | "ready" {
  const canLoadMore = opts.canLoadMore ?? opts.growthIncomplete;
  if (!opts.growthIncomplete) {
    return opts.pointCount > 0 ? "ready" : "empty";
  }
  if (!canLoadMore) return "partialCapped";
  return "partial";
}
