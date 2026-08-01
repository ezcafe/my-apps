"use client";

import type { ReactNode } from "react";
import {
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import { GraphQLMoneyProvider } from "@/components/graphql-money-provider";
import { MoneyWorkspaceProvider } from "@/components/money-workspace-provider";

/** Money route group: query client, hydrated bootstrap, workspace, page grid shell. */
export function MoneyRouteLayout({
  children,
  dehydratedState,
}: {
  children: ReactNode;
  dehydratedState?: DehydratedState;
}) {
  return (
    <GraphQLMoneyProvider>
      <HydrationBoundary state={dehydratedState}>
        <MoneyWorkspaceProvider>
          <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 py-8 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-8">
            {children}
          </div>
        </MoneyWorkspaceProvider>
      </HydrationBoundary>
    </GraphQLMoneyProvider>
  );
}
