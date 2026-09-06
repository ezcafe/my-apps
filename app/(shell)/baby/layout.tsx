import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { BabyRouteChrome } from "@/components/baby-route-layout";
import { BabyWorkspaceProvider } from "@/components/baby-workspace-provider";
import {
  BABY_LOCALE_COOKIE,
  parseBabyLocale,
} from "@/lib/baby-i18n";

/** Baby Care layout — QueryClient + locale + Money-style chrome (no shell rail). */
export default async function BabyLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const initialLocale = parseBabyLocale(
    cookieStore.get(BABY_LOCALE_COOKIE)?.value,
  );

  return (
    <BabyWorkspaceProvider initialLocale={initialLocale}>
      <BabyRouteChrome>{children}</BabyRouteChrome>
    </BabyWorkspaceProvider>
  );
}
