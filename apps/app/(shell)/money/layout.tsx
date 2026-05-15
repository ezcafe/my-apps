import type { ReactNode } from "react";
import { MoneyRouteLayout } from "@/components/money-route-layout";

export default function MoneyLayout({ children }: { children: ReactNode }) {
  return <MoneyRouteLayout>{children}</MoneyRouteLayout>;
}
