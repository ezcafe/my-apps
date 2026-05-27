import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { auth } from "@/auth";

export default async function MoneyAnalyticsPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <AnalyticsDashboard userSub={userSub} authenticated={Boolean(userSub)} />
  );
}
