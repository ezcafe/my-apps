"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { SHAREABLE_WORKSPACE_APP_KEYS } from "@/lib/workspace-shareable-apps";

type MemberRow = {
  userSub: string;
  email: string | null;
  role: "owner" | "member";
  apps: string[];
};

const APP_LABELS: Record<(typeof SHAREABLE_WORKSPACE_APP_KEYS)[number], string> = {
  money: "Money",
  baby: "Baby Care",
};

async function fetchMembers(workspaceId: string): Promise<MemberRow[]> {
  const res = await fetch(
    `/api/workspace/members?workspaceId=${encodeURIComponent(workspaceId)}`,
    { credentials: "include" },
  );
  const body = (await res.json().catch(() => null)) as {
    data?: MemberRow[];
    error?: string;
  } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? res.statusText ?? "Request failed");
  }
  return body?.data ?? [];
}

export function WorkspaceMembersPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const notify = useNotify();
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [addApps, setAddApps] = useState<Record<string, boolean>>({
    money: true,
    baby: false,
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchMembers(workspaceId);
      setMembers(rows);
      setLoadErr(null);
    } catch (err: unknown) {
      setLoadErr(toUserFacingMessage(err, "Could not load members"));
      setMembers([]);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveMemberApps(userSub: string, apps: string[]) {
    setBusy(true);
    try {
      const res = await fetch("/api/workspace/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workspaceId, userSub, apps }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? res.statusText);
      await refresh();
      notify.success("Settings updated", "Member apps saved.");
    } catch (err: unknown) {
      notify.error(
        "Couldn't update apps",
        toUserFacingMessage(err, "Something went wrong"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-sm font-medium text-foreground">{workspaceName}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">
        Shared · grant apps per member — not the whole workspace to every app.
      </p>

      {loadErr ? (
        <p className="mt-3 text-sm text-destructive-muted-text">{loadErr}</p>
      ) : null}

      {members === null ? (
        <div
          className="mt-3 h-24 animate-pulse rounded-[var(--radius-sm)] bg-muted-surface"
          aria-hidden
        />
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-[var(--radius-sm)] border border-border bg-surface text-sm">
          {members.map((m) => (
            <li key={m.userSub} className="px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <span className="font-medium text-foreground">
                  {m.email ?? m.userSub}
                </span>
                <span className="text-muted">
                  {m.role === "owner" ? "Owner · All apps" : "Member"}
                </span>
              </div>
              {m.role === "member" ? (
                <div className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(8rem,1fr))]">
                  {SHAREABLE_WORKSPACE_APP_KEYS.map((app) => {
                    const checked = m.apps.includes(app);
                    return (
                      <div
                        key={app}
                        className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-muted-surface px-2.5 py-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={busy}
                          ariaLabel={`${APP_LABELS[app]} for ${m.email ?? m.userSub}`}
                          onChange={() => {
                            const next = checked
                              ? m.apps.filter((a) => a !== app)
                              : [...m.apps, app];
                            if (next.length === 0) {
                              notify.error(
                                "Keep at least one app",
                                "Members need at least one shareable app.",
                              );
                              return;
                            }
                            void saveMemberApps(m.userSub, next);
                          }}
                        />
                        <span>{APP_LABELS[app]}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {m.role === "member" ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm text-muted"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const res = await fetch("/api/workspace/members/remove", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            workspaceId,
                            userSub: m.userSub,
                          }),
                        });
                        const body = (await res.json().catch(() => null)) as {
                          error?: string;
                        } | null;
                        if (!res.ok) throw new Error(body?.error ?? res.statusText);
                        await refresh();
                        notify.success("Settings updated", "Member removed.");
                      } catch (err: unknown) {
                        notify.error(
                          "Couldn't remove member",
                          toUserFacingMessage(err, "Something went wrong"),
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-6 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const apps = SHAREABLE_WORKSPACE_APP_KEYS.filter((a) => addApps[a]);
          if (apps.length === 0) {
            notify.error("Select an app", "Choose at least one app to share.");
            return;
          }
          setBusy(true);
          try {
            const res = await fetch("/api/workspace/members", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                workspaceId,
                email: email.trim(),
                apps,
              }),
            });
            const body = (await res.json().catch(() => null)) as {
              error?: string;
            } | null;
            if (!res.ok) throw new Error(body?.error ?? res.statusText);
            setEmail("");
            await refresh();
            notify.success("Settings updated", "Member added.");
          } catch (err: unknown) {
            notify.error(
              "Couldn't add member",
              toUserFacingMessage(err, "Something went wrong"),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-sm font-medium text-foreground">Add member</p>
        <p className="text-sm leading-6 text-muted">
          Enter their account email. Choose at least one app. They must have signed
          in once.
        </p>
        <Field label="Email" required>
          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(8rem,1fr))]">
          {SHAREABLE_WORKSPACE_APP_KEYS.map((app) => (
            <div
              key={app}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-muted-surface px-2.5 py-2 text-sm"
            >
              <Checkbox
                checked={Boolean(addApps[app])}
                ariaLabel={APP_LABELS[app]}
                onChange={() =>
                  setAddApps((prev) => ({ ...prev, [app]: !prev[app] }))
                }
              />
              <span>{APP_LABELS[app]}</span>
            </div>
          ))}
        </div>
        <Button type="submit" variant="primary" className="w-fit" disabled={busy}>
          Add member
        </Button>
      </form>
    </div>
  );
}
