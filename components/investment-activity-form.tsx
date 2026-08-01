"use client";

import { queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { parseMajorToMinor } from "@/lib/format-money";
import { investmentGraphQLRequest } from "@/lib/investment-gql-client";
import {
  INVESTMENT_ACTIVITY_CREATE_MUTATION,
  INVESTMENT_INSTRUMENT_CREATE_MUTATION,
} from "@/lib/investment-gql-documents";
import {
  investmentInstrumentsQueryOptions,
  investmentKeys,
} from "@/lib/investment-query-options";

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ACTIVITY_TYPES = [
  "buy",
  "sell",
  "dividend",
  "fee",
  "adjustment",
  "deposit",
  "withdraw",
] as const;

const INSTRUMENT_KINDS = ["stocks", "coins", "fx"] as const;

export function InvestmentActivityForm() {
  const router = useRouter();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { defaultCurrency, workspaceReady } = useInvestmentWorkspace();

  const instrumentsQuery = useQuery({
    ...investmentInstrumentsQueryOptions(),
    enabled: workspaceReady,
  });

  const activeInstruments =
    instrumentsQuery.data?.filter((i) => !i.archived) ?? [];

  const [instrumentId, setInstrumentId] = useState("");
  const [createNewInstrument, setCreateNewInstrument] = useState(false);
  const [newKind, setNewKind] =
    useState<(typeof INSTRUMENT_KINDS)[number]>("stocks");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [activityDate, setActivityDate] = useState(localDateString());
  const [type, setType] = useState<(typeof ACTIVITY_TYPES)[number]>("buy");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let resolvedInstrumentId = instrumentId;
      if (createNewInstrument) {
        const name = newName.trim();
        const symbol = newSymbol.trim();
        if (!name || !symbol) {
          notify.warning(
            "Instrument required",
            "Enter name and symbol for the new instrument.",
          );
          return;
        }
        const created = await investmentGraphQLRequest<{
          investmentInstrumentCreate: { id: string };
        }>(INVESTMENT_INSTRUMENT_CREATE_MUTATION, {
          input: {
            kind: newKind,
            name,
            symbol,
            currency: defaultCurrency,
          },
        });
        resolvedInstrumentId = created.investmentInstrumentCreate.id;
      }

      if (!resolvedInstrumentId) {
        notify.warning("Instrument required", "Select or create an instrument.");
        return;
      }

      const unitPriceMinor =
        unitPrice.trim() === ""
          ? null
          : parseMajorToMinor(unitPrice, defaultCurrency);
      const amountMinor =
        amount.trim() === "" ? null : parseMajorToMinor(amount, defaultCurrency);

      if (unitPriceMinor != null && unitPriceMinor <= 0) {
        notify.warning("Invalid price", "Unit price must be positive.");
        return;
      }
      if (amountMinor != null && amountMinor <= 0) {
        notify.warning("Invalid amount", "Amount must be positive.");
        return;
      }

      await investmentGraphQLRequest(INVESTMENT_ACTIVITY_CREATE_MUTATION, {
        input: {
          instrumentId: resolvedInstrumentId,
          activityDate,
          type,
          quantity: quantity.trim() || null,
          unitPriceMinor,
          amountMinor,
          notes: notes.trim() || null,
        },
      });

      await queryClient.invalidateQueries({ queryKey: investmentKeys.all });
      notify.success("Activity saved");
      router.push("/money/spending");
    } catch (err) {
      notify.error("Could not save activity", toUserFacingMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="col-span-2 min-w-0 max-w-xl md:col-span-6 lg:col-span-8">
      <Card className="p-5">
        <h2 className="font-display text-lg font-medium">New activity</h2>
        {instrumentsQuery.isError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {queryErrorMessage(instrumentsQuery.error) ??
              "Could not load instruments"}
          </p>
        ) : null}
        <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
          <Field label="Instrument" required>
            <Select
              value={createNewInstrument ? "__new__" : instrumentId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new__") {
                  setCreateNewInstrument(true);
                  setInstrumentId("");
                } else {
                  setCreateNewInstrument(false);
                  setInstrumentId(v);
                }
              }}
              disabled={createNewInstrument}
            >
              <option value="">Select instrument…</option>
              {activeInstruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.symbol} · {i.name}
                </option>
              ))}
              <option value="__new__">+ Create new instrument</option>
            </Select>
          </Field>

          {createNewInstrument ? (
            <>
              <Field label="Kind" required>
                <Select
                  value={newKind}
                  onChange={(e) =>
                    setNewKind(e.target.value as (typeof INSTRUMENT_KINDS)[number])
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
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoComplete="off"
                />
              </Field>
              <Field label="Symbol" required>
                <Input
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  autoComplete="off"
                />
              </Field>
            </>
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

          <Field label="Quantity">
            <Input
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label={`Unit price (${defaultCurrency})`}>
            <Input
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label={`Amount (${defaultCurrency})`}>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Optional"
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
              onClick={() => router.push("/investment")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
