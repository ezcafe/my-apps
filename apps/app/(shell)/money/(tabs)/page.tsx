import dynamic from "next/dynamic";
import { MoneyOverviewSkeleton } from "@/components/money-overview-skeleton";

const MoneyOverviewLazy = dynamic(
  () =>
    import("@/components/money-overview").then((mod) => ({
      default: mod.MoneyOverview,
    })),
  { loading: () => <MoneyOverviewSkeleton /> },
);

export default function MoneyPage() {
  return <MoneyOverviewLazy />;
}
