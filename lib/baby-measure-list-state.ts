/** Measure list: loading/error must not look like empty. */
export function babyMeasureListState(opts: {
  isLoading: boolean;
  isError: boolean;
  entryCount: number;
}): "loading" | "error" | "empty" | "ready" {
  if (opts.isLoading) return "loading";
  if (opts.isError) return "error";
  if (opts.entryCount === 0) return "empty";
  return "ready";
}
