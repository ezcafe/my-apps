import dynamic from "next/dynamic";
import { MoneyTabContentFallback } from "@/components/money-tab-content-fallback";

const MoneyDashboardLazy = dynamic(
  () =>
    import("@/components/money-dashboard").then((mod) => ({
      default: mod.MoneyDashboard,
    })),
  { loading: () => <MoneyTabContentFallback /> },
);

export default function MoneyPage() {
  return <MoneyDashboardLazy />;
}
