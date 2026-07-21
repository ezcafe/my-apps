"use client";

import type { ReactNode } from "react";
import { GraphQLSavingsProvider } from "@/components/graphql-savings-provider";

export function SavingsRouteLayout({ children }: { children: ReactNode }) {
  return (
    <GraphQLSavingsProvider>
      <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 py-8 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-8">
        {children}
      </div>
    </GraphQLSavingsProvider>
  );
}
