import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function FormPageSkeleton() {
  return (
    <div className="min-w-0 max-w-4xl space-y-4">
      <div>
        <Skeleton className="h-7 w-48 rounded-[var(--radius-sm)]" />
        <Skeleton className="mt-2 h-3 w-12 rounded-[var(--radius-sm)]" />
      </div>
      <Card className="p-5">
        <div
          className="grid min-w-0 gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
          }}
        >
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)] [grid-column:1/-1]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-24 w-full rounded-[var(--radius-md)] [grid-column:1/-1]" />
          <Skeleton className="h-11 w-40 rounded-[var(--radius-md)]" />
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
