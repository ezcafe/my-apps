import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MoneyAmountField } from "@/components/money-amount-field";
import {
  MoneyCategoryField,
  MoneyMultiCategoryField,
} from "@/components/money-category-field";

describe("MoneyAmountField", () => {
  it("renders leading and trailing addons from props", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyAmountField, {
        label: "Amount",
        value: "10",
        onChange: () => {},
        leadingAddon: "$",
        trailingAddon: "USD",
      }),
    );
    assert.match(html, /data-testid="money-amount-field"/);
    assert.match(html, /\$/);
    assert.match(html, /USD/);
  });

  it("allows empty currency (Growth) with trailing unit only", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyAmountField, {
        label: "Value",
        value: "3.2",
        onChange: () => {},
        trailingAddon: "kg",
        "data-testid": "baby-growth-value",
      }),
    );
    assert.match(html, /data-testid="money-amount-field"/);
    assert.match(html, /data-testid="baby-growth-value"/);
    assert.match(html, /kg/);
    assert.doesNotMatch(html, />\$</);
  });
});

describe("MoneyCategoryField", () => {
  it("renders single-select Category chrome", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyCategoryField, {
        legend: "Category",
        ariaLabel: "Category",
        items: [
          { id: "food", label: "Food", usageCount: 3 },
          { id: "rent", label: "Rent", usageCount: 1 },
        ],
        selectedId: "food",
        onSelect: () => {},
        otherLabel: "Other",
      }),
    );
    assert.match(html, /data-testid="money-category-field"/);
    assert.match(html, /Food/);
    assert.match(html, /Rent/);
  });

  it("applies grid-column class on the wrapper grid item", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyCategoryField, {
        legend: "Category",
        ariaLabel: "Category",
        className: "[grid-column:1/-1]",
        items: [{ id: "food", label: "Food", usageCount: 3 }],
        selectedId: "food",
        onSelect: () => {},
        otherLabel: "Other",
      }),
    );
    assert.match(
      html,
      /data-testid="money-category-field"[^>]*\[grid-column:1\/-1\]/,
    );
    assert.doesNotMatch(
      html,
      /<fieldset[^>]*\[grid-column:1\/-1\]/,
    );
  });
});

describe("MoneyMultiCategoryField", () => {
  it("exposes multi wrapper testid for Growth Symptoms", () => {
    const html = renderToStaticMarkup(
      createElement(MoneyMultiCategoryField, {
        legend: "Symptoms",
        ariaLabel: "Symptoms",
        items: [
          { id: "cough", label: "Cough", usageCount: 1 },
          { id: "rash", label: "Rash", usageCount: 1 },
        ],
        selectedIds: ["cough"],
        onChange: () => {},
        otherLabel: "Other",
      }),
    );
    assert.match(html, /data-testid="money-multi-category-field"/);
    assert.match(html, /Cough/);
  });
});

describe("money form auto-fit grids", () => {
  it("forces full-span children so fields cannot pack side-by-side", () => {
    const files = [
      "components/money-transaction-form.tsx",
      "components/transaction-edit-form.tsx",
      "components/money-dashboard-skeleton.tsx",
    ];
    for (const rel of files) {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      assert.match(
        src,
        /\[&>\*\]:col-span-full/,
        `${rel} should use [&>*]:col-span-full on the auto-fit form grid`,
      );
    }
  });
});
