"use client";

import { useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toUserFacingMessage } from "@/lib/user-facing-error";

const CONFIRM_PHRASE = "RESET";

export type WorkspaceOption = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  role: "owner" | "member";
  isDefault?: boolean;
};

type Props = {
  workspaces: WorkspaceOption[];
  onResetComplete?: () => void | Promise<void>;
};

export function WorkspaceResetSettings({ workspaces, onResetComplete }: Props) {
  const notify = useNotify();
  const ownedWorkspaces = useMemo(
    () => workspaces.filter((w) => w.role === "owner"),
    [workspaces],
  );

  const defaultOwnedId =
    ownedWorkspaces.find((w) => w.isDefault)?.id ?? ownedWorkspaces[0]?.id ?? "";

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(defaultOwnedId);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const activeWorkspace =
    ownedWorkspaces.find((w) => w.id === selectedWorkspaceId) ??
    ownedWorkspaces[0];

  if (ownedWorkspaces.length === 0) {
    return null;
  }

  const canSubmit =
    confirmText === CONFIRM_PHRASE &&
    Boolean(activeWorkspace?.id) &&
    !busy;

  return (
    <SettingsSection
      id="settings-reset-data"
      title="Reset workspace data"
      description="Permanently remove all data across transactions, investments, loans, and ledgers in a workspace. Your workspace and member roles are kept."
    >
      <div className="rounded-[var(--radius-sm)] bg-destructive-muted-bg p-4">
        <p className="text-sm leading-6 text-foreground">
          This permanently deletes all <strong>transactions</strong>,{" "}
          <strong>investments</strong> (journals, quotes, instruments),{" "}
          <strong>loans</strong> (schedules, payments), budgets, rules, recurrence, categories,
          tags, merchants, and accounts. Default currency is cleared.{" "}
          <span className="font-semibold text-foreground">This action cannot be undone.</span>
        </p>

        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canSubmit || !activeWorkspace) return;
            setBusy(true);
            try {
              const res = await fetch("/api/workspace/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ workspaceId: activeWorkspace.id }),
              });
              const body = (await res.json().catch(() => null)) as {
                error?: string;
              } | null;
              if (!res.ok) {
                throw new Error(body?.error ?? res.statusText ?? "Request failed");
              }
              setConfirmText("");
              if (onResetComplete) {
                await onResetComplete();
              }
              notify.success(
                "Workspace data reset",
                `All data in ${activeWorkspace.name} was removed. Set a default currency in Money to start fresh.`,
              );
            } catch (err: unknown) {
              notify.error(
                "Couldn’t reset data",
                toUserFacingMessage(err, "Something went wrong"),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {ownedWorkspaces.length > 1 ? (
            <Field label="Workspace to reset" className="max-w-xs">
              <Select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                disabled={busy}
              >
                {ownedWorkspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.kind === "shared" ? " (shared)" : " (personal)"}
                    {w.isDefault ? " · default" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="text-sm font-medium text-foreground">
              Target workspace:{" "}
              <span className="font-semibold">{activeWorkspace?.name}</span>
            </p>
          )}

          <p className="text-sm leading-6 text-muted">
            Type{" "}
            <span className="rounded-[var(--radius-sm)] bg-surface px-1.5 py-0.5 font-mono text-sm font-semibold ring-1 ring-border">
              {CONFIRM_PHRASE}
            </span>{" "}
            to enable reset, then confirm.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <Field label="Confirmation" className="min-w-[min(100%,12rem)] flex-1">
              <Input
                autoComplete="off"
                placeholder={CONFIRM_PHRASE}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                aria-invalid={confirmText.length > 0 && !canSubmit && !busy}
                disabled={busy}
              />
            </Field>
            <Button type="submit" variant="danger" disabled={!canSubmit}>
              {busy ? "Resetting…" : "Reset all data"}
            </Button>
          </div>
        </form>
      </div>
    </SettingsSection>
  );
}
