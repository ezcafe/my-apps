import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function FormPageSkeleton() {
  return (
    <div className="col-span-2 min-w-0 max-w-xl md:col-span-6 lg:col-span-8">
      <Card className="p-5">
        <Skeleton className="h-6 w-32 rounded-[var(--radius-sm)]" />
        <div className="mt-4 grid gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-12 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-14 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-20 w-full rounded-[var(--radius-md)]" />
          </div>
          <Skeleton className="h-11 w-36 rounded-[var(--radius-md)]" />
        </div>
      </Card>
    </div>
  );
}

const InvestmentActivityFormLazy = dynamic(
  () =>
    import("@/components/investment-activity-form").then((mod) => ({
      default: mod.InvestmentActivityForm,
    })),
  {
    loading: () => <FormPageSkeleton />,
  },
);

export default function MoneyInvestmentNewPage() {
  return <InvestmentActivityFormLazy />;
}
