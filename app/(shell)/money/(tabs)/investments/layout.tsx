import type { ReactNode } from "react";
import { dehydrate } from "@tanstack/react-query";
import { InvestmentSectionShell } from "@/components/investment-section-shell";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { seedInvestmentBootstrapOnly } from "@/lib/money-ssr-seed";

export default async function MoneyInvestmentsSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const queryClient = getQueryClient();
  if (session?.user?.id) {
    await seedInvestmentBootstrapOnly(queryClient, session.user.id);
  }

  return (
    <InvestmentSectionShell dehydratedState={dehydrate(queryClient)}>
      {children}
    </InvestmentSectionShell>
  );
}
