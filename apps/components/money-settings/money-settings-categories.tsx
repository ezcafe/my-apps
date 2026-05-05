"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { moneyApiJson } from "@/lib/money-fetch";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  moneyRootCategories,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import {
  inputCls,
  MoneySettingsBackLink,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

type Category = MoneyCategoryRow;

export function MoneySettingsCategoriesSection() {
  const notify = useNotify();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);
  const rootCategories = useMemo(
    () => moneyRootCategories(categories),
    [categories],
  );

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
      <MoneySettingsBackLink />
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
            {categories.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {moneyCategoryLabel(c, categoryById)}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
