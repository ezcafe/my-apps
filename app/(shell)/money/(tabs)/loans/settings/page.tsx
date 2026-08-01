import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SettingsPageSkeleton() {
  return (
    <Card className="w-full">
      <div className="p-5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="size-4 shrink-0 rounded-full" />
        </div>
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
          </div>
        </div>
      </div>
    </Card>
  );
}

const LoansSettingsNotificationsLazy = dynamic(
  () =>
    import("@/components/loans-settings/loans-settings-notifications").then(
      (mod) => ({
        default: mod.LoansSettingsNotifications,
      }),
    ),
  {
    loading: () => <SettingsPageSkeleton />,
  },
);

export default function MoneyLoansSettingsPage() {
  return <LoansSettingsNotificationsLazy />;
}
