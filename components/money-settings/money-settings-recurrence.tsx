"use client";

import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  joinDateTimeLocal,
  MoneyDateQuickPick,
  splitDateTimeLocal,
} from "@/components/money-date-quick-pick";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { useNotify } from "@/components/notification-provider";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatMinor, minorToMajorInput, parseMajorToMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_LIST_ACCOUNTS_QUERY,
  MONEY_LIST_RECURRENCE_QUERY,
  MONEY_RECURRENCE_DELETE_MUTATION,
  MONEY_RECURRENCE_GENERATE_MUTATION,
  MONEY_RECURRENCE_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";
import {
  SettingsSection,
  SettingsSubsectionHeading,
} from "@/components/money-settings/money-settings-shared";
import { cadenceLabel, type MoneyCadence } from "@/lib/recurrence";

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

type RecurrenceRow = {
  id: string;
  name: string;
  cadence: MoneyCadence;
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
  const { formatDateTime } = useFormatDate();
  const { defaultCurrency } = useWorkspaceCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurrent, setRecurrent] = useState<RecurrenceRow[]>([]);
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCadence, setEditCadence] = useState<MoneyCadence>("monthly");
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
  const accountQuickItems = useMemo(
    () =>
      visibleAccounts.map((a) => ({
        id: a.id,
        label: a.name,
        usageCount: 0,
      })),
    [visibleAccounts],
  );
  const editCadenceOptions = useMemo(() => {
    const standard: MoneyCadence[] = [
      "daily",
      "weekly",
      "biweekly",
      "monthly",
      "quarterly",
      "yearly",
    ];
    if (process.env.NODE_ENV === "development") {
      return ["every_5_minutes", ...standard] satisfies MoneyCadence[];
    }
    return standard;
  }, []);
  const accountNameById = useMemo(
    () => new Map(visibleAccounts.map((a) => [a.id, a.name] as const)),
    [visibleAccounts],
  );

  const loadAccounts = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyAccounts: Account[] }>(
      MONEY_LIST_ACCOUNTS_QUERY,
    );
    setAccounts(res.moneyAccounts);
  }, []);
  const loadRecurrent = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyRecurrenceTemplates: RecurrenceRow[] }>(
      MONEY_LIST_RECURRENCE_QUERY,
    );
    setRecurrent(res.moneyRecurrenceTemplates);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await Promise.all([loadAccounts(), loadRecurrent()]);
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(presentClientError("money-settings-recurrence", e));
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
      await moneyGraphQLRequest(MONEY_RECURRENCE_UPDATE_MUTATION, {
        id: editingId,
        input: {
          name: editName.trim() || "Recurrence",
          cadence: editCadence,
          nextRunAt: new Date(editNext).toISOString(),
          template,
          active: editActive,
        },
      });
      cancelEdit();
      await loadRecurrent();
      notify.success("Settings updated", "Recurrence template saved.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t save recurrence",
        toUserFacingMessage(e, "Something went wrong"),
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
      await moneyGraphQLRequest(MONEY_RECURRENCE_DELETE_MUTATION, { id });
      if (editingId === id) cancelEdit();
      await loadRecurrent();
      notify.success("Settings updated", "Recurrence template deleted.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t delete recurrence",
        toUserFacingMessage(e, "Something went wrong"),
      );
    }
  }

  async function generateRec(id: string) {
    try {
      await moneyGraphQLRequest(MONEY_RECURRENCE_GENERATE_MUTATION, { id });
      await loadRecurrent();
      notify.success("Settings updated", "Transaction generated from recurrence.");
    } catch (e: unknown) {
      notify.error(
        "Couldn’t generate transaction",
        toUserFacingMessage(e, "Something went wrong"),
      );
    }
  }

  return (
    <>
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection
        id="money-settings-recurrence-page"
        title="Recurrence"
        description="Manage existing recurring schedules. New ones are created from Add."
      >
        <div className="rounded-[var(--radius-sm)] bg-background px-4 py-4 text-sm leading-6 text-muted">
          <p>
            To add a recurring transaction, open{" "}
            <Link
              href="/money/new"
              className="font-medium text-foreground underline decoration-border underline-offset-2 transition-colors duration-150 hover:decoration-foreground"
            >
              Add
            </Link>{" "}
            and:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Fill in the transaction details (amount, account, category, and so on).</li>
            <li>Check <span className="text-foreground">Repeat this transaction</span>.</li>
            <li>Choose how often it repeats (daily, monthly, or yearly).</li>
            <li>Save — the first entry is recorded and future runs are scheduled automatically.</li>
          </ol>
          <Link
            href="/money/new"
            className={buttonClassName({ variant: "primary", size: "md", className: "mt-4" })}
          >
            Go to Add
          </Link>
        </div>

        <div className="mt-8">
          <SettingsSubsectionHeading
            title="Recurring transactions"
            description="Edit, pause, or remove schedules. Use Generate now to create the next entry immediately."
          />
          {recurrent.length === 0 ? (
            <p className="mt-5 text-sm text-muted">
              No recurring schedules yet.{" "}
              <Link
                href="/money/new"
                className="font-medium text-foreground underline decoration-border underline-offset-2 transition-colors duration-150 hover:decoration-foreground"
              >
                Add one from Add
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm">
              {recurrent.map((r) => (
                <li key={r.id} className="px-3 py-2.5">
                  {editingId === r.id ? (
                    <form className="flex flex-col gap-3" onSubmit={saveEdit}>
                      <Field label="Name">
                        <Input
                          placeholder="Name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </Field>
                      <Field label="Cadence">
                        <Select
                          value={editCadence}
                          onChange={(e) =>
                            setEditCadence(e.target.value as MoneyCadence)
                          }
                        >
                          {editCadenceOptions.map((cadence) => (
                            <option key={cadence} value={cadence}>
                              {cadenceLabel(cadence)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <MoneyDateQuickPick
                        legend="Next run"
                        ariaLabel="Next run date"
                        value={splitDateTimeLocal(editNext).date}
                        onChange={(date) => {
                          const { time } = splitDateTimeLocal(editNext);
                          setEditNext(joinDateTimeLocal(date, time));
                        }}
                      />
                      <MoneyUsageQuickPick
                        legend="Account"
                        ariaLabel="Account"
                        required
                        items={accountQuickItems}
                        selectedId={editAccountId}
                        onSelect={setEditAccountId}
                        otherLabel="Other account"
                        emptyMessage="No accounts yet."
                      />
                      <Field label="Kind">
                        <Select
                          value={editKind}
                          onChange={(e) =>
                            setEditKind(e.target.value as typeof editKind)
                          }
                        >
                          <option value="expense">expense</option>
                          <option value="income">income</option>
                          <option value="transfer">transfer</option>
                        </Select>
                      </Field>
                      <Field label="Amount">
                        <Input
                          placeholder="Amount"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />
                      </Field>
                      <label className="flex items-center gap-2 text-sm text-muted">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        Active
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" variant="primary" size="sm">
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {r.name}
                          </span>
                          <Badge tone={r.active ? "accent" : "muted"}>
                            {r.active ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <p className="text-muted">
                          {formatMinor(r.template.amountMinor, defaultCurrency)} ·{" "}
                          {accountNameById.get(r.template.accountId) ?? "Unknown account"} ·{" "}
                          {cadenceLabel(r.cadence)} · next{" "}
                          {formatDateTime(r.nextRunAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void deleteRec(r.id, r.name)}
                        >
                          Delete
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void generateRec(r.id)}
                        >
                          Generate now
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSection>
    </>
  );
}
