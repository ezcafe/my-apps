import { Suspense, type ReactNode } from "react";
import {
  MoneyHydratedWorkspace,
  MoneyRouteChrome,
} from "@/components/money-route-layout";
import { MoneyAnalyticsPageSkeleton } from "@/components/money-analytics-skeleton";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyBootstrapForLayout } from "@/lib/money-ssr-prefetch";
import { dehydrateMoneyLayoutState } from "@/lib/money-ssr-seed";

export default function MoneyLayout({ children }: { children: ReactNode }) {
  return (
    <MoneyRouteChrome>
      <Suspense fallback={<MoneyAnalyticsPageSkeleton />}>
        <MoneyBootstrapBoundary>{children}</MoneyBootstrapBoundary>
      </Suspense>
    </MoneyRouteChrome>
  );
}

async function MoneyBootstrapBoundary({ children }: { children: ReactNode }) {
  const session = await auth();
  const queryClient = getQueryClient();
  if (session?.user?.id) {
    await prefetchMoneyBootstrapForLayout(queryClient, session.user.id);
  }

  return (
    <MoneyHydratedWorkspace dehydratedState={dehydrateMoneyLayoutState(queryClient)}>
      {children}
    </MoneyHydratedWorkspace>
  );
}
