import dynamic from "next/dynamic";
import { MoneyTabContentFallback } from "@/components/money-tab-content-fallback";

const AnalyticsDashboardLazy = dynamic(
  () =>
    import("@/components/analytics-dashboard").then((mod) => ({
      default: mod.AnalyticsDashboard,
    })),
  { loading: () => <MoneyTabContentFallback /> },
);

export default function MoneyAnalyticsPage() {
  return <AnalyticsDashboardLazy />;
}
