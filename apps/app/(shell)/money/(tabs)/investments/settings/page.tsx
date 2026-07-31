import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SettingsPageSkeleton() {
  return (
    <Card className="w-full max-w-4xl space-y-4 p-5">
      <Skeleton className="h-6 w-48 rounded-[var(--radius-sm)]" />
      <Skeleton className="h-3 w-12 rounded-[var(--radius-sm)]" />
      <Skeleton className="h-24 w-full rounded-[var(--radius-sm)]" />
      <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
    </Card>
  );
}

const InvestmentSettingsPageLazy = dynamic(
  () =>
    import("@/components/investment-settings-page").then((mod) => ({
      default: mod.InvestmentSettingsPage,
    })),
  {
    loading: () => <SettingsPageSkeleton />,
  },
);

export default function MoneyInvestmentSettingsPage() {
  return <InvestmentSettingsPageLazy />;
}
