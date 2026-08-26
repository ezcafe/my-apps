"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_WORKSPACE_RESET_MUTATION } from "@/lib/money-gql-documents";

const CONFIRM_PHRASE = "RESET";

type Props = {
  onResetComplete: () => Promise<void>;
};

export function MoneySettingsResetSection({ onResetComplete }: Props) {
  const notify = useNotify();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = confirmText === CONFIRM_PHRASE && !busy;

  return (
    <SettingsSection
      id="money-settings-reset"
      title="Reset Money data"
      description="Remove all ledger data in this workspace and start fresh. Your workspace and members are kept."
    >
      <div className="rounded-[var(--radius-sm)] bg-destructive-muted-bg p-4">
        <p className="text-sm leading-6 text-foreground">
          This removes every account, transaction, category, tag, merchant, budget, rule, and
          recurrence template. Default currency is cleared too.{" "}
          <span className="font-semibold text-foreground">This cannot be undone.</span>
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Type{" "}
          <span className="rounded-[var(--radius-sm)] bg-surface px-1.5 py-0.5 font-mono text-sm font-semibold ring-1 ring-border">
            {CONFIRM_PHRASE}
          </span>{" "}
          to enable reset, then confirm.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canSubmit) return;
            setBusy(true);
            try {
              await moneyGraphQLRequest(MONEY_WORKSPACE_RESET_MUTATION);
              setConfirmText("");
              await onResetComplete();
              notify.success(
                "Money data cleared",
                "All ledger data was removed. Choose your default currency to continue.",
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
          <Field label="Confirmation" className="min-w-[min(100%,12rem)] flex-1">
            <Input
              autoComplete="off"
              placeholder={CONFIRM_PHRASE}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              aria-invalid={confirmText.length > 0 && !canSubmit && !busy}
            />
          </Field>
          <Button type="submit" variant="danger" disabled={!canSubmit}>
            {busy ? "Resetting…" : "Reset all Money data"}
          </Button>
        </form>
      </div>
    </SettingsSection>
  );
}
