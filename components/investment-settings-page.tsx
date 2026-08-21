"use client";

import { queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoreMenu, MoreMenuItem } from "@/components/ui/more-menu";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { investmentGraphQLRequest } from "@/lib/investment-gql-client";
import {
  INVESTMENT_INSTRUMENT_CREATE_MUTATION,
  INVESTMENT_REFRESH_QUOTES_MUTATION,
} from "@/lib/investment-gql-documents";
import {
  investmentInstrumentsQueryOptions,
  investmentKeys,
} from "@/lib/investment-query-options";

const INSTRUMENT_KINDS = ["stocks", "coins", "fx"] as const;

export function InvestmentSettingsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { defaultCurrency, workspaceReady } = useInvestmentWorkspace();

  const instrumentsQuery = useQuery({
    ...investmentInstrumentsQueryOptions(),
    enabled: workspaceReady,
  });

  const [kind, setKind] =
    useState<(typeof INSTRUMENT_KINDS)[number]>("stocks");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [yahooSymbol, setYahooSymbol] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSymbol = symbol.trim();
    if (!trimmedName || !trimmedSymbol) {
      notify.warning("Required fields", "Name and symbol are required.");
      return;
    }
    setSaving(true);
    try {
      await investmentGraphQLRequest(INVESTMENT_INSTRUMENT_CREATE_MUTATION, {
        input: {
          kind,
          name: trimmedName,
          symbol: trimmedSymbol,
          currency: defaultCurrency,
          yahooSymbol: yahooSymbol.trim() || null,
        },
      });
      setName("");
      setSymbol("");
      setYahooSymbol("");
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      notify.success("Instrument created", trimmedSymbol);
    } catch (err) {
      notify.error("Could not create instrument", toUserFacingMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onRefreshQuotes() {
    setRefreshing(true);
    try {
      await investmentGraphQLRequest(INVESTMENT_REFRESH_QUOTES_MUTATION);
      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      notify.success("Quotes refreshed");
    } catch (err) {
      notify.error("Could not refresh quotes", toUserFacingMessage(err));
    } finally {
      setRefreshing(false);
    }
  }

  const instruments = instrumentsQuery.data ?? [];

  return (
    <div className={cn(MONEY_FULL_SPAN, "min-w-0 space-y-4")}>
      <SettingsSection
        id="investment-settings-instruments"
        title="Instruments"
        description="Track stocks, coins, and FX pairs used by investment activities."
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCreateOpen((o) => !o)}
            aria-expanded={createOpen}
          >
            {createOpen ? "Hide form" : "Add instrument"}
          </Button>
          <MoreMenu
            aria-label="Instrument options"
            open={menuOpen}
            onOpenChange={setMenuOpen}
          >
            <MoreMenuItem
              disabled={refreshing}
              onClick={() => {
                setMenuOpen(false);
                void onRefreshQuotes();
              }}
            >
              {refreshing ? "Refreshing…" : "Refresh quotes"}
            </MoreMenuItem>
          </MoreMenu>
        </div>
        {instrumentsQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : null}
        {instrumentsQuery.isError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {queryErrorMessage(instrumentsQuery.error) ??
              "Could not load instruments"}
          </p>
        ) : null}
        {instrumentsQuery.isSuccess && instruments.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No instruments yet.</p>
        ) : null}
        {instruments.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm">
            {instruments.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div>
                  <p className="font-medium">
                    {i.symbol} · {i.name}
                    {i.archived ? (
                      <span className="ml-2 text-xs text-muted">(archived)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted capitalize">
                    {i.kind} · {i.currency}
                    {i.yahooSymbol ? ` · Yahoo: ${i.yahooSymbol}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {createOpen ? (
          <form
            className="mt-6 max-w-xl grid gap-4 border-t border-border pt-6 fx-fade-in"
            onSubmit={onCreate}
          >
            <Field label="Kind" required>
              <Select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as (typeof INSTRUMENT_KINDS)[number])
                }
              >
                {INSTRUMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Symbol" required>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Yahoo symbol" hint="Optional, for live quotes">
              <Input
                value={yahooSymbol}
                onChange={(e) => setYahooSymbol(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <p className="text-xs text-muted">Currency: {defaultCurrency}</p>
            <Button type="submit" variant="primary" disabled={saving} className="w-fit">
              {saving ? "Creating…" : "Create instrument"}
            </Button>
          </form>
        ) : null}
      </SettingsSection>
    </div>
  );
}
