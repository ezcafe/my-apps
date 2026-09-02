import { CoreShellPage } from "@/components/core-shell-page";
import { HomeDashboardSkeleton } from "@/components/home/home-dashboard-skeleton";

export default function HomeLoading() {
  return (
    <CoreShellPage>
      <HomeDashboardSkeleton />
    </CoreShellPage>
  );
}
