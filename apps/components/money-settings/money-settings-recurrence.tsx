"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/workspace-gate";
import { Alert } from "@/components/ui/alert";
import { minorToMajorInput, parseMajorToMinor } from "@/lib/format-money";
import { moneyApiJson } from "@/lib/money-fetch";
import {
  inputCls,
  MoneySettingsBackLink,
  primaryBtnCls,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

type Account = { id: string; name: string; archived?: boolean };

type RecTemplate = {
  accountId: string;
  kind: "expense" | "income" | "transfer";
  amountMinor: number;
  categoryId?: string | null;
  merchantId?: string | null;
  notes?: string | null;
  tagIds?: string[];
};

type Cadence = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

type RecurrenceRow = {
  id: string;
  name: string;
  cadence: Cadence;
  nextRunAt: string;
  active: boolean;
  template: RecTemplate;
};

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MoneySettingsRecurrenceSection() {
  const notify = useNotify();
  const { defaultCurrency } = useWorkspaceCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurrent, setRecurrent] = useState<RecurrenceRow[]>([]);

  const [recName, setRecName] = useState("");
  const [recCadence, setRecCadence] = useState<Cadence>("monthly");
  const [recNext, setRecNext] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [recAmount, setRecAmount] = useState("");
  const [recAccountId, setRecAccountId] = useState("");
  const [recKind, setRecKind] = useState<"expense" | "income" | "transfer">(
    "expense",
  );
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCadence, setEditCadence] = useState<Cadence>("monthly");
  const [editNext, setEditNext] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editKind, setEditKind] = useState<"expense" | "income" | "transfer">(
    "expense",
  );
  const [editActive, setEditActive] = useState(true);
  const [editTemplateBase, setEditTemplateBase] = useState<RecTemplate | null>(
    null,
  );

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.archived),
    [accounts],
  );

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

  function startEdit(r: RecurrenceRow) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditCadence(r.cadence);
    setEditNext(isoToDatetimeLocal(r.nextRunAt));
    setEditAmount(minorToMajorInput(r.template.amountMinor, defaultCurrency));
    setEditAccountId(r.template.accountId);
    setEditKind(r.template.kind);
    setEditActive(r.active);
    setEditTemplateBase({ ...r.template });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTemplateBase(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editTemplateBase) return;
    try {
      const minor = parseMajorToMinor(editAmount, defaultCurrency);
      if (!editAccountId) throw new Error("Template account required");
      if (minor == null || minor <= 0) throw new Error("Invalid template amount");
      const template: RecTemplate = {
        ...editTemplateBase,
        accountId: editAccountId,
        kind: editKind,
        amountMinor: minor,
      };
      await moneyApiJson(`/api/money/recurrence/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim() || "Recurrence",
          cadence: editCadence,
          nextRunAt: new Date(editNext).toISOString(),
          template,
          active: editActive,
        }),
      });
      cancelEdit();
      await loadRecurrent();
      notify.success("Settings updated", "Recurrence template saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save recurrence",
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  async function deleteRec(id: string, name: string) {
    if (
      !window.confirm(
        `Delete recurrence template “${name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await moneyApiJson(`/api/money/recurrence/${id}`, { method: "DELETE" });
      if (editingId === id) cancelEdit();
      await loadRecurrent();
      notify.success("Settings updated", "Recurrence template deleted.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t delete recurrence",
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  async function saveRecurrence(e: React.FormEvent) {
    e.preventDefault();
    try {
      const minor = parseMajorToMinor(recAmount, defaultCurrency);
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
      <MoneySettingsBackLink current="Recurrence" />
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
            onChange={(e) => setRecCadence(e.target.value as Cadence)}
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
            {visibleAccounts.map((a) => (
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
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {editingId === r.id ? (
                  <form className="auto-fit-2 max-w-4xl" onSubmit={saveEdit}>
                    <input
                      className={inputCls}
                      placeholder="Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <select
                      className={inputCls}
                      value={editCadence}
                      onChange={(e) => setEditCadence(e.target.value as Cadence)}
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
                      value={editNext}
                      onChange={(e) => setEditNext(e.target.value)}
                    />
                    <select
                      className={inputCls}
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                    >
                      <option value="">Template account</option>
                      {visibleAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputCls}
                      value={editKind}
                      onChange={(e) =>
                        setEditKind(e.target.value as typeof editKind)
                      }
                    >
                      <option value="expense">expense</option>
                      <option value="income">income</option>
                      <option value="transfer">transfer</option>
                    </select>
                    <input
                      className={inputCls}
                      placeholder="Amount"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      Active
                    </label>
                    <div className="col-span-full flex flex-wrap gap-2">
                      <button type="submit" className={primaryBtnCls}>
                        Save changes
                      </button>
                      <button type="button" className={secondaryBtnCls} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted">
                      {r.name} · {r.cadence} · next {r.nextRunAt.slice(0, 16)} ·{" "}
                      {r.active ? "active" : "off"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => startEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => void deleteRec(r.id, r.name)}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                        onClick={() => generateRec(r.id)}
                      >
                        Generate now
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
