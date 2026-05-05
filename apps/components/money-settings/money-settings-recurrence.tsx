"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { parseMajorToMinor } from "@/lib/format-money";
import { moneyApiJson } from "@/lib/money-fetch";
import {
  inputCls,
  MoneySettingsBackLink,
  primaryBtnCls,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

type Account = { id: string; name: string };
type RecurrenceRow = {
  id: string;
  name: string;
  cadence: string;
  nextRunAt: string;
  active: boolean;
};

export function MoneySettingsRecurrenceSection() {
  const notify = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurrent, setRecurrent] = useState<RecurrenceRow[]>([]);

  const [recName, setRecName] = useState("");
  const [recCadence, setRecCadence] = useState<
    "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [recNext, setRecNext] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [recAmount, setRecAmount] = useState("");
  const [recAccountId, setRecAccountId] = useState("");
  const [recKind, setRecKind] = useState<"expense" | "income" | "transfer">(
    "expense",
  );
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    const { data } = await moneyApiJson<Account[]>("/api/money/accounts");
    setAccounts(data);
  }, []);
  const loadRecurrent = useCallback(async () => {
    const { data } = await moneyApiJson<RecurrenceRow[]>("/api/money/recurrence");
    setRecurrent(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await Promise.all([loadAccounts(), loadRecurrent()]);
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(e instanceof Error ? e.message : "Error");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAccounts, loadRecurrent]);

  async function saveRecurrence(e: React.FormEvent) {
    e.preventDefault();
    try {
      const minor = parseMajorToMinor(recAmount);
      if (!recAccountId) throw new Error("Template account required");
      if (minor == null || minor <= 0) throw new Error("Invalid template amount");
      await moneyApiJson("/api/money/recurrence", {
        method: "POST",
        body: JSON.stringify({
          name: recName || "Recurrence",
          cadence: recCadence,
          nextRunAt: new Date(recNext).toISOString(),
          template: {
            accountId: recAccountId,
            kind: recKind,
            amountMinor: minor,
            categoryId: null,
            merchantId: null,
            notes: null,
            tagIds: [],
          },
          active: true,
        }),
      });
      setRecName("");
      setRecAmount("");
      await loadRecurrent();
      notify.success("Settings updated", "Recurrence template saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save recurrence",
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  async function generateRec(id: string) {
    try {
      await moneyApiJson(`/api/money/recurrence/${id}/generate`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadRecurrent();
      notify.success("Settings updated", "Transaction generated from recurrence.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t generate transaction",
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  return (
    <>
      <MoneySettingsBackLink />
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection id="money-settings-recurrence-page" title="Recurrence">
        <form className="auto-fit-2 max-w-4xl" onSubmit={saveRecurrence}>
          <input
            className={inputCls}
            placeholder="Name"
            value={recName}
            onChange={(e) => setRecName(e.target.value)}
          />
          <select
            className={inputCls}
            value={recCadence}
            onChange={(e) => setRecCadence(e.target.value as typeof recCadence)}
          >
            <option value="weekly">weekly</option>
            <option value="biweekly">biweekly</option>
            <option value="monthly">monthly</option>
            <option value="quarterly">quarterly</option>
            <option value="yearly">yearly</option>
          </select>
          <input
            type="datetime-local"
            className={inputCls}
            value={recNext}
            onChange={(e) => setRecNext(e.target.value)}
          />
          <select
            className={inputCls}
            value={recAccountId}
            onChange={(e) => setRecAccountId(e.target.value)}
          >
            <option value="">Template account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={recKind}
            onChange={(e) => setRecKind(e.target.value as typeof recKind)}
          >
            <option value="expense">expense</option>
            <option value="income">income</option>
            <option value="transfer">transfer</option>
          </select>
          <input
            className={inputCls}
            placeholder="Amount"
            value={recAmount}
            onChange={(e) => setRecAmount(e.target.value)}
          />
          <button type="submit" className={`${primaryBtnCls} self-start`}>
            Save template
          </button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Templates</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {recurrent.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
              >
                <span className="text-muted">
                  {r.name} · {r.cadence} · next {r.nextRunAt.slice(0, 16)}
                </span>
                <button
                  type="button"
                  className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                  onClick={() => generateRec(r.id)}
                >
                  Generate now
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
