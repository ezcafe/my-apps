import { Suspense, type ReactNode } from "react";
import { InvestmentRouteChrome } from "@/components/investment-route-layout";
import { InvestmentSectionShell } from "@/components/investment-section-shell";
import { MoneyHydratedWorkspace } from "@/components/money-route-layout";
import { MoneyInvestmentsPageSkeleton } from "@/components/investment-page-skeleton";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyInvestmentsLayout } from "@/lib/money-ssr-prefetch";
import { dehydrateMoneyLayoutState } from "@/lib/money-ssr-seed";

export default function InvestmentsLayout({ children }: { children: ReactNode }) {
  return (
    <InvestmentRouteChrome>
      <Suspense fallback={<MoneyInvestmentsPageSkeleton />}>
        <InvestmentsBootstrapBoundary>{children}</InvestmentsBootstrapBoundary>
      </Suspense>
    </InvestmentRouteChrome>
  );
}

async function InvestmentsBootstrapBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const queryClient = getQueryClient();
  if (session?.user?.id) {
    await prefetchMoneyInvestmentsLayout(queryClient, session.user.id);
  }

  return (
    <MoneyHydratedWorkspace dehydratedState={dehydrateMoneyLayoutState(queryClient)}>
      <InvestmentSectionShell>{children}</InvestmentSectionShell>
    </MoneyHydratedWorkspace>
  );
}
