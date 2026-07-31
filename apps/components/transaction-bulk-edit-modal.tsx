"use client";

import { presentClientError } from "@/lib/user-facing-error";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { AnalyticsLookupAccount } from "@/components/analytics-filters";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_TRANSACTION_UPDATE_MUTATION } from "@/lib/money-gql-documents";
import {
  moneyCategoryById,
  moneyCategoryGroupsByKind,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import {
  moneyAnalyticsMerchantLookupsQueryOptions,
  moneyRootQueryKey,
  type MoneyTransactionListRow,
} from "@/lib/money-query-options";

const NO_CHANGE = "";

type BulkPatch = {
  accountId?: string;
  categoryId?: string | null;
  merchantId?: string | null;
  tagIds?: string[];
  notes?: string | null;
  excludeFromAnalyticsAndBudget?: boolean;
};

function buildRowPatch(
  row: MoneyTransactionListRow,
  patch: BulkPatch,
  categoryById: Map<string, MoneyCategoryRow>,
): Record<string, unknown> | null {
  const input: Record<string, unknown> = {};

  if (patch.accountId != null) {
    input.accountId = patch.accountId;
  }
  if (patch.categoryId !== undefined && row.kind !== "transfer") {
    if (patch.categoryId === null) {
      input.categoryId = null;
    } else {
      const cat = categoryById.get(patch.categoryId);
      if (cat && cat.kind === row.kind) {
        input.categoryId = patch.categoryId;
      }
    }
  }
  if (patch.merchantId !== undefined && row.kind !== "transfer") {
    input.merchantId = patch.merchantId;
  }
  if (patch.tagIds !== undefined) {
    input.tagIds = patch.tagIds;
  }
  if (patch.notes !== undefined) {
    input.notes = patch.notes;
  }
  if (patch.excludeFromAnalyticsAndBudget !== undefined) {
    input.excludeFromAnalyticsAndBudget = patch.excludeFromAnalyticsAndBudget;
  }

  return Object.keys(input).length > 0 ? input : null;
}

export function TransactionBulkEditModal({
  open,
  activeWorkspaceId,
  selectedRows,
  accounts,
  categories,
  tags,
  onClose,
  onSuccess,
}: {
  open: boolean;
  activeWorkspaceId: string;
  selectedRows: MoneyTransactionListRow[];
  accounts: AnalyticsLookupAccount[];
  categories: MoneyCategoryRow[];
  tags: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState(NO_CHANGE);
  const [categoryId, setCategoryId] = useState(NO_CHANGE);
  const [merchantId, setMerchantId] = useState(NO_CHANGE);
  const [updateTags, setUpdateTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [updateNotes, setUpdateNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [updateExclude, setUpdateExclude] = useState(false);
  const [excludeFromAnalyticsAndBudget, setExcludeFromAnalyticsAndBudget] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const merchantsQuery = useQuery({
    ...moneyAnalyticsMerchantLookupsQueryOptions(activeWorkspaceId),
    enabled: open && Boolean(activeWorkspaceId),
  });

  const merchants = useMemo(
    () => merchantsQuery.data?.moneyMerchants ?? [],
    [merchantsQuery.data?.moneyMerchants],
  );

  const categoryByKind = useMemo(
    () => moneyCategoryGroupsByKind(categories),
    [categories],
  );
  const categoryById = useMemo(
    () => moneyCategoryById(categories),
    [categories],
  );

  const transferCount = useMemo(
    () => selectedRows.filter((r) => r.kind === "transfer").length,
    [selectedRows],
  );

  const resetKey = open
    ? selectedRows.map((r) => r.id).join("|")
    : null;
  const [formKey, setFormKey] = useState(resetKey);
  if (open && resetKey !== formKey) {
    setFormKey(resetKey);
    setAccountId(NO_CHANGE);
    setCategoryId(NO_CHANGE);
    setMerchantId(NO_CHANGE);
    setUpdateTags(false);
    setSelectedTagIds([]);
    setUpdateNotes(false);
    setNotes("");
    setUpdateExclude(false);
    setExcludeFromAnalyticsAndBudget(false);
    setSaving(false);
    setErr(null);
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const bulkPatch: BulkPatch = {};
    if (accountId !== NO_CHANGE) bulkPatch.accountId = accountId;
    if (categoryId !== NO_CHANGE) {
      bulkPatch.categoryId = categoryId === "__none__" ? null : categoryId;
    }
    if (merchantId !== NO_CHANGE) {
      bulkPatch.merchantId = merchantId === "__none__" ? null : merchantId;
    }
    if (updateTags) bulkPatch.tagIds = selectedTagIds;
    if (updateNotes) bulkPatch.notes = notes.trim() ? notes.trim() : null;
    if (updateExclude) {
      bulkPatch.excludeFromAnalyticsAndBudget = excludeFromAnalyticsAndBudget;
    }

    const hasChanges = Object.keys(bulkPatch).length > 0;
    if (!hasChanges) {
      setErr("Choose at least one field to update.");
      return;
    }

    if (
      categoryId !== NO_CHANGE &&
      categoryId !== "__none__" &&
      categoryById.get(categoryId)?.kind
    ) {
      const catKind = categoryById.get(categoryId)?.kind;
      const mismatched = selectedRows.filter(
        (r) => r.kind !== "transfer" && r.kind !== catKind,
      );
      if (mismatched.length > 0 && mismatched.length === selectedRows.length) {
        setErr(
          `Category kind (${catKind}) does not match any selected transaction.`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(
        selectedRows.map(async (row) => {
          const input = buildRowPatch(row, bulkPatch, categoryById);
          if (!input) return;
          await moneyGraphQLRequest(MONEY_TRANSACTION_UPDATE_MUTATION, {
            id: row.id,
            input,
          });
        }),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      await queryClient.invalidateQueries({ queryKey: moneyRootQueryKey });

      if (failed > 0) {
        setErr(
          failed === selectedRows.length
            ? "Couldn’t update transactions."
            : `Updated ${selectedRows.length - failed} of ${selectedRows.length}; ${failed} failed.`,
        );
        if (failed < selectedRows.length) onSuccess();
        return;
      }

      onSuccess();
      onClose();
    } catch (e: unknown) {
      setErr(presentClientError("transaction-bulk-edit-modal", e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${selectedRows.length.toLocaleString()} transactions`}
    >
      {err ? (
        <Alert variant="error" title={err} className="mb-4" />
      ) : null}

      <form className="grid min-w-0 gap-4" onSubmit={onSubmit}>
        <p className="text-sm text-muted">
          Only fields you change are applied to all selected transactions.
          {transferCount > 0
            ? ` Category and merchant are skipped for ${transferCount} transfer${transferCount === 1 ? "" : "s"}.`
            : null}
        </p>

        <Field label="Account">
          <Select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value={NO_CHANGE}>No change</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Category">
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value={NO_CHANGE}>No change</option>
            <option value="__none__">Clear category</option>
            {categoryByKind.map(({ kind, groups }) => (
              <optgroup
                key={kind}
                label={kind === "expense" ? "Expense" : "Income"}
              >
                {groups.map((g) =>
                  g.type === "single" ? (
                    <option key={g.category.id} value={g.category.id}>
                      {moneyCategoryLabel(g.category, categoryById)}
                    </option>
                  ) : (
                    [
                      <option key={g.parent.id} value={g.parent.id}>
                        {moneyCategoryLabel(g.parent, categoryById)} (all)
                      </option>,
                      ...g.children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {moneyCategoryLabel(child, categoryById)}
                        </option>
                      )),
                    ]
                  ),
                )}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="Merchant">
          <Select
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            disabled={merchantsQuery.isLoading}
          >
            <option value={NO_CHANGE}>No change</option>
            <option value="__none__">Clear merchant</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="grid min-w-0 gap-2 text-sm">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={updateTags}
              onChange={() => setUpdateTags((v) => !v)}
              ariaLabel="Replace tags on all selected transactions"
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-foreground">Replace tags</span>
              <span className="mt-0.5 block text-xs text-muted">
                Sets the same tags on every selected transaction.
              </span>
            </div>
          </div>
          {updateTags ? (
            tags.length === 0 ? (
              <p className="text-xs text-muted">No tags in workspace.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const checked = selectedTagIds.includes(t.id);
                  return (
                    <li key={t.id}>
                      <label className="cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTag(t.id)}
                          className="peer sr-only"
                        />
                        <span
                          className={cn(
                            "inline-flex items-center rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,box-shadow] duration-150 fx-press",
                            checked
                              ? "border-accent bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent"
                              : "border-border bg-background text-foreground hover:border-foreground/40",
                          )}
                        >
                          {t.name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </fieldset>

        <fieldset className="grid min-w-0 gap-2 text-sm">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={updateNotes}
              onChange={() => setUpdateNotes((v) => !v)}
              ariaLabel="Replace notes on all selected transactions"
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-foreground">Replace notes</span>
              <span className="mt-0.5 block text-xs text-muted">
                Sets the same note on every selected transaction.
              </span>
            </div>
          </div>
          {updateNotes ? (
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Leave empty to clear notes"
            />
          ) : null}
        </fieldset>

        <fieldset className="grid min-w-0 gap-2 text-sm">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={updateExclude}
              onChange={() => setUpdateExclude((v) => !v)}
              ariaLabel="Set exclude from Analytics and budget on all selected transactions"
              className="mt-0.5"
            />
            <div>
              <span className="font-medium text-foreground">
                Exclude from Analytics and budget
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Sets the same exclusion flag on every selected transaction.
              </span>
            </div>
          </div>
          {updateExclude ? (
            <div className="flex items-start gap-2 pl-6">
              <Checkbox
                checked={excludeFromAnalyticsAndBudget}
                onChange={() =>
                  setExcludeFromAnalyticsAndBudget((v) => !v)
                }
                ariaLabel="Exclude from Analytics and budget"
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm text-foreground">Excluded</span>
                <p className="mt-0.5 text-xs text-muted">
                  Uncheck to include selected transactions in analytics and
                  budget again.
                </p>
              </div>
            </div>
          ) : null}
        </fieldset>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" variant="primary" size="md" disabled={saving}>
            {saving ? "Saving…" : "Apply to all"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
