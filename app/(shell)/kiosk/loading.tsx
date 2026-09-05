import { CoreShellPage } from "@/components/core-shell-page";
import { KioskDashboardSkeleton } from "@/components/kiosk/kiosk-dashboard-skeleton";

export default function KioskLoading() {
  return (
    <CoreShellPage>
      <KioskDashboardSkeleton />
    </CoreShellPage>
  );
}
