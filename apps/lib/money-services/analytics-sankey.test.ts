import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNetCashflowSankeyData } from "@/lib/money-services/analytics";

describe("buildNetCashflowSankeyData", () => {
  it("builds a central cash flow topology with directional links", () => {
    const payload = buildNetCashflowSankeyData(
      [
        { id: "salary", parentId: null, name: "Salary", color: "#4ade80" },
        { id: "housing", parentId: null, name: "Housing", color: "#f87171" },
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
        { id: "work", parentId: null, name: "Work", color: "#4ade80" },
        { id: "bonus", parentId: "work", name: "Bonus", color: "#22c55e" },
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

  it("returns no links for zero-flow rows", () => {
    const payload = buildNetCashflowSankeyData(
      [{ id: "misc", parentId: null, name: "Misc", color: null }],
      [{ kind: "expense", categoryId: "misc", valueMinor: 0 }],
    );

    assert.equal(payload.sankey.links.length, 0);
    assert.deepEqual(payload.sankey.nodes.map((n) => n.id), ["cash_flow_node"]);
  });
});
