"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useNotify } from "@/components/notification-provider";
import type { ApiTokenListItem } from "@/lib/api-token-service";
import type { ApiTokenScope } from "@/db/schema/api-token";
import { MoneyStatusEmphasis, MoneyStatusStrip } from "@/lib/money-status-strip";
import {
  SHAREABLE_WORKSPACE_APP_KEYS,
  type ShareableWorkspaceAppKey,
} from "@/lib/workspace-shareable-apps";

type WorkspaceRow = {
  id: string;
  name: string;
  kind: string;
  isDefault: boolean;
};

const APP_LABELS: Record<ShareableWorkspaceAppKey, string> = {
  money: "Money",
  baby: "Baby Care",
};

function TokenCreateForm({
  apps,
  toggleApp,
  name,
  setName,
  workspaceId,
  setWorkspaceId,
  workspaces,
  writeScope,
  setWriteScope,
  creating,
  createToken,
}: {
  apps: Record<ShareableWorkspaceAppKey, boolean>;
  toggleApp: (key: ShareableWorkspaceAppKey) => void;
  name: string;
  setName: (name: string) => void;
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
  workspaces: WorkspaceRow[];
  writeScope: boolean;
  setWriteScope: (fn: (v: boolean) => boolean) => void;
  creating: boolean;
  createToken: () => void;
}) {
  const anyApp = SHAREABLE_WORKSPACE_APP_KEYS.some((k) => apps[k]);
  return (
    <div className="space-y-4 rounded-[var(--radius-sm)] bg-background p-4">
      <div className="grid gap-3">
        <Field label="Apps">
          <div className="flex flex-col gap-2">
            {SHAREABLE_WORKSPACE_APP_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <Checkbox
                  checked={apps[key]}
                  onChange={() => toggleApp(key)}
                  ariaLabel={APP_LABELS[key]}
                />
                <span>{APP_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </Field>
        <Field label="Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. nightly backup"
            maxLength={120}
            required
          />
        </Field>
        <Field label="Workspace" required>
          <Select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
                {w.isDefault ? " (default)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={writeScope}
            onChange={() => setWriteScope((v) => !v)}
            ariaLabel="Allow write (mutations, imports)"
          />
          <span>Allow write (mutations, imports)</span>
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        disabled={creating || !workspaceId || !anyApp}
        onClick={() => void createToken()}
      >
        {creating ? "Creating…" : "Create token"}
      </Button>
    </div>
  );
}

function TokenList({
  tokens,
  workspaceName,
  revokingId,
  revoke,
}: {
  tokens: ApiTokenListItem[];
  workspaceName: (id: string) => string;
  revokingId: string | null;
  revoke: (id: string) => void;
}) {
  if (tokens.length === 0) {
    return <p className="text-sm text-muted">No API tokens yet.</p>;
  }

  return (
    <ul
      role="list"
      className="divide-y divide-border rounded-[var(--radius-sm)] bg-background"
    >
      {tokens.map((t) => (
        <li
          key={t.id}
          className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{t.name}</p>
            <p className="mt-1 font-mono text-sm text-muted">
              {t.keyPrefix}… ·{" "}
              {(t.apps?.length ? t.apps : [t.appKey]).join(", ")} ·{" "}
              {workspaceName(t.workspaceId)} · {t.scopes.join(", ")}
            </p>
            <p className="mt-1 text-sm text-muted">
              Created {new Date(t.createdAt).toLocaleString()}
              {t.lastUsedAt
                ? ` · Last used ${new Date(t.lastUsedAt).toLocaleString()}`
                : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={revokingId === t.id}
            onClick={() => void revoke(t.id)}
          >
            {revokingId === t.id ? "Revoking…" : "Revoke"}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function ApiTokenSettings({
  embedded,
  initialWorkspaces,
  initialTokens,
}: {
  embedded?: boolean;
  initialWorkspaces: WorkspaceRow[];
  initialTokens: ApiTokenListItem[];
}) {
  const notify = useNotify();
  const [apps, setApps] = useState<Record<ShareableWorkspaceAppKey, boolean>>({
    money: true,
    baby: false,
  });
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [tokens, setTokens] = useState(initialTokens);
  const defaultWs = workspaces.find((w) => w.isDefault) ?? workspaces[0];
  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState(defaultWs?.id ?? "");

  const listApp: ShareableWorkspaceAppKey = apps.money
    ? "money"
    : apps.baby
      ? "baby"
      : "money";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/workspace/list?app=${listApp}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: WorkspaceRow[] };
      if (cancelled) return;
      const list = json.data ?? [];
      setWorkspaces(list);
      const pick = list.find((w) => w.isDefault) ?? list[0];
      if (pick) setWorkspaceId(pick.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [listApp]);

  const [writeScope, setWriteScope] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const workspaceName = (id: string) =>
    workspaces.find((w) => w.id === id)?.name ?? id.slice(0, 8);

  const toggleApp = (key: ShareableWorkspaceAppKey) => {
    setApps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const refreshTokens = async () => {
    const res = await fetch("/api/tokens", { credentials: "include" });
    if (res.ok) {
      const json = (await res.json()) as { data: ApiTokenListItem[] };
      setTokens(json.data);
    }
  };

  const createToken = async () => {
    const selected = SHAREABLE_WORKSPACE_APP_KEYS.filter((k) => apps[k]);
    if (!name.trim() || !workspaceId || selected.length === 0) {
      notify.error("Name, workspace, and at least one app are required");
      return;
    }
    setCreating(true);
    try {
      const scopes: ApiTokenScope[] = writeScope
        ? ["read", "write"]
        : ["read"];
      const res = await fetch("/api/tokens", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          workspaceId,
          apps: selected,
          scopes,
        }),
      });
      const json = (await res.json()) as {
        data?: { token: string; item: ApiTokenListItem };
        error?: string;
      };
      if (!res.ok) {
        notify.error("Could not create token", json.error ?? res.statusText);
        return;
      }
      if (json.data?.token) {
        setRevealedToken(json.data.token);
        setName("");
        notify.success(
          "API token created",
          "Copy it now — it won't be shown again.",
        );
        await refreshTokens();
      }
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/tokens/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 204) {
        notify.success("Token revoked");
        setTokens((prev) => prev.filter((t) => t.id !== id));
      } else {
        notify.error("Could not revoke token");
      }
    } finally {
      setRevokingId(null);
    }
  };

  const copyRevealed = async () => {
    if (!revealedToken) return;
    try {
      await navigator.clipboard.writeText(revealedToken);
      notify.success("Copied to clipboard");
    } catch {
      notify.error("Copy failed", "Select and copy the token manually.");
    }
  };

  const createFormProps = {
    apps,
    toggleApp,
    name,
    setName,
    workspaceId,
    setWorkspaceId,
    workspaces,
    writeScope,
    setWriteScope,
    creating,
    createToken,
  };

  const hasTokens = tokens.length > 0;

  return (
    <>
      {!embedded ? (
        <h2 className="font-display text-lg font-medium tracking-tight">
          API tokens
        </h2>
      ) : null}
      {!embedded ? (
        <p className="text-sm text-muted">
          Personal Bearer tokens for Postman, scripts, and Watch apps. Each token
          is bound to one workspace. Toggle <strong>Money</strong> and/or{" "}
          <strong>Baby Care</strong> access, then send{" "}
          <code className="rounded-[var(--radius-sm)] bg-muted-surface px-1 py-0.5 font-mono text-sm">
            Authorization: Bearer mny_…
          </code>{" "}
          on GraphQL requests for the apps you enabled.
        </p>
      ) : null}

      {hasTokens ? (
        <MoneyStatusStrip className="mb-4">
          <MoneyStatusEmphasis>{tokens.length}</MoneyStatusEmphasis>{" "}
          active {tokens.length === 1 ? "token" : "tokens"}
        </MoneyStatusStrip>
      ) : null}

      {hasTokens ? (
        <>
          <div>
            <h3 className="text-sm font-medium text-foreground">Active tokens</h3>
            <div className="mt-3">
              <TokenList
                tokens={tokens}
                workspaceName={workspaceName}
                revokingId={revokingId}
                revoke={revoke}
              />
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-medium text-foreground">New token</h3>
            <div className="mt-3">
              <TokenCreateForm {...createFormProps} />
            </div>
          </div>
        </>
      ) : (
        <>
          <TokenCreateForm {...createFormProps} />
          <div className="mt-6">
            <h3 className="text-sm font-medium text-foreground">Active tokens</h3>
            <div className="mt-3">
              <TokenList
                tokens={tokens}
                workspaceName={workspaceName}
                revokingId={revokingId}
                revoke={revoke}
              />
            </div>
          </div>
        </>
      )}

      <Modal
        open={revealedToken !== null}
        onClose={() => setRevealedToken(null)}
        title="Copy your API token"
      >
        <p className="text-sm text-muted">
          Store this token securely. You will not be able to see it again.
        </p>
        <pre className="mt-3 max-h-32 overflow-auto rounded-[var(--radius-md)] border border-border bg-muted-surface p-3 font-mono text-sm break-all text-foreground">
          {revealedToken}
        </pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={() => void copyRevealed()}>
            Copy
          </Button>
          <Button type="button" variant="ghost" onClick={() => setRevealedToken(null)}>
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}
