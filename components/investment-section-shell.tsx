"use client";

import type { ReactNode } from "react";
import { InvestmentWorkspaceProvider } from "@/components/investment-workspace-provider";

export function InvestmentSectionShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <InvestmentWorkspaceProvider>{children}</InvestmentWorkspaceProvider>
  );
}
