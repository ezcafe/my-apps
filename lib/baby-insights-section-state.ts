/** Growth / timeline section body after the page-level skeleton settles. */
export function babyInsightsSectionState(opts: {
  isError: boolean;
  itemCount: number;
}): "error" | "empty" | "ready" {
  if (opts.isError) return "error";
  if (opts.itemCount === 0) return "empty";
  return "ready";
}
