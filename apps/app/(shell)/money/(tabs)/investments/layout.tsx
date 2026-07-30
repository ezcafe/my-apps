import type { ReactNode } from "react";
import { InvestmentWorkspaceProvider } from "@/components/investment-workspace-provider";

export default function MoneyInvestmentsSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <InvestmentWorkspaceProvider>{children}</InvestmentWorkspaceProvider>;
}
