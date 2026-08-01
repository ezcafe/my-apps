import { cache } from "react";
import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
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
