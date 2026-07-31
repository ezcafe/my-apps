import { MoneyListSkeleton } from "@/components/money-feedback";

export default function MoneyInvestmentsPortfolioLoading() {
  return (
    <div className="col-span-2 min-w-0 space-y-4 md:col-span-6 lg:col-span-12">
      <MoneyListSkeleton variant="summaryTiles" className="max-w-md" />
      <MoneyListSkeleton variant="panelCards" />
    </div>
  );
}
