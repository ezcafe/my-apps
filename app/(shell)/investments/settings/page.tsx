import dynamic from "next/dynamic";
import InvestmentSettingsLoading from "./loading";

const InvestmentWorkspaceSettingsLazy = dynamic(
  () =>
    import("@/components/investment-settings/investment-workspace-settings").then(
      (mod) => ({
        default: mod.InvestmentWorkspaceSettings,
      }),
    ),
  { loading: () => <InvestmentSettingsLoading /> },
);

export default function InvestmentSettingsPage() {
  return <InvestmentWorkspaceSettingsLazy />;
}
