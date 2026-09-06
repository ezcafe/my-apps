import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  BABY_LAST_CARE_MAX_PAGES,
  BABY_LAST_CARE_PAGE_LIMIT,
  lastCareStatusByType,
  shouldFetchNextCareStatusPage,
  type LastCareStatusByType,
} from "@/lib/baby-last-care-status";
import { getBabySyncIntervalMinutes } from "@/lib/baby-sync-interval";

export const babyKeys = {
  all: ["baby"] as const,
  profile: () => [...babyKeys.all, "profile"] as const,
  timeline: (from?: string, to?: string) =>
    [...babyKeys.all, "timeline", from ?? "", to ?? ""] as const,
  growth: (kind?: string, from?: string, to?: string) =>
    [
      ...babyKeys.all,
      "growth",
      kind ?? "all",
      from ?? "",
      to ?? "",
    ] as const,
  vaccines: (from?: string, to?: string, cursor?: string) =>
    [
      ...babyKeys.all,
      "vaccines",
      from ?? "",
      to ?? "",
      cursor ?? "",
    ] as const,
  telegram: () => [...babyKeys.all, "telegram"] as const,
  sync: () => [...babyKeys.all, "sync"] as const,
};

const PROFILE_Q = /* GraphQL */ `
  query BabyProfile {
    babyProfile {
      id
      workspaceId
      displayName
      birthDate
    }
  }
`;

const TIMELINE_Q = /* GraphQL */ `
  query BabyTimeline($from: String, $to: String, $cursor: String, $limit: Int) {
    babyTimeline(from: $from, to: $to, cursor: $cursor, limit: $limit) {
      items {
        id
        kind
        type
        at
        endedAt
        summary
        source
        cursor
      }
      nextCursor
    }
  }
`;

/** Exported for wiring tests — must pass `$from` / `$to` into babyGrowthEntries. */
export const BABY_GROWTH_ENTRIES_QUERY = /* GraphQL */ `
  query BabyGrowth(
    $kind: String
    $from: String
    $to: String
    $cursor: String
    $limit: Int
  ) {
    babyGrowthEntries(
      kind: $kind
      from: $from
      to: $to
      cursor: $cursor
      limit: $limit
    ) {
      items {
        id
        kind
        recordedAt
        valueNum
        valueText
        unit
        notes
      }
      nextCursor
    }
  }
`;

const SYNC_Q = /* GraphQL */ `
  query BabySyncConfig {
    babySyncConfig {
      intervalMinutes
    }
  }
`;

export const BABY_VACCINES_QUERY = /* GraphQL */ `
  query BabyVaccines(
    $from: String
    $to: String
    $cursor: String
    $limit: Int
  ) {
    babyVaccines(from: $from, to: $to, cursor: $cursor, limit: $limit) {
      items {
        id
        name
        dose
        administeredAt
        notes
        source
      }
      nextCursor
    }
  }
`;

export type BabyVaccineEntryRow = {
  id: string;
  name: string;
  dose: "first" | "second";
  administeredAt: string;
  notes: string | null;
  source: string;
};

export type BabyVaccinePage = {
  babyVaccines: {
    items: BabyVaccineEntryRow[];
    nextCursor: string | null;
  };
};

export type BabyTimelinePage = {
  babyTimeline: {
    items: Array<{
      id: string;
      kind: string;
      type: string;
      at: string;
      endedAt: string | null;
      summary: string;
      source: string;
      cursor: string;
    }>;
    nextCursor: string | null;
  };
};

export type BabyGrowthEntryRow = {
  id: string;
  kind: string;
  recordedAt: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  notes: string | null;
};

export type BabyGrowthPage = {
  babyGrowthEntries: {
    items: BabyGrowthEntryRow[];
    nextCursor: string | null;
  };
};

export type BabyTimelineInfiniteData = {
  pages: BabyTimelinePage[];
  pageParams: Array<string | null>;
};

export type BabyGrowthInfiniteData = {
  pages: BabyGrowthPage[];
  pageParams: Array<string | null>;
};

/** Cap retained growth infinite pages for windowing helpers (~50 rows/page). */
export const BABY_GROWTH_MAX_PAGES = 4;

/**
 * Cap Insights auto-fetch timeline pages (manual Load more can continue
 * until soft max). With page size 100, 8 pages ≈ prior 4×200 coverage.
 */
export const BABY_TIMELINE_MAX_PAGES = 8;

