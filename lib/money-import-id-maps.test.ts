import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmptyMoneyImportIdMaps,
  remapFlatMoneyImportRows,
  remapImportedId,
} from "@/lib/money-import-id-maps";

describe("money import id remaps", () => {
  it("remapImportedId maps known ids and leaves unknowns", () => {
    const map = new Map([["old", "new"]]);
    assert.equal(remapImportedId(map, "old"), "new");
    assert.equal(remapImportedId(map, "other"), "other");
    assert.equal(remapImportedId(map, ""), "");
    assert.equal(remapImportedId(map, null), null);
  });

  it("remapFlatMoneyImportRows rewrites transaction and budget account FKs", () => {
    const maps = createEmptyMoneyImportIdMaps();
    maps.accounts.set("acc-old", "acc-new");
    maps.categories.set("cat-old", "cat-new");

    const tx = remapFlatMoneyImportRows(
      "transactions",
      [
        {
          accountId: "acc-old",
          categoryId: "cat-old",
          merchantId: "",
          kind: "expense",
          amountMinor: "100",
        },
      ],
      maps,
    );
    assert.equal(tx[0]!.accountId, "acc-new");
    assert.equal(tx[0]!.categoryId, "cat-new");

    const budgets = remapFlatMoneyImportRows(
      "budgets",
      [
        {
          scopeType: "account",
          scopeId: "acc-old",
          limitAmountMinor: "500",
        },
      ],
      maps,
    );
    assert.equal(budgets[0]!.scopeId, "acc-new");
  });
});
