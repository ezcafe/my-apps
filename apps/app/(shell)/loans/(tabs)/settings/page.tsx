import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const LoansSettingsNotificationsLazy = dynamic(
  () =>
    import("@/components/loans-settings/loans-settings-notifications").then(
      (mod) => ({
        default: mod.LoansSettingsNotifications,
      }),
    ),
  {
    loading: () => <Skeleton className="h-48 w-full max-w-4xl" />,
  },
);

export default function LoansSettingsPage() {
  return <LoansSettingsNotificationsLazy />;
}
