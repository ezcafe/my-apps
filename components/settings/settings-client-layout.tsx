"use client";

import type { ReactNode } from "react";
import {
  SETTINGS_CATEGORIES,
  type SettingsCategoryId,
} from "./settings-types";
import { SettingsPageLayout } from "./settings-page-layout";

type Props = {
  appearanceContent: ReactNode;
  kioskContent: ReactNode;
  accountContent: ReactNode;
  workspacesContent: ReactNode;
  apiTokensContent: ReactNode;
  dangerZoneContent: ReactNode;
  dbUnavailableAlert?: ReactNode;
};

export function SettingsClientLayout({
  appearanceContent,
  kioskContent,
  accountContent,
  workspacesContent,
  apiTokensContent,
  dangerZoneContent,
  dbUnavailableAlert,
}: Props) {
  return (
    <SettingsPageLayout<SettingsCategoryId>
      categories={SETTINGS_CATEGORIES}
      topAlert={dbUnavailableAlert}
      searchPlaceholder="Search settings (e.g. appearance, tokens, workspaces)…"
      idPrefix="settings"
      sections={{
        appearance: appearanceContent,
        kiosk: kioskContent,
        account: accountContent,
        workspaces: workspacesContent,
        "api-tokens": apiTokensContent,
        "danger-zone": dangerZoneContent,
      }}
    />
  );
}
