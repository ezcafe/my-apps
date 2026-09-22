"use client";

import type { ReactNode } from "react";
import { MoneyFamilyRouteChrome } from "@/components/money-family-route-chrome";
import { resolveLoanAppHeader } from "@/lib/loan-app-header";

/** Query client + Loans heading. Bootstrap hydrates inside MoneyHydratedWorkspace. */
export function LoanRouteChrome({ children }: { children: ReactNode }) {
  return (
    <MoneyFamilyRouteChrome resolveHeader={resolveLoanAppHeader}>
      {children}
    </MoneyFamilyRouteChrome>
  );
}
