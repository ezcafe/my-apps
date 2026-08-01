"use client";

import type { ReactNode } from "react";
import {
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import { LoansWorkspaceProvider } from "@/components/loans-workspace-provider";

export function LoansSectionShell({
  children,
  dehydratedState,
}: {
  children: ReactNode;
  dehydratedState?: DehydratedState;
}) {
  return (
    <HydrationBoundary state={dehydratedState}>
      <LoansWorkspaceProvider>{children}</LoansWorkspaceProvider>
    </HydrationBoundary>
  );
}