/**
 * Soft max retained Load-more pages for timeline (honest partialCapped after).
 * ~20 × 100 rows; stops unbounded QueryClient / DOM growth.
 */
export const BABY_TIMELINE_SOFT_MAX_PAGES = 20;

/**
 * Soft max retained Load-more pages for growth (honest partialCapped after).
 * Growth has no sync truncate, so this is the main retention bound.
 */
export const BABY_GROWTH_SOFT_MAX_PAGES = 20;

/**
 * Soft max retained Load-more pages for vaccines (honest partialCapped after).
 * Same class of QueryClient / list DOM bound as timeline/growth.
 */
export const BABY_VACCINES_SOFT_MAX_PAGES = 20;

/**
 * Insights timeline page size — must stay ≤ babyTimelineInputSchema.limit max
 * (100). Prefer more auto pages over raising Zod past honest server cost.
 */
export const BABY_INSIGHTS_TIMELINE_PAGE_LIMIT = 100;

/**
 * Forward page param for growth infinite query.
 * Follows nextCursor past the auto-page cap until soft max (then partialCapped).
 */
export function babyGrowthNextPageParam(
  lastPage: BabyGrowthPage,
  allPages: BabyGrowthPage[],
  maxPages: number = BABY_GROWTH_SOFT_MAX_PAGES,
): string | undefined {
  if (allPages.length >= maxPages) return undefined;
  return lastPage.babyGrowthEntries.nextCursor ?? undefined;
}

/**
 * Forward page param for timeline infinite query.
 * Follows nextCursor past the auto-page cap until soft max (then partialCapped).
 */
export function babyTimelineNextPageParam(
  lastPage: BabyTimelinePage,
  allPages: BabyTimelinePage[],
  maxPages: number = BABY_TIMELINE_SOFT_MAX_PAGES,
): string | undefined {
  if (allPages.length >= maxPages) return undefined;
  return lastPage.babyTimeline.nextCursor ?? undefined;
}

/**
 * True while Insights should auto-fetch the next page (stops at maxAutoPages).
 * After sync truncate, pass allowAutoFetch: false so we do not re-walk pages
 * every minute — user Load more (or partial note) instead.
 */
export function babyInsightsShouldAutoFetchNextPage(
  loadedPageCount: number,
  maxAutoPages: number = BABY_TIMELINE_MAX_PAGES,
  opts: { allowAutoFetch?: boolean } = {},
): boolean {
  if (opts.allowAutoFetch === false) return false;
  return loadedPageCount < maxAutoPages;
}

/** Defensive trim: keep only the first `maxPages` (newest) pages. */
export function windowBabyGrowthInfiniteData(
  data: BabyGrowthInfiniteData,
  maxPages: number = BABY_GROWTH_MAX_PAGES,
): BabyGrowthInfiniteData {
  if (data.pages.length <= maxPages) return data;
  return {
    pages: data.pages.slice(0, maxPages),
    pageParams: data.pageParams.slice(0, maxPages),
  };
}

/**
 * Interval sync: always keep only the refreshed first page.
 * Deeper pages can go stale when page-1 nextCursor is unchanged (e.g.
 * backdated insert/delete on pages 2+). Truncating lets Load more /
 * Insights auto-fetch rebuild; brief UI shrink until pages refill is OK
 * — care-count honesty beats preserving deep cache.
 */
export function replaceBabyTimelineFirstPage(
  _old: BabyTimelineInfiniteData | undefined,
  firstPage: BabyTimelinePage,
): BabyTimelineInfiniteData {
  return {
    pages: [firstPage],
    pageParams: [null],
  };
}

/**
 * Apply Option A sync truncate safely vs in-flight fetchNextPage.
 * TanStack infinite onFetch snapshots pages at start; a late append would
 * overwrite a fresh first-page truncate. Cancel the query key first.
 */
export async function applyBabyTimelineSyncTruncate(
  queryClient: Pick<QueryClient, "cancelQueries" | "setQueryData">,
  queryKey: readonly unknown[],
  firstPage: BabyTimelinePage,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData(
    queryKey,
    (old: BabyTimelineInfiniteData | undefined) =>
      replaceBabyTimelineFirstPage(old, firstPage),
  );
}

/** Serialize timeline sync ticks: skip while a prior first-page fetch is in flight. */
export function babyTimelineSyncShouldFetch(inFlight: boolean): boolean {
  return !inFlight;
}

