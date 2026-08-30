import dynamic from "next/dynamic";
import LoansSettingsLoading from "./loading";

const LoansSettingsNotificationsLazy = dynamic(
  () =>
    import("@/components/loans-settings/loans-settings-notifications").then(
      (mod) => ({
        default: mod.LoansSettingsNotifications,
      }),
    ),
  {
    loading: () => <LoansSettingsLoading />,
  },
);

export default function MoneyLoansSettingsPage() {
  return <LoansSettingsNotificationsLazy />;
}
