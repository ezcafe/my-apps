import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const LoanCreateFormLazy = dynamic(
  () =>
    import("@/components/loan-create-form").then((mod) => ({
      default: mod.LoanCreateForm,
    })),
  {
    loading: () => (
      <div className="min-w-0 max-w-4xl space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  },
);

export default function LoanNewPage() {
  return <LoanCreateFormLazy />;
}
