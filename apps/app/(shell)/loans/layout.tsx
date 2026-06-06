import type { ReactNode } from "react";
import { LoansRouteLayout } from "@/components/loans-route-layout";

export default function LoansLayout({ children }: { children: ReactNode }) {
  return <LoansRouteLayout>{children}</LoansRouteLayout>;
}
