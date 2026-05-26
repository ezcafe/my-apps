"use client";

import type { ReactNode } from "react";
import { GraphQLMoneyProvider } from "@/components/graphql-money-provider";

/** Money route group: shared query client + page grid shell. */
export function MoneyRouteLayout({ children }: { children: ReactNode }) {
  return (
    <GraphQLMoneyProvider>
      <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 py-8 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-8">
        {children}
      </div>
    </GraphQLMoneyProvider>
  );
}
