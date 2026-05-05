import type { ReactNode } from "react";
import { MoneySectionTabs } from "@/components/money-section-tabs";

export default function MoneyTabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="col-span-2 md:col-span-6 lg:col-span-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Money</h1>
      </header>
      <div className="col-span-2 md:col-span-6 lg:col-span-12">
        <MoneySectionTabs />
      </div>
      <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">{children}</div>
    </>
  );
}
