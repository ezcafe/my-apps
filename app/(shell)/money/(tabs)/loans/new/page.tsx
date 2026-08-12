import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function FormPageSkeleton() {
  return (
    <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">
      <Card className="p-4">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
          </div>
          <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4">
            <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
            <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
              <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
            </div>
          </div>
          <Skeleton className="h-11 w-36 rounded-[var(--radius-md)]" />
        </div>
      </Card>
    </div>
  );
}

const LoanCreateFormLazy = dynamic(
  () =>
    import("@/components/loan-create-form").then((mod) => ({
      default: mod.LoanCreateForm,
    })),
  {
    loading: () => <FormPageSkeleton />,
  },
);

export default function MoneyLoanNewPage() {
  return <LoanCreateFormLazy />;
}
