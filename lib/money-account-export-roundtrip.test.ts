import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moneyExportCsv } from "@/lib/money-export";
import { moneyImportFieldDefs } from "@/lib/money-import-kinds";
import { parseMoneyImportCsv } from "@/lib/money-import-csv";

describe("money account export round-trip systemKey", () => {
  it("field defs include systemKey and sourceId", () => {
    const keys = moneyImportFieldDefs("accounts").map((d) => d.key);
    assert.ok(keys.includes("systemKey"));
    assert.ok(keys.includes("sourceId"));
  });

  it("export CSV includes systemKey/sourceId and import parses them", () => {
    const sourceId = "a3fcc862-d939-4d35-8346-e47a43260c98";
    const csv = moneyExportCsv("accounts", [
      {
        name: "Credit Card",
        type: "credit",
        currency: "USD",
        institution: "",
        balanceMinor: 0,
        sortOrder: 0,
        archived: false,
        systemKey: "credit",
        sourceId,
      },
      {
        name: "Checking",
        type: "checking",
        currency: "USD",
        institution: "Bank",
        balanceMinor: 100,
        sortOrder: 4,
        archived: false,
        systemKey: "",
        sourceId: "",
      },
    ]);
    assert.match(csv, /systemKey/);
    assert.match(csv, /sourceId/);
    assert.match(csv, new RegExp(`Credit Card,credit,USD,,0,0,false,credit,${sourceId}`));

    const parsed = parseMoneyImportCsv(csv, "accounts");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const rows = parsed.preview.rows as {
      name: string;
      systemKey?: string;
      sourceId?: string;
    }[];
    const credit = rows.find((r) => r.name === "Credit Card");
    const checking = rows.find((r) => r.name === "Checking");
    assert.ok(credit);
    assert.equal(credit.systemKey, "credit");
    assert.equal(credit.sourceId, sourceId);
    assert.ok(checking);
    assert.equal(checking.systemKey, undefined);
    assert.equal(checking.sourceId, undefined);
  });
});
