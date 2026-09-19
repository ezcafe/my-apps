import assert from "node:assert/strict";
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
