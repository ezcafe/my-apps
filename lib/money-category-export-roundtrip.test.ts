import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moneyExportCsv } from "@/lib/money-export";
import { moneyImportFieldDefs } from "@/lib/money-import-kinds";
import { parseMoneyImportCsv } from "@/lib/money-import-csv";

describe("money category export round-trip parent refs", () => {
  it("field defs include batch sourceId / parentSourceId", () => {
    const keys = moneyImportFieldDefs("categories").map((d) => d.key);
    assert.ok(keys.includes("sourceId"));
    assert.ok(keys.includes("parentSourceId"));
  });

  it("export CSV uses sourceId/parentSourceId and leaves parentId empty", () => {
    const parentId = "a3fcc862-d939-4d35-8346-e47a43260c98";
    const childId = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";
    const csv = moneyExportCsv("categories", [
      {
        name: "Necessities",
        kind: "expense",
        sourceId: parentId,
        parentSourceId: "",
        parentId: "",
        archived: false,
      },
      {
        name: "Bills",
        kind: "expense",
        sourceId: childId,
        parentSourceId: parentId,
        parentId: "",
        archived: false,
      },
    ]);
    assert.match(csv, /^name,kind,sourceId,parentSourceId,parentId,archived\n/);
    assert.match(
      csv,
      new RegExp(
        `Bills,expense,${childId},${parentId},,false`,
      ),
    );
    assert.match(
      csv,
      new RegExp(`Necessities,expense,${parentId},,,false`),
    );

    const parsed = parseMoneyImportCsv(csv, "categories");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const rows = parsed.preview.rows as {
      name: string;
      parentId?: string;
      parentSourceId?: string;
      sourceId?: string;
    }[];
    const bills = rows.find((r) => r.name === "Bills");
    assert.ok(bills);
    assert.equal(bills.parentId, undefined);
    assert.equal(bills.parentSourceId, parentId);
    assert.equal(bills.sourceId, childId);
  });
});

