import { auth } from "@/auth";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";
import { ThemeSettings } from "@/components/theme-settings";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 py-8 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-8">
      <header className="col-span-2 md:col-span-6 lg:col-span-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Settings
        </h1>
      </header>

      <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">
        <div className="space-y-6">
          <SettingsSection
            id="settings-account"
            title="Account"
            description="Profile comes from your Pocket ID OIDC claims."
          >
            <ul
              role="list"
              className="divide-y divide-border border-t border-border"
            >
              <li className="py-6">
                <div className="flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-6 text-foreground">
                      Signed-in identity
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Subject, email, and display name from your IdP session.
                    </p>
                  </div>
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-muted">Subject</dt>
                      <dd className="mt-1 font-mono text-xs break-all text-foreground">
                        {session?.user?.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Email</dt>
                      <dd className="mt-1 text-foreground">
                        {session?.user?.email ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Name</dt>
                      <dd className="mt-1 text-foreground">
                        {session?.user?.name ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            </ul>
          </SettingsSection>

          <SettingsSection
            id="settings-appearance"
            title="Appearance"
            description="Choose light, dark, or follow your system preference."
          >
            <ThemeSettings embedded />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
