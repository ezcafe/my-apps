import { cache } from "react";
import { QueryClient, isServer } from "@tanstack/react-query";
import { isRequestCircuitOpen } from "@/lib/request-circuit";
import { isPersistentRequestError } from "@/lib/user-facing-error";

function allowBackgroundRefetch(query: { state: { status: string } }): boolean {
  return !isRequestCircuitOpen() && query.state.status !== "error";
}

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (isRequestCircuitOpen() || isPersistentRequestError(error)) return false;
  return failureCount < 1;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetryQuery,
        retryOnMount: false,
        refetchOnWindowFocus: allowBackgroundRefetch,
        refetchOnReconnect: allowBackgroundRefetch,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** One QueryClient per RSC request (shared by layout + page prefetch). */
const getServerQueryClient = cache(() => makeQueryClient());

/**
 * Per-request QueryClient on the server; singleton in the browser so
 * HydrationBoundary and QueryClientProvider share the same cache.
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
 */
export function getQueryClient() {
  if (isServer) {
    return getServerQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
