import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const SavingsDashboardLazy = dynamic(
  () =>
    import("@/components/savings-dashboard").then((mod) => ({
      default: mod.SavingsDashboard,
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

export default function SavingsPage() {
  return <SavingsDashboardLazy />;
}
