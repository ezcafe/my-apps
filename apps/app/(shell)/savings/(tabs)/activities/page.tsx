import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const SavingsActivitiesPageLazy = dynamic(
  () =>
    import("@/components/savings-activities-page").then((mod) => ({
      default: mod.SavingsActivitiesPage,
    })),
  {
    loading: () => <Skeleton className="h-48 w-full max-w-4xl" />,
  },
);

export default function SavingsActivitiesRoute() {
  return <SavingsActivitiesPageLazy />;
}
