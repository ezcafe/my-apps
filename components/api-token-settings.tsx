"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNotify } from "@/components/notification-provider";
import type { ApiTokenListItem } from "@/lib/api-token-service";
import { MoneyStatusEmphasis, MoneyStatusStrip } from "@/lib/money-status-strip";

type WorkspaceRow = {
  id: string;
  name: string;
  kind: string;
  isDefault: boolean;
};

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
  const [workspaces] = useState(initialWorkspaces);
  const [tokens, setTokens] = useState(initialTokens);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const workspaceName = (id: string) =>
    workspaces.find((w) => w.id === id)?.name ?? id.slice(0, 8);

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
          Personal Bearer tokens for Watch, Postman, and scripts. Use{" "}
          <strong>Device pairing</strong> above to create a token. Send{" "}
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
    </>
  );
}
