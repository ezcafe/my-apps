"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { moneyApiJson } from "@/lib/money-fetch";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import {
  inputCls,
  MoneySettingsBackLink,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

type Category = MoneyCategoryRow & { archived?: boolean };

export function MoneySettingsCategoriesSection() {
  const notify = useNotify();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.archived),
    [categories],
  );
  const categoryById = useMemo(
    () => moneyCategoryById(visibleCategories),
    [visibleCategories],
  );
  const rootCategories = useMemo(
    () => visibleCategories.filter((c) => c.parentId == null),
    [visibleCategories],
  );
  const sortedVisible = useMemo(() => {
    const copy = [...visibleCategories];
    copy.sort((a, b) =>
      moneyCategoryLabel(a, categoryById).localeCompare(
        moneyCategoryLabel(b, categoryById),
      ),
    );
    return copy;
  }, [visibleCategories, categoryById]);

  const loadCategories = useCallback(async () => {
    const { data } = await moneyApiJson<Category[]>("/api/money/categories");
    setCategories(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await loadCategories();
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(e instanceof Error ? e.message : "Error");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadCategories]);

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
      await moneyApiJson(`/api/money/categories/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          parentId: editParentId ? editParentId : null,
        }),
      });
      setEditingId(null);
      await loadCategories();
      notify.success("Settings updated", "Category saved.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        err instanceof Error ? err.message : "Something went wrong",
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
      await moneyApiJson(`/api/money/categories/${id}`, { method: "DELETE" });
      if (editingId === id) setEditingId(null);
      await loadCategories();
      notify.success("Settings updated", "Category removed.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t remove category",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await moneyApiJson("/api/money/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newCategory.trim(),
          parentId: newCategoryParentId || null,
        }),
      });
      setNewCategory("");
      setNewCategoryParentId("");
      await loadCategories();
      notify.success("Settings updated", "Category added.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  return (
    <>
      <MoneySettingsBackLink current="Categories" />
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection
        id="money-settings-categories-page"
        title="Categories"
        description="Top-level categories can have subcategories."
      >
        <form className="flex max-w-xl flex-col gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Name</span>
            <input
              className={inputCls}
              placeholder="Groceries"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Parent (optional)</span>
            <select
              className={inputCls}
              value={newCategoryParentId}
              onChange={(e) => setNewCategoryParentId(e.target.value)}
            >
              <option value="">Top-level category</option>
              {rootCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={`${secondaryBtnCls} self-start`}>
            Add category
          </button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">All categories</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {sortedVisible.map((c) => {
              const label = moneyCategoryLabel(c, categoryById);
              const parentChoices = rootCategories.filter((r) => r.id !== c.id);
              return (
                <li
                  key={c.id}
                  className="rounded-lg border border-border bg-background px-3 py-2"
                >
                  {editingId === c.id ? (
                    <form className="flex flex-col gap-3" onSubmit={saveEdit}>
                      <input
                        className={inputCls}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        aria-label="Category name"
                      />
                      <select
                        className={inputCls}
                        value={editParentId}
                        onChange={(e) => setEditParentId(e.target.value)}
                        aria-label="Parent category"
                      >
                        <option value="">Top-level category</option>
                        {parentChoices.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className={secondaryBtnCls}>
                          Save
                        </button>
                        <button type="button" className={secondaryBtnCls} onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-foreground">{label}</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                          onClick={() => startEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${secondaryBtnCls} shrink-0 px-2 py-1 text-xs`}
                          onClick={() => void removeCategory(c.id, label)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
