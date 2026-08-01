import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SettingsPageSkeleton() {
  return (
    <Card className="w-full">
      <div className="p-5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-36 rounded-[var(--radius-sm)]" />
          <Skeleton className="size-4 shrink-0 rounded-full" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="divide-y divide-border rounded-[var(--radius-sm)] bg-background">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={`instrument-row-${i}`}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
                </div>
                <Skeleton className="size-8 shrink-0 rounded-[var(--radius-md)]" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
        </div>
      </div>
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
