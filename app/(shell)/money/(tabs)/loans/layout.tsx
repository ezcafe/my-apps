import type { ReactNode } from "react";
import { dehydrate } from "@tanstack/react-query";
import { LoansSectionShell } from "@/components/loans-section-shell";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { loansBootstrapQueryOptions } from "@/lib/loans-query-options";

export default async function MoneyLoansSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const queryClient = getQueryClient();
  if (session?.user?.id) {
    await queryClient.prefetchQuery(loansBootstrapQueryOptions()).catch(() => {});
  }

  return (
    <LoansSectionShell dehydratedState={dehydrate(queryClient)}>
      {children}
    </LoansSectionShell>
  );
}
