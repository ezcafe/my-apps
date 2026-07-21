import type { ReactNode } from "react";
import { InvestmentSectionTabs } from "@/components/investment-section-tabs";
import { InvestmentWorkspaceProvider } from "@/components/investment-workspace-provider";

export default function InvestmentTabsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <header className="col-span-2 md:col-span-6 lg:col-span-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Investment
        </h1>
      </header>
      <div className="col-span-2 md:col-span-6 lg:col-span-12">
        <InvestmentSectionTabs />
      </div>
      <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">
        <InvestmentWorkspaceProvider>{children}</InvestmentWorkspaceProvider>
      </div>
    </>
  );
}
