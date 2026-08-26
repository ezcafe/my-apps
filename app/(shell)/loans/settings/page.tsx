import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

function SettingsPageSkeleton() {
  return (
    <section className={`${MONEY_FULL_SPAN} w-full`}>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="size-4 shrink-0 rounded-full" />
      </div>
      <div className="mt-4 space-y-4">
        <Skeleton className="h-4 w-64 max-w-full rounded-[var(--radius-sm)]" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-12 w-64 max-w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-12 w-44 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </section>
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
