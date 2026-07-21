import { Skeleton } from "@/components/ui/skeleton";

export default function InvestmentTabsLoading() {
  return (
    <div className="min-w-0 max-w-4xl space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