export function fetchBabyTimelinePage(input: {
  from?: string;
  to?: string;
  cursor?: string | null;
  limit?: number;
}) {
  return babyGraphQLRequest<BabyTimelinePage>(TIMELINE_Q, {
    from: input.from,
    to: input.to,
    cursor: input.cursor ?? undefined,
    limit: input.limit ?? 50,
  });
}

export type FetchBabyTimelinePageFn = (input: {
  from?: string;
  to?: string;
  cursor?: string | null;
  limit?: number;
}) => Promise<BabyTimelinePage>;

export function fetchBabyGrowthPage(input: {
  kind?: string;
  from?: string;
  to?: string;
  cursor?: string | null;
  limit?: number;
}) {
  return babyGraphQLRequest<BabyGrowthPage>(BABY_GROWTH_ENTRIES_QUERY, {
    kind: input.kind,
    from: input.from,
    to: input.to,
    cursor: input.cursor ?? undefined,
    limit: input.limit ?? 50,
  });
}

export type FetchBabyGrowthPageFn = (input: {
  kind?: string;
  from?: string;
  to?: string;
  cursor?: string | null;
  limit?: number;
}) => Promise<BabyGrowthPage>;

/**
 * Insights live path: infinite queryFns + sync tick share applied bounds.
 * Inject fetchers in unit tests so dropping from/to fails the suite.
 */
export function buildBabyInsightsQueryFns(
  bounds: { from: string; to: string },
  deps: {
    fetchTimeline?: FetchBabyTimelinePageFn;
    fetchGrowth?: FetchBabyGrowthPageFn;
  } = {},
) {
  const fetchTimeline = deps.fetchTimeline ?? fetchBabyTimelinePage;
  const fetchGrowth = deps.fetchGrowth ?? fetchBabyGrowthPage;

  return {
    timelineQueryKey: babyKeys.timeline(bounds.from, bounds.to),
    growthQueryKey: babyKeys.growth(undefined, bounds.from, bounds.to),
    timelineQueryFn: ({ pageParam }: { pageParam: string | null }) =>
      fetchTimeline({
        from: bounds.from,
        to: bounds.to,
        cursor: pageParam,
        limit: BABY_INSIGHTS_TIMELINE_PAGE_LIMIT,
      }),
    growthQueryFn: ({ pageParam }: { pageParam: string | null }) =>
      fetchGrowth({
        from: bounds.from,
        to: bounds.to,
        cursor: pageParam,
        limit: 50,
      }),
    syncTimelineFirstPage: () =>
      fetchTimeline({
        from: bounds.from,
        to: bounds.to,
        limit: BABY_INSIGHTS_TIMELINE_PAGE_LIMIT,
      }),
  };
}

export function babyProfileQueryOptions() {
  return queryOptions({
    queryKey: babyKeys.profile(),
    queryFn: () =>
      babyGraphQLRequest<{ babyProfile: { id: string; displayName: string } }>(
        PROFILE_Q,
      ),
  });
}

export function babyTimelineQueryOptions(from?: string, to?: string) {
  return queryOptions({
    queryKey: babyKeys.timeline(from, to),
    queryFn: () => fetchBabyTimelinePage({ from, to, limit: 50 }),
  });
}

/**
 * Walk unbounded timeline pages until feed+sleep+diaper are found or cap hit.
 * Shares `babyKeys.timeline("", "")` so care invalidation refreshes home.
 * `fetchPage` is injectable for unit tests (defaults to `fetchBabyTimelinePage`).
 */
export async function fetchBabyLastCareStatus(
  maxPages: number = BABY_LAST_CARE_MAX_PAGES,
  fetchPage: FetchBabyTimelinePageFn = fetchBabyTimelinePage,
): Promise<LastCareStatusByType> {
  const collected: BabyTimelinePage["babyTimeline"]["items"] = [];
  let cursor: string | null = null;
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const page = await fetchPage({
      cursor,
      limit: BABY_LAST_CARE_PAGE_LIMIT,
    });
    pagesFetched += 1;
    collected.push(...page.babyTimeline.items);
    const status = lastCareStatusByType(collected);
    if (
      !shouldFetchNextCareStatusPage(
        status,
        pagesFetched,
        page.babyTimeline.nextCursor,
        maxPages,
      )
    ) {
      return status;
    }
    cursor = page.babyTimeline.nextCursor;
  }

  return lastCareStatusByType(collected);
}

