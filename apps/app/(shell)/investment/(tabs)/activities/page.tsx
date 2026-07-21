import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const InvestmentActivitiesPageLazy = dynamic(
  () =>
    import("@/components/investment-activities-page").then((mod) => ({
      default: mod.InvestmentActivitiesPage,
    })),
  {
    loading: () => <Skeleton className="h-48 w-full max-w-4xl" />,
  },
);

export default function InvestmentActivitiesRoute() {
  return <InvestmentActivitiesPageLazy />;
}
