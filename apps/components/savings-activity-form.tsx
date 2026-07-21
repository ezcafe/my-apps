"use client";

import { queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { useSavingsWorkspace } from "@/components/savings-workspace-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatMinor, parseMajorToMinor } from "@/lib/format-money";
import { savingsGraphQLRequest } from "@/lib/savings-gql-client";
import {
  SAVINGS_ACCOUNT_CREATE_MUTATION,
  SAVINGS_ACTIVITY_CREATE_MUTATION,
} from "@/lib/savings-gql-documents";
import {
  savingsAccountsQueryOptions,
  savingsKeys,
} from "@/lib/savings-query-options";

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ACTIVITY_TYPES = ["deposit", "withdraw", "interest"] as const;

export function SavingsActivityForm() {
  const router = useRouter();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { defaultCurrency, workspaceReady } = useSavingsWorkspace();

  const accountsQuery = useQuery({
    ...savingsAccountsQueryOptions(),
    enabled: workspaceReady,
  });

  const activeAccounts =
    accountsQuery.data?.filter((a) => !a.archived) ?? [];

  const [accountId, setAccountId] = useState("");
  const [createNewAccount, setCreateNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [activityDate, setActivityDate] = useState(localDateString());
  const [type, setType] = useState<(typeof ACTIVITY_TYPES)[number]>("deposit");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let resolvedAccountId = accountId;
      if (createNewAccount) {
        const name = newAccountName.trim();
        if (!name) {
          notify.warning("Account name required", "Enter a name for the new account.");
          return;
        }
        const created = await savingsGraphQLRequest<{
          savingsAccountCreate: { id: string };
        }>(SAVINGS_ACCOUNT_CREATE_MUTATION, {
          input: { name, currency: defaultCurrency },
        });
        resolvedAccountId = created.savingsAccountCreate.id;
      }

      if (!resolvedAccountId) {
        notify.warning("Account required", "Select or create an account.");
        return;
      }

      const amountMinor = parseMajorToMinor(amount, defaultCurrency);
      if (amountMinor == null || amountMinor <= 0) {
        notify.warning("Invalid amount", "Enter a positive amount.");
        return;
      }

      await savingsGraphQLRequest(SAVINGS_ACTIVITY_CREATE_MUTATION, {
        input: {
          accountId: resolvedAccountId,
          activityDate,
          type,
          amountMinor,
          notes: notes.trim() || null,
        },
      });

      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
      notify.success("Activity saved", formatMinor(amountMinor, defaultCurrency));
      router.push("/savings/activities");
    } catch (err) {
      notify.error(
        "Could not save activity",
        toUserFacingMessage(err),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="col-span-2 min-w-0 max-w-xl md:col-span-6 lg:col-span-8">
      <Card className="p-5">
        <h2 className="font-display text-lg font-medium">New activity</h2>
        {accountsQuery.isError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {queryErrorMessage(accountsQuery.error) ?? "Could not load accounts"}
          </p>
        ) : null}
        <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
          <Field label="Account" required>
            <Select
              value={createNewAccount ? "__new__" : accountId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new__") {
                  setCreateNewAccount(true);
                  setAccountId("");
                } else {
                  setCreateNewAccount(false);
                  setAccountId(v);
                }
              }}
              disabled={createNewAccount}
            >
              <option value="">Select account…</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
              <option value="__new__">+ Create new account</option>
            </Select>
          </Field>

          {createNewAccount ? (
            <Field label="New account name" required>
              <Input
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                autoComplete="off"
              />
            </Field>
          ) : null}

          <Field label="Date" required>
            <Input
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
            />
          </Field>

          <Field label="Type" required>
            <Select
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof ACTIVITY_TYPES)[number])
              }
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`Amount (${defaultCurrency})`} required>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <Field label="Notes">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoComplete="off"
            />
          </Field>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save activity"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/savings")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
