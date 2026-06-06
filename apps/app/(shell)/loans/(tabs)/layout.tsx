import type { ReactNode } from "react";
import { LoansSectionTabs } from "@/components/loans-section-tabs";
import { LoansWorkspaceProvider } from "@/components/loans-workspace-provider";

export default function LoansTabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="col-span-2 md:col-span-6 lg:col-span-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Loans</h1>
      </header>
      <div className="col-span-2 md:col-span-6 lg:col-span-12">
        <LoansSectionTabs />
      </div>
      <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">
        <LoansWorkspaceProvider>{children}</LoansWorkspaceProvider>
      </div>
    </>
  );
}
