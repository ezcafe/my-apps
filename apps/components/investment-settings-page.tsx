"use client";

import { queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoreMenu, MoreMenuItem } from "@/components/ui/more-menu";
import { Select } from "@/components/ui/select";
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
    <div className="col-span-2 min-w-0 space-y-6 md:col-span-6 lg:col-span-12">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium">Instruments</h2>
          <div className="flex flex-wrap items-center gap-2">
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
          <ul className="mt-4 divide-y divide-border text-sm">
            {instruments.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
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
      </Card>

      {createOpen ? (
        <Card className="max-w-xl p-5 fx-fade-in">
          <h2 className="font-display text-lg font-medium">Create instrument</h2>
          <form className="mt-4 grid gap-4" onSubmit={onCreate}>
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
              />
            </Field>
            <Field label="Symbol" required>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                autoComplete="off"
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
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create instrument"}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
