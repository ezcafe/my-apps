"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MoneyViewFiltersBar } from "@/components/analytics-filters";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";

const InvestmentDashboardLazy = dynamic(
  () =>
    import("@/components/investment-dashboard").then((mod) => ({
      default: mod.InvestmentDashboard,
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

export default function MoneyInvestmentsPortfolioPage() {
  const router = useRouter();

  return (
    <div className="col-span-2 min-w-0 space-y-4 md:col-span-6 lg:col-span-12">
      <MoneyViewFiltersBar
        title={MONEY_LEDGER_INVESTMENT.title}
        description="Holdings and portfolio value over time. Switch to Activity for cash movements on investment accounts."
        viewFilter={{
          menuLabel: "View",
          value: "portfolio",
          defaultValue: "activity",
          options: [
            { id: "activity", label: "Activity" },
            { id: "portfolio", label: "Portfolio" },
          ],
          onChange: (id) => {
            router.push(
              id === "portfolio"
                ? "/money/investments/portfolio"
                : "/money/investments",
            );
          },
        }}
      />
      <InvestmentDashboardLazy />
    </div>
  );
}
