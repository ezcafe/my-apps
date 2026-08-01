"use client";

import type { ReactNode } from "react";
import {
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import { InvestmentWorkspaceProvider } from "@/components/investment-workspace-provider";

export function InvestmentSectionShell({
  children,
  dehydratedState,
}: {
  children: ReactNode;
  dehydratedState?: DehydratedState;
}) {
  return (
    <HydrationBoundary state={dehydratedState}>
      <InvestmentWorkspaceProvider>{children}</InvestmentWorkspaceProvider>
    </HydrationBoundary>
  );
}
