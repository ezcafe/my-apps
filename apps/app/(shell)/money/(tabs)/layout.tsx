import type { ReactNode } from "react";
import { MoneySectionTabs } from "@/components/money-section-tabs";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function MoneyTabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className={MONEY_FULL_SPAN}>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Money</h1>
      </header>
      <MoneySectionTabs />
      {children}
    </>
  );
}
