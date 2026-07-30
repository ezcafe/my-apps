import type { ReactNode } from "react";
import { LoansWorkspaceProvider } from "@/components/loans-workspace-provider";

export default function MoneyLoansSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <LoansWorkspaceProvider>{children}</LoansWorkspaceProvider>;
}
