import type { ReactNode } from "react";
import { InvestmentRouteLayout } from "@/components/investment-route-layout";

export default function InvestmentLayout({ children }: { children: ReactNode }) {
  return <InvestmentRouteLayout>{children}</InvestmentRouteLayout>;
}
