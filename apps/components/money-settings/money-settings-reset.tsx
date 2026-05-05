"use client";

import { useState } from "react";
import { useNotify } from "@/components/notification-provider";
import {
  inputCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";
import { moneyApiJson } from "@/lib/money-fetch";

const CONFIRM_PHRASE = "RESET";

const destructiveBtnCls =
  "rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-800 shadow-sm transition-colors hover:bg-red-500/20 disabled:pointer-events-none disabled:opacity-40 dark:text-red-200";

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
      <div className="rounded-xl border border-red-500/35 bg-red-500/5 p-4">
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
              await moneyApiJson("/api/money/workspace/reset", {
                method: "POST",
                body: JSON.stringify({}),
              });
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
