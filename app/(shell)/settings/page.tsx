import Link from "next/link";
import { auth } from "@/auth";
import { listApiTokensForUser } from "@/lib/api-token-service";
import { fetchWorkspacesForUser } from "@/lib/workspace-list";
import { SettingsSection } from "@/components/settings/settings-section";
import { ApiTokenSettings } from "@/components/api-token-settings";
import { CoreShellPage } from "@/components/core-shell-page";
import { DateFormatSettings } from "@/components/date-format-settings";
import { WeatherCitySettings } from "@/components/kiosk/weather-city-settings";
import { KioskWidgetSettings } from "@/components/kiosk/kiosk-widget-settings";
import { ThemeSettings } from "@/components/theme-settings";
import { WorkspaceSettings } from "@/components/workspace-settings";
import { WorkspaceResetSettings } from "@/components/workspace-reset-settings";
import { Alert } from "@/components/ui/alert";
import { isDbUnreachable } from "@/lib/db-errors";
import { DEFAULT_KIOSK_WIDGETS } from "@/lib/kiosk/widget-registry";
import { getUserPreferences } from "@/lib/user-preferences-service";
import { SettingsClientLayout } from "@/components/settings/settings-client-layout";

async function loadSettingsDbData(userSub: string) {
  try {
    const [{ workspaces, defaultWorkspaceId }, apiTokens, preferences] =
      await Promise.all([
      fetchWorkspacesForUser(userSub, "money"),
      listApiTokensForUser(userSub),
      getUserPreferences(userSub),
    ]);
    return {
      workspaces,
      defaultWorkspaceId,
      apiTokens,
      weatherCity: preferences.weatherCity,
      kioskWidgets: preferences.kioskWidgets,
      dbUnavailable: false as const,
    };
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        workspaces: [],
        defaultWorkspaceId: null,
        apiTokens: [],
        weatherCity: null,
        kioskWidgets: [...DEFAULT_KIOSK_WIDGETS],
        dbUnavailable: true as const,
      };
    }
    throw e;
  }
}

export default async function SettingsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const { workspaces, defaultWorkspaceId, apiTokens, weatherCity, kioskWidgets, dbUnavailable } = userSub
    ? await loadSettingsDbData(userSub)
    : {
        workspaces: [],
        defaultWorkspaceId: null,
        apiTokens: [],
        weatherCity: null,
        kioskWidgets: [],
        dbUnavailable: false as const,
      };

  return (
    <CoreShellPage>
      <SettingsClientLayout
        dbUnavailableAlert={
          dbUnavailable ? (
            <Alert
              variant="warning"
              title="Database temporarily unavailable"
              description="Profile and appearance settings still work. Workspace and API token changes need PostgreSQL — check that the database is running or review DATABASE_URL."
            />
          ) : null
        }
        appearanceContent={
          <SettingsSection
            id="settings-appearance"
            title="Appearance"
            description="Light, dark, or match your OS."
          >
            <ThemeSettings embedded />
          </SettingsSection>
        }
        dateFormatContent={
          <SettingsSection
            id="settings-date-format"
            title="Date format"
            description="How dates appear across the app."
          >
            <DateFormatSettings embedded />
          </SettingsSection>
        }
        kioskContent={
          <SettingsSection
            id="settings-kiosk"
            title="Kiosk"
            description="Widgets and weather for your kiosk dashboard."
          >
            <KioskWidgetSettings initialWidgets={kioskWidgets} />
            <div className="mt-8 border-t border-border pt-8">
              <WeatherCitySettings embedded initialCity={weatherCity} />
            </div>
          </SettingsSection>
        }
        accountContent={
          <SettingsSection
            id="settings-account"
            title="Account"
            description="Profile comes from your Pocket ID OIDC claims."
          >
            <dl className="divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-3 py-2.5">
                <dt className="text-muted">Name</dt>
                <dd className="min-w-0 font-medium text-foreground">
                  {session?.user?.name ?? "—"}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-3 py-2.5">
                <dt className="text-muted">Email</dt>
                <dd className="min-w-0 text-foreground">
                  {session?.user?.email ?? "—"}
                </dd>
              </div>
            </dl>

            <details className="mt-4 rounded-[var(--radius-sm)] bg-background">
              <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-200 hover:text-foreground [&::-webkit-details-marker]:hidden">
                Advanced
              </summary>
              <dl className="border-t border-border text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-3 py-2.5">
                  <dt className="text-muted">Subject</dt>
                  <dd className="min-w-0 max-w-full font-mono text-sm break-all text-foreground">
                    {session?.user?.id ?? "—"}
                  </dd>
                </div>
              </dl>
            </details>
          </SettingsSection>
        }
        workspacesContent={
          <WorkspaceSettings
            initialWorkspaces={workspaces}
            initialDefaultWorkspaceId={defaultWorkspaceId}
          />
        }
        apiTokensContent={
          <SettingsSection
            id="settings-api-tokens"
            title="API tokens"
            description={
              <>
                Bearer tokens for Postman, scripts, and automation.{" "}
                <Link
                  href="/help"
                  className="font-medium text-accent underline-offset-4 hover:underline"
                >
                  API tutorial
                </Link>{" "}
                on the Help page.
              </>
            }
          >
            <ApiTokenSettings
              embedded
              initialWorkspaces={workspaces.map((w) => ({
                id: w.id,
                name: w.name,
                kind: w.kind,
                isDefault: w.isDefault,
              }))}
              initialTokens={apiTokens}
            />
          </SettingsSection>
        }
        dangerZoneContent={<WorkspaceResetSettings workspaces={workspaces} />}
      />
    </CoreShellPage>
  );
}
