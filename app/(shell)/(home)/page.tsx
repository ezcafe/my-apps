import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CoreShellPage } from "@/components/core-shell-page";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { loadHomePageData } from "@/lib/home-services/load-home-page";

export default async function HomePage() {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) redirect("/login");

  const data = await loadHomePageData(userSub);

  return (
    <CoreShellPage>
      <HomeDashboard data={data} />
    </CoreShellPage>
  );
}
