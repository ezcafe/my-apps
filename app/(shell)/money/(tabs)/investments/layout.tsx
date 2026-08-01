import type { ReactNode } from "react";
import { dehydrate } from "@tanstack/react-query";
import { InvestmentSectionShell } from "@/components/investment-section-shell";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { investmentBootstrapQueryOptions } from "@/lib/investment-query-options";

export default async function MoneyInvestmentsSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const queryClient = getQueryClient();
  if (session?.user?.id) {
    await queryClient
      .prefetchQuery(investmentBootstrapQueryOptions())
      .catch(() => {});
  }

  return (
    <InvestmentSectionShell dehydratedState={dehydrate(queryClient)}>
      {children}
    </InvestmentSectionShell>
  );
}
