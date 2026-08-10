import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNetCashflowSankeyData } from "@/lib/money-services/analytics";

describe("buildNetCashflowSankeyData", () => {
  it("builds a central cash flow topology with directional links", () => {
    const payload = buildNetCashflowSankeyData(
      [
        { id: "salary", parentId: null, name: "Salary", color: "#2f7d4a" },
        { id: "housing", parentId: null, name: "Housing", color: "#d14343" },
      ],
      [
        { kind: "income", categoryId: "salary", valueMinor: 300_000 },
        { kind: "expense", categoryId: "housing", valueMinor: 120_000 },
      ],
    );

    const links = payload.sankey.links;
    assert.ok(links.some((l) => l.source === "income_salary" && l.target === "cash_flow_node"));
    assert.ok(links.some((l) => l.source === "cash_flow_node" && l.target === "expense_housing"));
    assert.ok(links.some((l) => l.source === "cash_flow_node" && l.target === "surplus_node"));
    assert.equal(payload.sankey.nodes.some((n) => n.id.startsWith("b:")), false);
  });

  it("chains parent-child nodes when both are net-income", () => {
    const payload = buildNetCashflowSankeyData(
      [
        { id: "work", parentId: null, name: "Work", color: "#2f7d4a" },
        { id: "bonus", parentId: "work", name: "Bonus", color: "#0d9488" },
      ],
      [
        { kind: "income", categoryId: "work", valueMinor: 180_000 },
        { kind: "income", categoryId: "bonus", valueMinor: 30_000 },
      ],
    );

    assert.ok(
      payload.sankey.links.some(
        (l) => l.source === "income_bonus" && l.target === "income_work",
      ),
    );
  });

  it("rolls small categories into Other and conserves flow", () => {
    const categories = Array.from({ length: 12 }, (_, i) => ({
      id: `c${i}`,
      parentId: null,
      name: `Cat ${i}`,
      color: null,
    }));
    const rows = categories.map((c, i) => ({
      kind: "expense" as const,
      categoryId: c.id,
      valueMinor: (12 - i) * 1_000,
    }));
    const income = {
      kind: "income" as const,
      categoryId: "salary",
      valueMinor: rows.reduce((sum, row) => sum + row.valueMinor, 0),
    };
    const payload = buildNetCashflowSankeyData(
      [...categories, { id: "salary", parentId: null, name: "Salary", color: null }],
      [income, ...rows],
      4,
    );

    assert.ok(payload.sankey.nodes.some((n) => n.id === "expense___other__"));
    const expenseTotal = payload.sankey.links
      .filter((l) => l.source === "cash_flow_node" && l.target.startsWith("expense_"))
      .reduce((sum, l) => sum + l.value, 0);
    assert.equal(expenseTotal, income.valueMinor);
  });

  it("returns no links for zero-flow rows", () => {
    const payload = buildNetCashflowSankeyData(
      [{ id: "misc", parentId: null, name: "Misc", color: null }],
      [{ kind: "expense", categoryId: "misc", valueMinor: 0 }],
    );

    assert.equal(payload.sankey.links.length, 0);
    assert.deepEqual(payload.sankey.nodes.map((n) => n.id), ["cash_flow_node"]);
  });
});
