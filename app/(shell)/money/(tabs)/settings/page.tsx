import dynamic from "next/dynamic";
import { MoneyTabContentFallback } from "@/components/money-tab-content-fallback";

const MoneyWorkspaceSettingsLazy = dynamic(
  () =>
    import("@/components/money-workspace-settings").then((mod) => ({
      default: mod.MoneyWorkspaceSettings,
    })),
  { loading: () => <MoneyTabContentFallback /> },
);

export default function MoneySettingsPage() {
  return <MoneyWorkspaceSettingsLazy />;
}
