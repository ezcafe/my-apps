"use client";

import type { ReactNode } from "react";
import {
  SETTINGS_CATEGORIES,
  type SettingsCategoryId,
} from "./settings-types";
import { SettingsPageLayout } from "./settings-page-layout";

type Props = {
  appearanceContent: ReactNode;
  accountContent: ReactNode;
  workspacesContent: ReactNode;
  apiTokensContent: ReactNode;
  appleWalletContent: ReactNode;
  dangerZoneContent: ReactNode;
  dbUnavailableAlert?: ReactNode;
};

export function SettingsClientLayout({
  appearanceContent,
  accountContent,
  workspacesContent,
  apiTokensContent,
  appleWalletContent,
  dangerZoneContent,
  dbUnavailableAlert,
}: Props) {
  return (
    <SettingsPageLayout<SettingsCategoryId>
      categories={SETTINGS_CATEGORIES}
      topAlert={dbUnavailableAlert}
      searchPlaceholder="Search settings (e.g. appearance, tokens, wallet)…"
      idPrefix="settings"
      sections={{
        appearance: appearanceContent,
        account: accountContent,
        workspaces: workspacesContent,
        "api-tokens": apiTokensContent,
        "apple-wallet": appleWalletContent,
        "danger-zone": dangerZoneContent,
      }}
    />
  );
}
