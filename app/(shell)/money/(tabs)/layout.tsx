import type { ReactNode } from "react";
import { MoneySectionTabs } from "@/components/money-section-tabs";

export default function MoneyTabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MoneySectionTabs />
      {children}
    </>
  );
}
