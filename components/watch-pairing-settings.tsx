"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { useNotify } from "@/components/notification-provider";
import {
  SHAREABLE_WORKSPACE_APP_KEYS,
  type ShareableWorkspaceAppKey,
} from "@/lib/workspace-shareable-apps";

type MintData = { code: string; expiresAt: string };

const APP_LABELS: Record<ShareableWorkspaceAppKey, string> = {
  money: "Money",
  baby: "Baby Care",
};

export function WatchPairingSettings() {
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [minted, setMinted] = useState<MintData | null>(null);
  const [codeUsed, setCodeUsed] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [apps, setApps] = useState<Record<ShareableWorkspaceAppKey, boolean>>({
    money: false,
    baby: true,
  });
  const [writeScope, setWriteScope] = useState(true);

  const anyApp = SHAREABLE_WORKSPACE_APP_KEYS.some((k) => apps[k]);

  const toggleApp = (key: ShareableWorkspaceAppKey) => {
    setApps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const generate = async () => {
    const selected = SHAREABLE_WORKSPACE_APP_KEYS.filter((k) => apps[k]);
    if (selected.length === 0) {
      notify.error("Select at least one app");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/watch/pair", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apps: selected,
          scopes: writeScope ? ["read", "write"] : ["read"],
        }),
      });
      const json = (await res.json()) as {
        data?: MintData;
        error?: string;
        code?: string;
      };
      if (!res.ok || !json.data) {
        notify.error("Could not generate code", json.error ?? res.statusText);
        return;
      }
      setMinted(json.data);
      setCodeUsed(false);
      setRevealedToken(null);
      notify.success("Pairing code ready");
    } finally {
      setBusy(false);
    }
  };

  const revealOnThisDevice = async () => {
    if (!minted || codeUsed) return;
    setRevealing(true);
    try {
      const res = await fetch("/api/watch/pair/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: minted.code }),
      });
      const json = (await res.json()) as {
        data?: { baseURL: string; token: string };
        error?: string;
      };
      if (!res.ok || !json.data?.token) {
        notify.error("Could not reveal token", json.error ?? res.statusText);
        if (res.status === 400 || res.status === 409) {
          setCodeUsed(true);
        }
        return;
      }
      setRevealedToken(json.data.token);
      setCodeUsed(true);
      notify.success("Token ready — copy it now");
    } finally {
      setRevealing(false);
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
    <div className="space-y-3 rounded-[var(--radius-md)] bg-card p-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Device pairing</h3>
        <p className="mt-1 text-sm text-muted">
          Generate a short code for Apple Watch, scripts, or other tools. Choose
          which apps the token may access, then enter the code on the device — or
          reveal the Bearer token on this laptop.
        </p>
      </div>

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

      <div className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox
          checked={writeScope}
          onChange={() => setWriteScope((v) => !v)}
          ariaLabel="Allow write (mutations, imports)"
        />
        <span>Allow write (mutations, imports)</span>
      </div>

      {minted ? (
        <div className="space-y-2 rounded-[var(--radius-sm)] bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Code
          </p>
          <p
            className="select-all font-mono text-2xl tracking-[0.2em] text-foreground"
            data-testid="watch-pairing-code"
          >
            {minted.code}
          </p>
          <p className="text-sm text-muted" data-testid="watch-pairing-expiry">
            Expires {new Date(minted.expiresAt).toLocaleString()}
          </p>
          <p className="text-sm text-muted">
            One-time use: Reveal on this device <em>or</em> enter on Watch — first
            wins.
          </p>
          {codeUsed ? (
            <p className="text-sm text-muted" data-testid="watch-pairing-used">
              Code used.
            </p>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void revealOnThisDevice()}
              disabled={revealing}
              data-testid="watch-pairing-reveal"
            >
              {revealing ? "Revealing…" : "Reveal on this device"}
            </Button>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => void generate()}
        disabled={busy || !anyApp}
        data-testid="watch-pairing-generate"
      >
        {busy ? "Generating…" : minted ? "Generate new code" : "Generate code"}
      </Button>

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
          <Button
            type="button"
            variant="primary"
            onClick={() => void copyRevealed()}
          >
            Copy
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setRevealedToken(null)}
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
