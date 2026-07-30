"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MoneyViewFiltersBar } from "@/components/analytics-filters";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_LEDGER_LOAN } from "@/lib/money-ledger-presets";

const LoansDashboardLazy = dynamic(
  () =>
    import("@/components/loans-dashboard").then((mod) => ({
      default: mod.LoansDashboard,
    })),
  {
    loading: () => (
      <div className="min-w-0 space-y-4">
        <MoneyListSkeleton variant="summaryTiles" />
        <MoneyListSkeleton variant="cardGrid" />
      </div>
    ),
  },
);

export default function MoneyLoansManagePage() {
  const router = useRouter();

  return (
    <div className="col-span-2 min-w-0 space-y-4 md:col-span-6 lg:col-span-12">
      <MoneyViewFiltersBar
        title={MONEY_LEDGER_LOAN.title}
        description="Loan schedules, due dates, and payoff progress. Switch to Activity for ledger entries on loan accounts."
        viewFilter={{
          menuLabel: "View",
          value: "manage",
          defaultValue: "activity",
          options: [
            { id: "activity", label: "Activity" },
            { id: "manage", label: "Schedules & payments" },
          ],
          onChange: (id) => {
            router.push(
              id === "manage" ? "/money/loans/manage" : "/money/loans",
            );
          },
        }}
      />
      <LoansDashboardLazy />
    </div>
  );
}
