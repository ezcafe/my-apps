import dynamic from "next/dynamic";
import { MoneyDashboardSkeleton } from "@/components/money-dashboard-skeleton";

const MoneyDashboardLazy = dynamic(
  () =>
    import("@/components/money-dashboard").then((mod) => ({
      default: mod.MoneyDashboard,
    })),
  { loading: () => <MoneyDashboardSkeleton /> },
);

export default function MoneyPage() {
  return <MoneyDashboardLazy />;
}
