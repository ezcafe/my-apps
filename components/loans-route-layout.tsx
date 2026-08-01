"use client";

import type { ReactNode } from "react";
import { GraphQLLoansProvider } from "@/components/graphql-loans-provider";

export function LoansRouteLayout({ children }: { children: ReactNode }) {
  return (
    <GraphQLLoansProvider>
      <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 py-8 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-8">
        {children}
      </div>
    </GraphQLLoansProvider>
  );
}
