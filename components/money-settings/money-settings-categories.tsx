"use client";

import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_CATEGORY_ARCHIVE_MUTATION,
  MONEY_CATEGORY_CREATE_MUTATION,
  MONEY_CATEGORY_UPDATE_MUTATION,
  MONEY_LIST_CATEGORIES_QUERY,
} from "@/lib/money-gql-documents";
import {
  categoriesOfKind,
  moneyCategoryById,
  moneyCategoryLabel,
  moneyCategorySelectGroups,
  type MoneyCategoryKind,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import {
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

type Category = MoneyCategoryRow & { archived?: boolean };

const KIND_META: Record<
  MoneyCategoryKind,
  { description: string; placeholder: string; allCategoriesHeading: string }
> = {
  expense: {
    description: "Categorize where your money goes.",
    placeholder: "Groceries",
    allCategoriesHeading: "All expense categories",
  },
  income: {
    description: "Categorize where your money comes from.",
    placeholder: "Salary",
    allCategoriesHeading: "All income categories",
  },
};

export function MoneySettingsCategoriesSection() {
  const notify = useNotify();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);
  const [kindTab, setKindTab] = useState<MoneyCategoryKind>("expense");

  const loadCategories = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyCategories: Category[] }>(
      MONEY_LIST_CATEGORIES_QUERY,
    );
    setCategories(res.moneyCategories);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await loadCategories();
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(presentClientError("money-settings-categories", e));
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadCategories]);

  return (
    <div className={MONEY_FULL_SPAN}>
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection
        id="money-settings-categories"
        title="Categories"
        description="Create and organize expense and income categories. Subcategories are grouped under their parent."
      >
        <p className="mb-4 text-sm text-muted">
          <Link
            href="/money/import/categories"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Import from CSV
          </Link>
        </p>
        <Tabs
          name="money-settings-category-kind"
          items={[
            { id: "expense", label: "Expense" },
            { id: "income", label: "Income" },
          ]}
          value={kindTab}
          onChange={(id) => setKindTab(id as MoneyCategoryKind)}
          className="mt-1"
        />
        <div
          role="tabpanel"
          className="mt-6"
          aria-label={kindTab === "expense" ? "Expense categories" : "Income categories"}
        >
          <CategoryKindPanel
            key={kindTab}
            kind={kindTab}
            categories={categories}
            notify={notify}
            reload={loadCategories}
          />
        </div>
      </SettingsSection>
    </div>
  );
}

type NotifyApi = ReturnType<typeof useNotify>;

function CategoryKindPanel({
  kind,
  categories,
  notify,
  reload,
}: {
  kind: MoneyCategoryKind;
  categories: Category[];
  notify: NotifyApi;
  reload: () => Promise<void>;
}) {
  const meta = KIND_META[kind];
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");

  const visible = useMemo(
    () => categoriesOfKind(categories, kind).filter((c) => !c.archived),
    [categories, kind],
  );
  const categoryById = useMemo(() => moneyCategoryById(visible), [visible]);
  const rootCategories = useMemo(
    () => visible.filter((c) => c.parentId == null),
    [visible],
  );
  const groups = useMemo(() => moneyCategorySelectGroups(visible), [visible]);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditParentId(c.parentId ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    try {
      await moneyGraphQLRequest(MONEY_CATEGORY_UPDATE_MUTATION, {
        id: editingId,
        input: {
          name: editName.trim(),
          parentId: editParentId ? editParentId : null,
        },
      });
      setEditingId(null);
      await reload();
      notify.success("Settings updated", "Category saved.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  async function removeCategory(id: string, label: string) {
    if (
      !window.confirm(
        `Remove category “${label}”? It will be archived and hidden from this list.`,
      )
    ) {
      return;
    }
    try {
      await moneyGraphQLRequest(MONEY_CATEGORY_ARCHIVE_MUTATION, { id });
      if (editingId === id) setEditingId(null);
      await reload();
      notify.success("Settings updated", "Category removed.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t remove category",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await moneyGraphQLRequest(MONEY_CATEGORY_CREATE_MUTATION, {
        input: {
          name: newName.trim(),
          kind,
          parentId: newParentId || null,
        },
      });
      setNewName("");
      setNewParentId("");
      await reload();
      notify.success("Settings updated", "Category added.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  function categoryRowLi(
    c: Category,
    displayMode: "default" | "underParent",
    nested: boolean,
  ) {
    const label = moneyCategoryLabel(c, categoryById);
    const shown = displayMode === "underParent" ? c.name : label;
    const parentChoices = rootCategories.filter((r) => r.id !== c.id);
    return (
      <li
        key={c.id}
        className={`px-3 py-2.5${nested ? " ml-3 border-l border-border pl-3" : ""}`}
      >
        {editingId === c.id ? (
          <form className="flex flex-col gap-3" onSubmit={saveEdit}>
            <Field label="Name" required>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </Field>
            <Field label="Parent category">
              <Select
                value={editParentId}
                onChange={(e) => setEditParentId(e.target.value)}
              >
                <option value="">Top-level category</option>
                {parentChoices.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" size="sm">
                Save
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-foreground">{shown}</span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => startEdit(c)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void removeCategory(c.id, label)}
              >
                Remove
              </Button>
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <>
      <p className="text-sm text-muted">{meta.description}</p>
      {visible.length > 0 ? (
        <>
          <h3 className="mt-4 text-sm font-medium text-foreground">{meta.allCategoriesHeading}</h3>
          <ul className="mt-3 divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm text-muted">
            {groups.map((g) =>
              g.type === "single" ? (
                categoryRowLi(g.category, "default", false)
              ) : (
                <li key={g.parent.id} className="list-none">
                  <ul className="divide-y divide-border">
                    {categoryRowLi(g.parent, "default", false)}
                    {g.children.map((ch) => categoryRowLi(ch, "underParent", true))}
                  </ul>
                </li>
              ),
            )}
          </ul>
          <div className="mt-8 border-t border-border pt-8">
            <h3 className="text-sm font-medium text-foreground">Add category</h3>
            <form className="mt-3 flex max-w-xl flex-col gap-3" onSubmit={onSubmit}>
              <Field label="Name" required>
                <Input
                  placeholder={meta.placeholder}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Parent (optional)">
                <Select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                >
                  <option value="">Top-level category</option>
                  {rootCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" variant="primary" className="self-start">
                Add category
              </Button>
            </form>
          </div>
        </>
      ) : (
        <form className="mt-4 flex max-w-xl flex-col gap-3" onSubmit={onSubmit}>
          <Field label="Name" required>
            <Input
              placeholder={meta.placeholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </Field>
          <Field label="Parent (optional)">
            <Select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
            >
              <option value="">Top-level category</option>
              {rootCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="primary" className="self-start">
            Add category
          </Button>
        </form>
      )}
    </>
  );
}
