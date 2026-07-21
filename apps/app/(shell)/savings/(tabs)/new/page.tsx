import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const SavingsActivityFormLazy = dynamic(
  () =>
    import("@/components/savings-activity-form").then((mod) => ({
      default: mod.SavingsActivityForm,
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

export default function SavingsNewPage() {
  return <SavingsActivityFormLazy />;
}
