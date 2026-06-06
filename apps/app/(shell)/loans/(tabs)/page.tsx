import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const LoansDashboardLazy = dynamic(
  () =>
    import("@/components/loans-dashboard").then((mod) => ({
      default: mod.LoansDashboard,
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

export default function LoansPage() {
  return <LoansDashboardLazy />;
}
