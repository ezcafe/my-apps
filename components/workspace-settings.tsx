"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useCallback, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { WorkspaceAppKey } from "@/db/schema/workspace";

type WorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  ownedByUserSub: string | null;
  defaultCurrency: string | null;
  role: "owner" | "member";
  isDefault: boolean;
};

async function fetchWorkspaceList(app: WorkspaceAppKey): Promise<WorkspaceRow[]> {
  const res = await fetch(`/api/workspace/list?app=${app}`, {
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as {
    data?: WorkspaceRow[];
    error?: string;
  } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? res.statusText ?? "Request failed");
  }
  return body?.data ?? [];
}

async function fetchDefaultWorkspaceId(
  app: WorkspaceAppKey,
): Promise<string | null> {
  const res = await fetch(`/api/workspace/default?app=${app}`, {
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as {
    data?: { defaultWorkspaceId: string | null };
    error?: string;
  } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? res.statusText ?? "Request failed");
  }
  return body?.data?.defaultWorkspaceId ?? null;
}

function DefaultWorkspaceForm({
  app,
  appLabel,
  description,
  workspaceList,
  value,
  onChange,
  onSaved,
}: {
  app: WorkspaceAppKey;
  appLabel: string;
  description: string;
  workspaceList: WorkspaceRow[];
  value: string;
  onChange: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const notify = useNotify();

  return (
    <li className="py-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-6 text-foreground">
            Default workspace for {appLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <form
          className="grid w-full gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const dr = await fetch("/api/workspace/default", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  workspaceId: value,
                  app,
                }),
              });
              const dbody = (await dr.json().catch(() => null)) as {
                error?: string;
              } | null;
              if (!dr.ok) {
                throw new Error(dbody?.error ?? dr.statusText ?? "Request failed");
              }
              await onSaved();
              notify.success("Settings updated", "Default workspace saved.");
            } catch (err: unknown) {
              notify.error(
                "Couldn’t save default workspace",
                toUserFacingMessage(err, "Something went wrong"),
              );
            }
          }}
        >
          <Field label="Workspace">
            <Select value={value} onChange={(e) => onChange(e.target.value)}>
              {workspaceList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.kind === "shared" ? " (shared)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-fit"
            disabled={!value}
          >
            Save
          </Button>
        </form>
      </div>
    </li>
  );
}

export function WorkspaceSettings({
  initialWorkspaces = [],
  initialDefaultWorkspaceId = null,
}: {
  initialWorkspaces?: WorkspaceRow[];
  initialDefaultWorkspaceId?: string | null;
}) {
  const notify = useNotify();

  const [workspaceList, setWorkspaceList] = useState<WorkspaceRow[]>(initialWorkspaces);
  const [moneyDefaultPick, setMoneyDefaultPick] = useState(
    () => initialDefaultWorkspaceId ?? initialWorkspaces[0]?.id ?? "",
  );
  const [newSharedName, setNewSharedName] = useState("");
  const [newSharedCurrency, setNewSharedCurrency] = useState("USD");
  const [seedMoneyOnShared, setSeedMoneyOnShared] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const refreshWorkspaceContext = useCallback(async () => {
    const [workspaces, moneyDefaultId] = await Promise.all([
      fetchWorkspaceList("money"),
      fetchDefaultWorkspaceId("money"),
    ]);
    setWorkspaceList(workspaces);
    const fallback = workspaces[0]?.id ?? "";
    setMoneyDefaultPick(moneyDefaultId ?? fallback);
    setLoadErr(null);
  }, []);


  return (
    <SettingsSection
      id="settings-workspaces"
      title="Workspaces"
      description="Shared workspaces are used by Money (transactions, investments, and loans). Money remembers your default when you open it without an active workspace cookie."
    >
      {loadErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={loadErr}
          className="mb-6"
        />
      ) : null}

      <ul role="list" className="divide-y divide-border border-t border-border">
        <li className="py-6">
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-6 text-foreground">
                New shared workspace
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Create a workspace others can join; optionally seed Money
                accounts and categories.
              </p>
            </div>
            <form
              className="grid w-full gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (!newSharedName.trim()) throw new Error("Name required");
                  await fetch("/api/workspace", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      name: newSharedName.trim(),
                      defaultCurrency: newSharedCurrency,
                      ...(seedMoneyOnShared ? { seedApp: "money" as const } : {}),
                    }),
                  }).then(async (r) => {
                    const body = (await r.json().catch(() => null)) as {
                      error?: string;
                    } | null;
                    if (!r.ok) {
                      throw new Error(body?.error ?? r.statusText ?? "Request failed");
                    }
                  });
                  setNewSharedName("");
                  setNewSharedCurrency("USD");
                  await refreshWorkspaceContext();
                  notify.success("Settings updated", "Shared workspace created.");
                } catch (err: unknown) {
                  notify.error(
                    "Couldn’t create workspace",
                    toUserFacingMessage(err, "Something went wrong"),
                  );
                }
              }}
            >
              <Field label="Name" required>
                <Input
                  placeholder="Family"
                  value={newSharedName}
                  onChange={(e) => setNewSharedName(e.target.value)}
                />
              </Field>
              <Field label="Default currency">
                <Select
                  value={newSharedCurrency}
                  onChange={(e) => setNewSharedCurrency(e.target.value)}
                >
                  {["USD", "VND", "EUR", "GBP", "JPY"].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-center gap-2 text-sm text-muted">
                <Checkbox
                  checked={seedMoneyOnShared}
                  onChange={() => setSeedMoneyOnShared((v) => !v)}
                  ariaLabel="Seed Money accounts and categories"
                />
                <span>Seed Money accounts &amp; categories</span>
              </div>
              <Button type="submit" variant="primary" size="md" className="w-fit">
                Create workspace
              </Button>
            </form>
          </div>
        </li>

        {workspaceList.length > 1 ? (
          <>
            <DefaultWorkspaceForm
              app="money"
              appLabel="Money"
              description="Choose which workspace loads when you open Money without an active cookie."
              workspaceList={workspaceList}
              value={moneyDefaultPick}
              onChange={setMoneyDefaultPick}
              onSaved={refreshWorkspaceContext}
            />
          </>
        ) : null}
      </ul>
    </SettingsSection>
  );
}
