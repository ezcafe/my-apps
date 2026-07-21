import type { ReactNode } from "react";
import { SavingsSectionTabs } from "@/components/savings-section-tabs";
import { SavingsWorkspaceProvider } from "@/components/savings-workspace-provider";

export default function SavingsTabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="col-span-2 md:col-span-6 lg:col-span-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Savings
        </h1>
      </header>
      <div className="col-span-2 md:col-span-6 lg:col-span-12">
        <SavingsSectionTabs />
      </div>
      <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">
        <SavingsWorkspaceProvider>{children}</SavingsWorkspaceProvider>
      </div>
    </>
  );
}
