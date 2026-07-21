"use client";

import { queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { useSavingsWorkspace } from "@/components/savings-workspace-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatMinor } from "@/lib/format-money";
import { savingsGraphQLRequest } from "@/lib/savings-gql-client";
import { SAVINGS_ACCOUNT_CREATE_MUTATION } from "@/lib/savings-gql-documents";
import {
  savingsAccountsQueryOptions,
  savingsKeys,
} from "@/lib/savings-query-options";

export function SavingsSettingsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { defaultCurrency, workspaceReady } = useSavingsWorkspace();

  const accountsQuery = useQuery({
    ...savingsAccountsQueryOptions(),
    enabled: workspaceReady,
  });

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      notify.warning("Name required", "Enter an account name.");
      return;
    }
    setSaving(true);
    try {
      await savingsGraphQLRequest(SAVINGS_ACCOUNT_CREATE_MUTATION, {
        input: { name: trimmed, currency: defaultCurrency },
      });
      setName("");
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
      notify.success("Account created", trimmed);
    } catch (err) {
      notify.error("Could not create account", toUserFacingMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const accounts = accountsQuery.data ?? [];

  return (
    <div className="col-span-2 min-w-0 space-y-6 md:col-span-6 lg:col-span-12">
      <Card className="p-5">
        <h2 className="font-display text-lg font-medium">Accounts</h2>
        {accountsQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : null}
        {accountsQuery.isError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {queryErrorMessage(accountsQuery.error) ?? "Could not load accounts"}
          </p>
        ) : null}
        {accountsQuery.isSuccess && accounts.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No accounts yet.</p>
        ) : null}
        {accounts.length > 0 ? (
          <ul className="mt-4 divide-y divide-border text-sm">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div>
                  <p className="font-medium">
                    {a.name}
                    {a.archived ? (
                      <span className="ml-2 text-xs text-muted">(archived)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">{a.currency}</p>
                </div>
                <span className="tabular-nums font-medium">
                  {formatMinor(a.balanceMinor, a.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card className="max-w-xl p-5">
        <h2 className="font-display text-lg font-medium">Create account</h2>
        <form className="mt-4 grid gap-4" onSubmit={onCreate}>
          <Field label="Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <p className="text-xs text-muted">
            Currency: {defaultCurrency}
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
