import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CoreShellPage } from "@/components/core-shell-page";
import { KioskDashboard } from "@/components/kiosk/kiosk-dashboard";
import { loadKioskPageData } from "@/lib/kiosk/load-kiosk-page";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) redirect("/login");

  const data = await loadKioskPageData(userSub);

  return (
    <CoreShellPage>
      <KioskDashboard data={data} />
    </CoreShellPage>
  );
}
