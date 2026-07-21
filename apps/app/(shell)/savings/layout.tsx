import type { ReactNode } from "react";
import { SavingsRouteLayout } from "@/components/savings-route-layout";

export default function SavingsLayout({ children }: { children: ReactNode }) {
  return <SavingsRouteLayout>{children}</SavingsRouteLayout>;
}
