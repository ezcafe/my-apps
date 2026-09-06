import { BabySettingsSkeleton } from "@/components/baby-page-skeleton";
import { isTelegramEnabled } from "@/lib/telegram/config";

export default function BabySettingsLoading() {
  return <BabySettingsSkeleton telegramEnabled={isTelegramEnabled()} />;
}
