import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const InvestmentSettingsPageLazy = dynamic(
  () =>
    import("@/components/investment-settings-page").then((mod) => ({
      default: mod.InvestmentSettingsPage,
    })),
  {
    loading: () => <Skeleton className="h-48 w-full max-w-4xl" />,
  },
);

export default function MoneyInvestmentSettingsPage() {
  return <InvestmentSettingsPageLazy />;
}
