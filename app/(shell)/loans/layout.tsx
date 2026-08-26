import { Suspense, type ReactNode } from "react";
import { LoanRouteChrome } from "@/components/loan-route-layout";
import { LoansSectionShell } from "@/components/loans-section-shell";
import { MoneyHydratedWorkspace } from "@/components/money-route-layout";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchLoansLayout } from "@/lib/money-ssr-prefetch";
import { dehydrateMoneyLayoutState } from "@/lib/money-ssr-seed";

function LoansLayoutFallback() {
  return (
    <div className={`${MONEY_FULL_SPAN} space-y-4`}>
      <MoneyListSkeleton variant="loansTable" />
    </div>
  );
}

export default function LoansLayout({ children }: { children: ReactNode }) {
  return (
    <LoanRouteChrome>
      <Suspense fallback={<LoansLayoutFallback />}>
        <LoansBootstrapBoundary>{children}</LoansBootstrapBoundary>
      </Suspense>
    </LoanRouteChrome>
  );
}

async function LoansBootstrapBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const queryClient = getQueryClient();
  if (session?.user?.id) {
    await prefetchLoansLayout(queryClient, session.user.id);
  }

  return (
    <MoneyHydratedWorkspace dehydratedState={dehydrateMoneyLayoutState(queryClient)}>
      <LoansSectionShell>{children}</LoansSectionShell>
    </MoneyHydratedWorkspace>
  );
}
