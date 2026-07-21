import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const InvestmentDashboardLazy = dynamic(
  () =>
    import("@/components/investment-dashboard").then((mod) => ({
      default: mod.InvestmentDashboard,
    })),
  {
    loading: () => (
      <div className="min-w-0 max-w-4xl space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    ),
  },
);

export default function InvestmentPage() {
  return <InvestmentDashboardLazy />;
}
