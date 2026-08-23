"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InstrumentLedgerDefaultsFields } from "@/components/instrument-ledger-defaults-fields";
import {
  InstrumentCurrencyChips,
  InstrumentKindChips,
} from "@/components/instrument-kind-currency-chips";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { defaultContractSize } from "@/lib/investment-contract-size";
import { isPriceCurrency } from "@/lib/investment-fx";
import { investmentGraphQLRequest } from "@/lib/investment-gql-client";
import { INVESTMENT_INSTRUMENT_CREATE_MUTATION } from "@/lib/investment-gql-documents";
import { investmentKeys } from "@/lib/investment-query-options";
import type { InvestmentInstrumentKind } from "@/lib/investment-instrument-kind";
import { categoriesOfKind } from "@/lib/money-category-ui";
import {
  preferredAccountIdForFormKind,
  preferredCategoryIdForFormKind,
} from "@/lib/money-form-kind-defaults";
import { moneyFormLookupsQueryOptions } from "@/lib/money-query-options";
import { toUserFacingMessage } from "@/lib/user-facing-error";

export function InvestmentInstrumentForm() {
  const notify = useNotify();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { defaultCurrency, workspaceReady } = useInvestmentWorkspace();

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

  const [kind, setKind] = useState<InvestmentInstrumentKind>("stocks");
  const [symbol, setSymbol] = useState("");
  const [yahooSymbol, setYahooSymbol] = useState("");
  const [contractSize, setContractSize] = useState("1");
  const [currency, setCurrency] = useState(() =>
    isPriceCurrency(defaultCurrency) ? defaultCurrency.toUpperCase() : "USD",
  );
  const [moneyAccountId, setMoneyAccountId] = useState("");
  const [incomeCategoryId, setIncomeCategoryId] = useState("");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  const createAccountId =
    moneyAccountId ||
    preferredAccountIdForFormKind("investment", accounts) ||
    accounts[0]?.id ||
    "";
  const createIncomeCategoryId =
    incomeCategoryId || categoriesOfKind(categories, "income")[0]?.id || "";
  const createExpenseCategoryId =
    expenseCategoryId ||
    preferredCategoryIdForFormKind("investment", categories) ||
    categoriesOfKind(categories, "expense")[0]?.id ||
    "";

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedSymbol = symbol.trim();
    if (!trimmedSymbol) {
      notify.warning("Required fields", "Symbol is required.");
      return;
    }
    if (!createAccountId || !createIncomeCategoryId || !createExpenseCategoryId) {
      notify.warning(
        "Required fields",
        "Account, profit category, and loss category are required.",
      );
      return;
    }
    setSaving(true);
    try {
      await investmentGraphQLRequest(INVESTMENT_INSTRUMENT_CREATE_MUTATION, {
        input: {
          kind,
          symbol: trimmedSymbol,
          currency,
          yahooSymbol: yahooSymbol.trim() || null,
          contractSize:
            contractSize.trim() || defaultContractSize(kind, trimmedSymbol),
          moneyAccountId: createAccountId,
          incomeCategoryId: createIncomeCategoryId,
          expenseCategoryId: createExpenseCategoryId,
        },
      });
      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      notify.success("Instrument added");
      router.push("/money/investments/instruments");
    } catch (err) {
      notify.error("Could not create instrument", toUserFacingMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="grid min-w-0 gap-4 [&>*]:col-span-full"
      style={{
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
      }}
      onSubmit={(e) => void onCreate(e)}
    >
      <InstrumentKindChips
        value={kind}
        onChange={(k) => {
          setKind(k);
          setContractSize(defaultContractSize(k, symbol));
        }}
      />
      <Field label="Symbol" required>
        <Input
          value={symbol}
          onChange={(e) => {
            setSymbol(e.target.value);
            setContractSize(defaultContractSize(kind, e.target.value));
          }}
          autoComplete="off"
          required
        />
      </Field>
      <Field
        label="Contract size"
        hint="Units per 1.00 lot. XAUUSD is 100, FX pairs 100000, stocks and commodities 1."
        required
      >
        <Input
          inputMode="decimal"
          value={contractSize}
          onChange={(e) => setContractSize(e.target.value)}
          autoComplete="off"
        />
      </Field>
      <InstrumentCurrencyChips value={currency} onChange={setCurrency} />
      <Field label="Yahoo symbol" hint="Optional, for live quotes">
        <Input
          value={yahooSymbol}
          onChange={(e) => setYahooSymbol(e.target.value)}
          autoComplete="off"
        />
      </Field>
      <InstrumentLedgerDefaultsFields
        accounts={accounts}
        categories={categories}
        moneyAccountId={createAccountId}
        incomeCategoryId={createIncomeCategoryId}
        expenseCategoryId={createExpenseCategoryId}
        onMoneyAccountId={setMoneyAccountId}
        onIncomeCategoryId={setIncomeCategoryId}
        onExpenseCategoryId={setExpenseCategoryId}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Creating…" : "Create instrument"}
        </Button>
      </div>
    </form>
  );
}