/** Default home status walk — capped multi-page Option B (`fetchBabyLastCareStatus`). */
export const babyLastCareStatusWalkDefault = fetchBabyLastCareStatus;

/**
 * Home last-ever status: empty from/to timeline key + capped page walk.
 * `walk` is injectable for unit tests (defaults to `fetchBabyLastCareStatus`).
 */
export function babyLastCareStatusQueryOptions(
  walk: () => Promise<LastCareStatusByType> = babyLastCareStatusWalkDefault,
) {
  return queryOptions({
    queryKey: babyKeys.timeline("", ""),
    queryFn: () => walk(),
  });
}

export function babyGrowthQueryOptions(
  kind?: string,
  from?: string,
  to?: string,
) {
  return queryOptions({
    queryKey: babyKeys.growth(kind, from, to),
    queryFn: () => fetchBabyGrowthPage({ kind, from, to, limit: 50 }),
  });
}

export async function fetchBabyVaccinesPage(args: {
  from?: string;
  to?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<BabyVaccinePage> {
  return babyGraphQLRequest<BabyVaccinePage>(BABY_VACCINES_QUERY, {
    from: args.from,
    to: args.to,
    // Match timeline/growth: omit null so GraphQL does not send cursor:null.
    cursor: args.cursor ?? undefined,
    limit: args.limit ?? 50,
  });
}

/** Forward page param for vaccine infinite list (stops at soft max). */
export function babyVaccinesNextPageParam(
  lastPage: BabyVaccinePage,
  allPages: BabyVaccinePage[],
  maxPages: number = BABY_VACCINES_SOFT_MAX_PAGES,
): string | undefined {
  if (allPages.length >= maxPages) return undefined;
  return lastPage.babyVaccines.nextCursor ?? undefined;
}

/** Single-page query (tests / simple callers). Prefer infinite on Vaccines UI. */
export function babyVaccinesQueryOptions(from?: string, to?: string) {
  return queryOptions({
    queryKey: babyKeys.vaccines(from, to),
    queryFn: () => fetchBabyVaccinesPage({ from, to, limit: 50 }),
  });
}

/** Infinite vaccine list — wires cursor so Load more is not silently truncated. */
export function babyVaccinesInfiniteQueryOptions(from?: string, to?: string) {
  return {
    queryKey: babyKeys.vaccines(from, to),
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      fetchBabyVaccinesPage({
        from,
        to,
        cursor: pageParam,
        limit: 50,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: BabyVaccinePage, pages: BabyVaccinePage[]) =>
      babyVaccinesNextPageParam(last, pages),
  };
}

export function babySyncConfigQueryOptions() {
  return queryOptions({
    queryKey: babyKeys.sync(),
    queryFn: async () => {
      try {
        const data = await babyGraphQLRequest<{
          babySyncConfig: { intervalMinutes: number };
        }>(SYNC_Q);
        return data.babySyncConfig.intervalMinutes;
      } catch {
        return getBabySyncIntervalMinutes();
      }
    },
    staleTime: 60_000,
  });
}

export type BabyInvalidateScope =
  | "all"
  | "care"
  | "growth"
  | "vaccines"
  | "telegram";

/**
 * Selective invalidation: care writes refresh timeline (+ profile);
 * growth writes refresh growth + timeline. Avoids refetching sync/telegram
 * on every diaper log.
 */
export async function invalidateBabyQueries(
  queryClient: {
    invalidateQueries: (opts: {
      queryKey: readonly unknown[];
    }) => Promise<void>;
  },
  scope: BabyInvalidateScope = "all",
) {
  if (scope === "all") {
    await queryClient.invalidateQueries({ queryKey: babyKeys.all });
    return;
  }
  if (scope === "care") {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [...babyKeys.all, "timeline"],
      }),
      queryClient.invalidateQueries({ queryKey: babyKeys.profile() }),
    ]);
    return;
  }
  if (scope === "growth") {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [...babyKeys.all, "growth"],
      }),
      queryClient.invalidateQueries({
        queryKey: [...babyKeys.all, "timeline"],
      }),
    ]);
    return;
  }
  if (scope === "vaccines") {
    await queryClient.invalidateQueries({
      queryKey: [...babyKeys.all, "vaccines"],
    });
    return;
  }
  await queryClient.invalidateQueries({ queryKey: babyKeys.telegram() });
}
