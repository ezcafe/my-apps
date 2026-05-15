"use client";

import { useState } from "react";
import { useNotify } from "@/components/notification-provider";
import {
  inputCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_WORKSPACE_RESET_MUTATION } from "@/lib/money-gql-documents";

const CONFIRM_PHRASE = "RESET";

const destructiveBtnCls =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--destructive)_38%,var(--border))] bg-[var(--destructive-muted-bg)] px-4 py-2 text-sm font-medium text-[var(--destructive-muted-text)] shadow-[var(--shadow-sm)] transition-[opacity,transform,box-shadow,background-color] duration-200 hover:bg-[color-mix(in_oklab,var(--destructive)_20%,var(--surface))] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press";

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
      description="Permanently remove every account, transaction, category, tag, merchant, budget, rule, and recurrence template in this workspace. Your workspace and members are kept; this cannot be undone."
    >
      <div className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--destructive)_32%,var(--border))] bg-[var(--destructive-muted-bg)] p-4 shadow-[var(--shadow-sm)]">
        <p className="text-sm leading-6 text-foreground">
          Type{" "}
          <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold ring-1 ring-border">
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
                "All ledger data was removed from this workspace.",
              );
            } catch (err: unknown) {
              notify.error(
                "Couldn’t reset data",
                err instanceof Error ? err.message : "Something went wrong",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="grid min-w-[min(100%,12rem)] flex-1 gap-1.5 text-sm">
            <span className="font-medium text-foreground">Confirmation</span>
            <input
              className={inputCls}
              autoComplete="off"
              placeholder={CONFIRM_PHRASE}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              aria-invalid={confirmText.length > 0 && !canSubmit && !busy}
            />
          </label>
          <button type="submit" className={destructiveBtnCls} disabled={!canSubmit}>
            {busy ? "Resetting…" : "Reset all Money data"}
          </button>
        </form>
      </div>
    </SettingsSection>
  );
}
