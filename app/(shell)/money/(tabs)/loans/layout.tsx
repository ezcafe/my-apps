import type { ReactNode } from "react";
import { dehydrate } from "@tanstack/react-query";
import { LoansSectionShell } from "@/components/loans-section-shell";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { seedLoansBootstrapOnly } from "@/lib/money-ssr-seed";

export default async function MoneyLoansSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const queryClient = getQueryClient();
  if (session?.user?.id) {
    await seedLoansBootstrapOnly(queryClient, session.user.id);
  }

  return (
    <LoansSectionShell dehydratedState={dehydrate(queryClient)}>
      {children}
    </LoansSectionShell>
  );
}
