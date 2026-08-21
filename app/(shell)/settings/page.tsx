import Link from "next/link";
import { auth } from "@/auth";
import { listApiTokensForUser } from "@/lib/api-token-service";
import { fetchWorkspacesForUser } from "@/lib/workspace-list";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";
import { ApiTokenSettings } from "@/components/api-token-settings";
import { DateFormatSettings } from "@/components/date-format-settings";
import { ThemeSettings } from "@/components/theme-settings";
import { WorkspaceSettings } from "@/components/workspace-settings";
import { Alert } from "@/components/ui/alert";
import { ShellMainPage } from "@/components/shell-main-page";
import { isDbUnreachable } from "@/lib/db-errors";

async function loadSettingsDbData(userSub: string) {
  try {
    const [{ workspaces, defaultWorkspaceId }, apiTokens] = await Promise.all([
      fetchWorkspacesForUser(userSub, "money"),
      listApiTokensForUser(userSub),
    ]);
    return {
      workspaces,
      defaultWorkspaceId,
      apiTokens,
      dbUnavailable: false as const,
    };
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        workspaces: [],
        defaultWorkspaceId: null,
        apiTokens: [],
        dbUnavailable: true as const,
      };
    }
    throw e;
  }
}

export default async function SettingsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const { workspaces, defaultWorkspaceId, apiTokens, dbUnavailable } = userSub
    ? await loadSettingsDbData(userSub)
    : {
        workspaces: [],
        defaultWorkspaceId: null,
        apiTokens: [],
        dbUnavailable: false as const,
      };

  return (
    <ShellMainPage title="Settings">
      {dbUnavailable ? (
        <Alert
          variant="warning"
          title="Database unavailable"
          description="Cannot reach PostgreSQL. Start the database (from the apps folder: docker compose -f docker-compose-db.yml up -d) or fix DATABASE_URL."
        />
      ) : null}

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
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-3 py-2.5">
            <dt className="text-muted">Subject</dt>
            <dd className="min-w-0 max-w-full font-mono text-sm break-all text-foreground">
              {session?.user?.id ?? "—"}
            </dd>
          </div>
        </dl>
      </SettingsSection>

      <SettingsSection
        id="settings-appearance"
        title="Appearance"
        description="Light, dark, or match your OS."
      >
        <ThemeSettings embedded />
      </SettingsSection>

      <SettingsSection
        id="settings-date-format"
        title="Date format"
        description="How dates appear across the app."
      >
        <DateFormatSettings embedded />
      </SettingsSection>

      <WorkspaceSettings
        initialWorkspaces={workspaces}
        initialDefaultWorkspaceId={defaultWorkspaceId}
      />

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
    </ShellMainPage>
  );
}
