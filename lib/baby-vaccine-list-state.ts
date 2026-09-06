import type { BabyMessageKey } from "@/messages/baby/en";

export type BabyVaccineListState =
  | "loading"
  | "error"
  | "empty"
  | "ready";

export function babyVaccineListState(opts: {
  isLoading: boolean;
  isError: boolean;
  entryCount: number;
}): BabyVaccineListState {
  if (opts.isLoading) return "loading";
  if (opts.isError) return "error";
  if (opts.entryCount === 0) return "empty";
  return "ready";
}

export function babyVaccineDoseLabelKey(
  dose: string,
): BabyMessageKey {
  if (dose === "second") return "vaccine.doseSecond";
  return "vaccine.doseFirst";
}

/** Whether vaccine Load more should show (cursor remaining). */
export function babyVaccineHasMorePages(
  nextCursor: string | null | undefined,
): boolean {
  return nextCursor != null && nextCursor !== "";
}

/**
 * Partial list copy when more vaccine pages exist.
 * `partial` = Load more available; `partialCapped` = more data but soft max hit.
 */
export function babyVaccineListCopy(opts: {
  entryCount: number;
  listIncomplete: boolean;
  canLoadMore?: boolean;
}): "empty" | "partial" | "partialCapped" | "ready" {
  const canLoadMore = opts.canLoadMore ?? opts.listIncomplete;
  if (!opts.listIncomplete) {
    return opts.entryCount > 0 ? "ready" : "empty";
  }
  if (!canLoadMore) return "partialCapped";
  return "partial";
}
