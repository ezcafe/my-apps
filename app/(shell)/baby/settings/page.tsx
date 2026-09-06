import { BabySettingsPage } from "@/components/baby-settings-page";
import { isTelegramEnabled } from "@/lib/telegram/config";

export default function BabySettingsRoute() {
  return <BabySettingsPage telegramEnabled={isTelegramEnabled()} />;
}
