"use client";

import type { ReactNode } from "react";
import {
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import { AppHeaderOverrideProvider } from "@/components/app-header-override";
import { GraphQLMoneyProvider } from "@/components/graphql-money-provider";
import { MoneySectionTabs } from "@/components/money-section-tabs";
import { MoneyWorkspaceProvider } from "@/components/money-workspace-provider";

/** Query client + Money tab chrome. Bootstrap hydrates inside {@link MoneyHydratedWorkspace}. */
export function MoneyRouteChrome({ children }: { children: ReactNode }) {
  return (
    <GraphQLMoneyProvider>
      <AppHeaderOverrideProvider>
        <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-6">
          <MoneySectionTabs />
          {children}
        </div>
      </AppHeaderOverrideProvider>
    </GraphQLMoneyProvider>
  );
}

/** Hydrated bootstrap above MoneyWorkspaceProvider. */
export function MoneyHydratedWorkspace({
  children,
  dehydratedState,
}: {
  children: ReactNode;
  dehydratedState?: DehydratedState;
}) {
  return (
    <HydrationBoundary state={dehydratedState}>
      <MoneyWorkspaceProvider>{children}</MoneyWorkspaceProvider>
    </HydrationBoundary>
  );
}
