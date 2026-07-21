import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const SavingsSettingsPageLazy = dynamic(
  () =>
    import("@/components/savings-settings-page").then((mod) => ({
      default: mod.SavingsSettingsPage,
    })),
  {
    loading: () => <Skeleton className="h-48 w-full max-w-4xl" />,
  },
);

export default function SavingsSettingsRoute() {
  return <SavingsSettingsPageLazy />;
}
