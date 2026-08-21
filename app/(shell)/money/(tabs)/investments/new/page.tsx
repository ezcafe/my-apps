import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function FormPageSkeleton() {
  return (
    <div className="col-span-2 min-w-0 max-w-xl md:col-span-6 lg:col-span-8">
      <Skeleton className="h-6 w-32 rounded-[var(--radius-sm)]" />
      <div className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-12 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
          </div>
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-14 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-12 w-32 rounded-[var(--radius-md)]" />
          <Skeleton className="h-12 w-20 rounded-[var(--radius-md)]" />
        </div>
      </div>
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
