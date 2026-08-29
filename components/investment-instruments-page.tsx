"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import {
  MoneyEmptyState,
  MoneyListSkeleton,
  MoneyQueryErrorAlert,
} from "@/components/money-feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  InstrumentCurrencyChips,
  InstrumentKindChips,
} from "@/components/instrument-kind-currency-chips";
import { InstrumentLedgerDefaultsFields } from "@/components/instrument-ledger-defaults-fields";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
} from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { investmentGraphQLRequest } from "@/lib/investment-gql-client";
import {
  INVESTMENT_INSTRUMENT_UPDATE_MUTATION,
  INVESTMENT_REFRESH_QUOTES_MUTATION,
} from "@/lib/investment-gql-documents";
import {
  invalidateInvestmentWorkspaceQueries,
  investmentInstrumentsQueryOptions,
  type InvestmentInstrument,
} from "@/lib/investment-query-options";
import { defaultContractSize } from "@/lib/investment-contract-size";
import { isPriceCurrency } from "@/lib/investment-fx";
import {
  INVESTMENT_INSTRUMENT_KINDS,
  isInvestmentInstrumentKind,
  investmentInstrumentKindLabel,
  type InvestmentInstrumentKind,
} from "@/lib/investment-instrument-kind";
import {
  moneyFormLookupsQueryOptions,
  type MoneyAccountLookup,
  type MoneyCategoryLookup,
} from "@/lib/money-query-options";
import {
  moneyQuickPickChipCls,
  moneyQuickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";

type InstrumentFilter = "all" | InvestmentInstrumentKind;

const FILTER_OPTIONS: { value: InstrumentFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...INVESTMENT_INSTRUMENT_KINDS.map((kind) => ({
    value: kind,
    label: investmentInstrumentKindLabel(kind),
  })),
];

function matchesFilter(
  instrument: InvestmentInstrument,
  filter: InstrumentFilter,
): boolean {
  if (filter === "all") return true;
  return instrument.kind === filter;
}

function InstrumentEditForm({
  accounts,
  categories,
  editKind,
  editSymbol,
  editYahoo,
  editContractSize,
  editCurrency,
  editMoneyAccountId,
  editIncomeCategoryId,
  editExpenseCategoryId,
  onKind,
  onSymbol,
  onYahoo,
  onContractSize,
  onCurrency,
  onMoneyAccountId,
  onIncomeCategoryId,
  onExpenseCategoryId,
  onSubmit,
  onCancel,
}: {
  accounts: MoneyAccountLookup[];
  categories: MoneyCategoryLookup[];
  editKind: InvestmentInstrumentKind;
  editSymbol: string;
  editYahoo: string;
  editContractSize: string;
  editCurrency: string;
  editMoneyAccountId: string;
  editIncomeCategoryId: string;
  editExpenseCategoryId: string;
  onKind: (kind: InvestmentInstrumentKind) => void;
  onSymbol: (value: string) => void;
  onYahoo: (value: string) => void;
  onContractSize: (value: string) => void;
  onCurrency: (value: string) => void;
  onMoneyAccountId: (value: string) => void;
  onIncomeCategoryId: (value: string) => void;
  onExpenseCategoryId: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <InstrumentKindChips
        value={editKind}
        onChange={(k) => {
          onKind(k);
          onContractSize(defaultContractSize(k, editSymbol));
        }}
      />
      <Field label="Symbol" required>
        <Input
          value={editSymbol}
          onChange={(e) => {
            onSymbol(e.target.value);
            onContractSize(defaultContractSize(editKind, e.target.value));
          }}
          required
        />
      </Field>
      <Field label="Quote symbol (optional)">
        <Input value={editYahoo} onChange={(e) => onYahoo(e.target.value)} />
      </Field>
      <Field label="Contract size" required>
        <Input
          inputMode="decimal"
          value={editContractSize}
          onChange={(e) => onContractSize(e.target.value)}
        />
      </Field>
      <InstrumentCurrencyChips value={editCurrency} onChange={onCurrency} />
      <InstrumentLedgerDefaultsFields
        accounts={accounts}
        categories={categories}
        moneyAccountId={editMoneyAccountId}
        incomeCategoryId={editIncomeCategoryId}
        expenseCategoryId={editExpenseCategoryId}
        onMoneyAccountId={onMoneyAccountId}
        onIncomeCategoryId={onIncomeCategoryId}
        onExpenseCategoryId={onExpenseCategoryId}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" size="sm">
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function InstrumentRowActions({
  onEdit,
  onRemove,
}: {
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
        Edit
      </Button>
      <Button type="button" variant="danger" size="sm" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

function InstrumentsTable({
  instruments,
  editingId,
  renderEditForm,
  onStartEdit,
  onRemove,
}: {
  instruments: InvestmentInstrument[];
  editingId: string | null;
  renderEditForm: () => ReactNode;
  onStartEdit: (row: InvestmentInstrument) => void;
  onRemove: (id: string, label: string) => void;
}) {
  return (
    <div className="w-full min-w-0">
      <div className="hidden min-w-0 @md:block">
        <Table>
          <TableCaption>
            Instruments with kind, currency, contract size, and quote symbol
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead freeze="leading">Symbol</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead align="end">Contract size</TableHead>
              <TableHead>Quote symbol</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instruments.map((instrument) =>
              editingId === instrument.id ? (
                <TableRow key={instrument.id} accent>
                  <TableCell colSpan={6}>{renderEditForm()}</TableCell>
                </TableRow>
              ) : (
                <TableRow key={instrument.id}>
                  <TableCell
                    freeze="leading"
                    className="max-w-0 truncate font-medium"
                  >
                    {instrument.symbol}
                  </TableCell>
                  <TableCell>
                    <Tag className="text-muted">
                      {investmentInstrumentKindLabel(instrument.kind)}
                    </Tag>
                  </TableCell>
                  <TableCell className="truncate">{instrument.currency}</TableCell>
                  <TableCell align="end" numeric className="truncate">
                    {instrument.contractSize}
                  </TableCell>
                  <TableCell className="truncate text-muted">
                    {instrument.yahooSymbol ?? "—"}
                  </TableCell>
                  <TableCell>
                    <TableRowActions>
                      <InstrumentRowActions
                        onEdit={() => onStartEdit(instrument)}
                        onRemove={() =>
                          void onRemove(instrument.id, instrument.symbol)
                        }
                      />
                    </TableRowActions>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 @md:hidden">
        {instruments.map((instrument) => (
          <li
            key={instrument.id}
            className="rounded-[var(--radius-md)] border border-border bg-surface p-4"
          >
            {editingId === instrument.id ? (
              renderEditForm()
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-semibold leading-tight">
                    {instrument.symbol}
                  </p>
                  <Tag className="text-muted">
                    {investmentInstrumentKindLabel(instrument.kind)}
                  </Tag>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Currency</dt>
                    <dd className="font-medium">{instrument.currency}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Contract size</dt>
                    <dd className="tabular-nums">{instrument.contractSize}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Quote symbol</dt>
                    <dd>{instrument.yahooSymbol ?? "—"}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <InstrumentRowActions
                    onEdit={() => onStartEdit(instrument)}
                    onRemove={() =>
                      void onRemove(instrument.id, instrument.symbol)
                    }
                  />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InvestmentInstrumentsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { workspaceReady } = useInvestmentWorkspace();

  const instrumentsQuery = useQuery({
    ...investmentInstrumentsQueryOptions(),
    enabled: workspaceReady,
  });
  const lookupsQuery = useQuery({
    ...moneyFormLookupsQueryOptions(),
    enabled: workspaceReady,
  });
  const accounts = useMemo(
    () => lookupsQuery.data?.moneyAccounts ?? [],
    [lookupsQuery.data?.moneyAccounts],
  );
  const categories = useMemo(
    () => lookupsQuery.data?.moneyCategories ?? [],
    [lookupsQuery.data?.moneyCategories],
  );

  const [filter, setFilter] = useState<InstrumentFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState<InvestmentInstrumentKind>("stocks");
  const [editSymbol, setEditSymbol] = useState("");
  const [editYahoo, setEditYahoo] = useState("");
  const [editContractSize, setEditContractSize] = useState("1");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editMoneyAccountId, setEditMoneyAccountId] = useState("");
  const [editIncomeCategoryId, setEditIncomeCategoryId] = useState("");
  const [editExpenseCategoryId, setEditExpenseCategoryId] = useState("");

  const visibleInstruments = useMemo(
    () => instrumentsQuery.data?.filter((i) => !i.archived) ?? [],
    [instrumentsQuery.data],
  );

  const filteredInstruments = useMemo(
    () => visibleInstruments.filter((row) => matchesFilter(row, filter)),
    [filter, visibleInstruments],
  );

  function startEdit(row: InvestmentInstrument) {
    setEditingId(row.id);
    setEditKind(isInvestmentInstrumentKind(row.kind) ? row.kind : "stocks");
    setEditSymbol(row.symbol);
    setEditYahoo(row.yahooSymbol ?? "");
    setEditContractSize(row.contractSize ?? "1");
    setEditCurrency(
      isPriceCurrency(row.currency) ? row.currency.toUpperCase() : "USD",
    );
    setEditMoneyAccountId(row.moneyAccountId ?? "");
    setEditIncomeCategoryId(row.incomeCategoryId ?? "");
    setEditExpenseCategoryId(row.expenseCategoryId ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !editSymbol.trim()) return;
    if (!editMoneyAccountId || !editIncomeCategoryId || !editExpenseCategoryId) {
      notify.warning(
        "Required fields",
        "Account, profit category, and loss category are required.",
      );
      return;
    }
    const trimmedSymbol = editSymbol.trim();
    try {
      await investmentGraphQLRequest(INVESTMENT_INSTRUMENT_UPDATE_MUTATION, {
        id: editingId,
        input: {
          kind: editKind,
          symbol: trimmedSymbol,
          currency: editCurrency,
          yahooSymbol: editYahoo.trim() || null,
          contractSize: editContractSize.trim() || null,
          moneyAccountId: editMoneyAccountId,
          incomeCategoryId: editIncomeCategoryId,
          expenseCategoryId: editExpenseCategoryId,
        },
      });
      cancelEdit();
      await invalidateInvestmentWorkspaceQueries(queryClient);
      notify.success("Instrument saved");
    } catch (err) {
      notify.error(
        "Couldn’t save instrument",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  async function removeInstrument(id: string, label: string) {
    if (
      !window.confirm(
        `Remove instrument “${label}”? It will be archived and hidden from this list.`,
      )
    ) {
      return;
    }
    try {
      await investmentGraphQLRequest(INVESTMENT_INSTRUMENT_UPDATE_MUTATION, {
        id,
        input: { archived: true },
      });
      if (editingId === id) setEditingId(null);
      await invalidateInvestmentWorkspaceQueries(queryClient);
      notify.success("Instrument removed");
    } catch (err) {
      notify.error(
        "Couldn’t remove instrument",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  async function onRefreshQuotes() {
    setRefreshing(true);
    try {
      await investmentGraphQLRequest(INVESTMENT_REFRESH_QUOTES_MUTATION);
      await invalidateInvestmentWorkspaceQueries(queryClient);
      notify.success("Quotes refreshed");
    } catch (err) {
      notify.error("Could not refresh quotes", toUserFacingMessage(err));
    } finally {
      setRefreshing(false);
    }
  }

  const renderEditForm = () => (
    <InstrumentEditForm
      accounts={accounts}
      categories={categories}
      editKind={editKind}
      editSymbol={editSymbol}
      editYahoo={editYahoo}
      editContractSize={editContractSize}
      editCurrency={editCurrency}
      editMoneyAccountId={editMoneyAccountId}
      editIncomeCategoryId={editIncomeCategoryId}
      editExpenseCategoryId={editExpenseCategoryId}
      onKind={setEditKind}
      onSymbol={setEditSymbol}
      onYahoo={setEditYahoo}
      onContractSize={setEditContractSize}
      onCurrency={setEditCurrency}
      onMoneyAccountId={setEditMoneyAccountId}
      onIncomeCategoryId={setEditIncomeCategoryId}
      onExpenseCategoryId={setEditExpenseCategoryId}
      onSubmit={(e) => void saveEdit(e)}
      onCancel={cancelEdit}
    />
  );

  return (
    <div className={`${MONEY_FULL_SPAN} min-w-0 space-y-4`}>
      {instrumentsQuery.isLoading ? (
        <MoneyListSkeleton variant="loansTable" />
      ) : null}

      {instrumentsQuery.isError ? (
        <MoneyQueryErrorAlert
          title="Couldn’t load instruments"
          error={instrumentsQuery.error}
          onRetry={() => void instrumentsQuery.refetch()}
        />
      ) : null}

      {instrumentsQuery.isSuccess && visibleInstruments.length === 0 ? (
        <MoneyEmptyState
          icon="investment"
          accentChartIndex={4}
          title="No instruments yet"
          description="Add a symbol to open trades and track holdings."
          minHeightClass="min-h-[200px]"
          primaryAction={{
            href: "/investments/instruments/new",
            label: "Create instrument",
          }}
        />
      ) : null}

      {instrumentsQuery.isSuccess && visibleInstruments.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
              <div
                className={moneyQuickPickGroupCls}
                role="group"
                aria-label="Filter instruments"
              >
                {FILTER_OPTIONS.map(({ value, label }) => {
                  const active = filter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={moneyQuickPickChipCls(active)}
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={refreshing}
                onClick={() => void onRefreshQuotes()}
              >
                {refreshing ? "Refreshing…" : "Refresh quotes"}
              </Button>
          </div>

          {filteredInstruments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No instruments match this filter.
            </p>
          ) : (
            <div className="@container">
              <InstrumentsTable
                instruments={filteredInstruments}
                editingId={editingId}
                renderEditForm={renderEditForm}
                onStartEdit={startEdit}
                onRemove={removeInstrument}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
