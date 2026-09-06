/** Feed Start is disabled while the timer is already running or a save is pending. */
export function isBabyFeedStartDisabled(
  timerRunning: boolean,
  pending = false,
): boolean {
  return timerRunning || pending;
}

/**
 * Sleep Start is disabled until open-sleep check finishes, while an open nap
 * exists, or while a save is pending.
 */
export function isBabySleepStartDisabled(
  hasOpenSleep: boolean,
  opts: { openChecked?: boolean; pending?: boolean } = {},
): boolean {
  const openChecked = opts.openChecked ?? true;
  const pending = opts.pending ?? false;
  return !openChecked || hasOpenSleep || pending;
}

/** True when a timeline care row is an open sleep session. */
export function isOpenSleepTimelineItem(item: {
  kind?: string;
  type: string;
  endedAt: string | null;
}): boolean {
  return (
    (item.kind == null || item.kind === "care") &&
    item.type === "sleep" &&
    item.endedAt == null
  );
}

export type OpenSleepTimelinePage = {
  items: Array<{
    kind?: string;
    type: string;
    endedAt: string | null;
  }>;
  nextCursor: string | null;
};

export type FetchOpenSleepTimelinePage = (args: {
  cursor: string | null;
  limit: number;
}) => Promise<OpenSleepTimelinePage>;

/** open = found; closed = exhausted pages with none; unknown = hit page cap with more. */
export type OpenSleepScanResult = "open" | "closed" | "unknown";

/** Rows per page when scanning for an open nap. */
export const BABY_OPEN_SLEEP_PAGE_LIMIT = 50;

/** Cap pages walked looking for open sleep (busy merged timelines). */
export const BABY_OPEN_SLEEP_MAX_PAGES = 20;

export type BabyOpenSleepUiState = {
  hasOpenSleep: boolean;
  openChecked: boolean;
  /** End available for confirmed open or unknown (page-cap) — user may try End. */
  endEnabled: boolean;
  /** Network/check failure — show message + Retry; End stays off until retry. */
  checkFailed: boolean;
  /** Page-cap unknown — show incomplete copy; Start off, End on. */
  checkIncomplete: boolean;
};

/**
 * Map open-sleep scan / check outcome to Start/End UI state.
 * Error and unknown fail-close Start (openChecked false).
 * Unknown keeps End enabled + incomplete note; error shows Retry instead.
 */
export function babyOpenSleepCheckState(
  result: OpenSleepScanResult | "error",
): BabyOpenSleepUiState {
  if (result === "open") {
    return {
      hasOpenSleep: true,
      openChecked: true,
      endEnabled: true,
      checkFailed: false,
      checkIncomplete: false,
    };
  }
  if (result === "closed") {
    return {
      hasOpenSleep: false,
      openChecked: true,
      endEnabled: false,
      checkFailed: false,
      checkIncomplete: false,
    };
  }
  if (result === "unknown") {
    return {
      hasOpenSleep: false,
      openChecked: false,
      endEnabled: true,
      checkFailed: false,
      checkIncomplete: true,
    };
  }
  return {
    hasOpenSleep: false,
    openChecked: false,
    endEnabled: false,
    checkFailed: true,
    checkIncomplete: false,
  };
}

/**
 * Map dedicated open-sleep query result to scan outcome.
 * null → closed; open nap row → open. Failures stay at the catch site.
 */
export function openSleepScanFromQuery(
  open:
    | {
        id?: string;
        type?: string;
        endedAt: string | null;
      }
    | null
    | undefined,
): OpenSleepScanResult {
  if (open == null) return "closed";
  if (open.endedAt != null) return "closed";
  if (open.type != null && open.type !== "sleep") return "closed";
  return "open";
}

/**
 * Walk timeline pages until an open sleep is found or there are no more pages.
 * Prefer `babyOpenSleep` / `openSleepScanFromQuery` on the sleep form hot path.
 * If the page cap is hit while nextCursor remains, returns "unknown" (fail closed).
 */
export async function detectOpenSleepAcrossTimelinePages(
  fetchPage: FetchOpenSleepTimelinePage,
  opts: {
    pageLimit?: number;
    maxPages?: number;
  } = {},
): Promise<OpenSleepScanResult> {
  const pageLimit = opts.pageLimit ?? BABY_OPEN_SLEEP_PAGE_LIMIT;
  const maxPages = opts.maxPages ?? BABY_OPEN_SLEEP_MAX_PAGES;
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage({ cursor, limit: pageLimit });
    if (result.items.some((item) => isOpenSleepTimelineItem(item))) {
      return "open";
    }
    if (result.nextCursor == null || result.nextCursor === "") {
      return "closed";
    }
    cursor = result.nextCursor;
  }

  return "unknown";
}
