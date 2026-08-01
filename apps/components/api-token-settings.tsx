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
import type { ApiTokenAppKey } from "@/lib/api-auth";
import { API_TOKEN_APP_KEYS } from "@/lib/api-token-app-keys";

type WorkspaceRow = {
  id: string;
  name: string;
  kind: string;
  isDefault: boolean;
};

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
  const [appKey, setAppKey] = useState<ApiTokenAppKey>("money");
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [tokens, setTokens] = useState(initialTokens);
  const defaultWs =
    workspaces.find((w) => w.isDefault) ?? workspaces[0];
  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState(defaultWs?.id ?? "");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/workspace/list?app=${appKey}`, {
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
  }, [appKey]);
  const [writeScope, setWriteScope] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const workspaceName = (id: string) =>
    workspaces.find((w) => w.id === id)?.name ?? id.slice(0, 8);

  const refreshTokens = async () => {
    const res = await fetch("/api/tokens", { credentials: "include" });
    if (res.ok) {
      const json = (await res.json()) as { data: ApiTokenListItem[] };
      setTokens(json.data);
    }
  };

  const createToken = async () => {
    if (!name.trim() || !workspaceId) {
      notify.error("Name and workspace are required");
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
          appKey,
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

  return (
    <>
      {!embedded ? (
        <h2 className="font-display text-lg font-medium tracking-tight">
          API tokens
        </h2>
      ) : null}
      {!embedded ? (
        <p className="text-sm text-muted">
          Personal tokens for Postman, cron jobs, and scripts. Each token is bound
          to one workspace for Money, Savings, or Investment. Send{" "}
          <code className="rounded-[var(--radius-sm)] bg-muted-surface px-1 py-0.5 font-mono text-xs">
            Authorization: Bearer mny_|sav_|inv_…
          </code>{" "}
          on GraphQL and REST requests.
        </p>
      ) : null}

      <div className="space-y-4 rounded-[var(--radius-sm)] bg-background p-4">
        <div className="grid gap-3">
          <Field label="App">
            <Select
              value={appKey}
              onChange={(e) => setAppKey(e.target.value as ApiTokenAppKey)}
            >
              {API_TOKEN_APP_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </option>
              ))}
            </Select>
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
          disabled={creating || !workspaceId}
          onClick={() => void createToken()}
        >
          {creating ? "Creating…" : "Create token"}
        </Button>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-foreground">Active tokens</h3>
        {tokens.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No API tokens yet.</p>
        ) : (
          <ul
            role="list"
            className="mt-3 divide-y divide-border rounded-[var(--radius-sm)] bg-background"
          >
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {t.keyPrefix}… · {t.appKey} · {workspaceName(t.workspaceId)} ·{" "}
                    {t.scopes.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
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
        )}
      </div>

      <Modal
        open={revealedToken !== null}
        onClose={() => setRevealedToken(null)}
        title="Copy your API token"
      >
        <p className="text-sm text-muted">
          Store this token securely. You will not be able to see it again.
        </p>
        <pre className="mt-3 max-h-32 overflow-auto rounded-[var(--radius-md)] border border-border bg-muted-surface p-3 font-mono text-xs break-all text-foreground">
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
