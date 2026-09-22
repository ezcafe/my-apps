"use client";

import type { ReactNode } from "react";
import { MoneyFamilyRouteChrome } from "@/components/money-family-route-chrome";
import { resolveInvestmentAppHeader } from "@/lib/investment-app-header";

/** Query client + Investments heading. Bootstrap hydrates inside MoneyHydratedWorkspace. */
export function InvestmentRouteChrome({ children }: { children: ReactNode }) {
  return (
    <MoneyFamilyRouteChrome resolveHeader={resolveInvestmentAppHeader}>
      {children}
    </MoneyFamilyRouteChrome>
  );
}
