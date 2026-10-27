import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fetchMoneyTransactionListParts,
  hasMoreFromExactTotal,
  pageRowsWithHasMore,
} from "@/lib/money-list-total-policy";

describe("pageRowsWithHasMore", () => {
  it("sets hasMore true when pageSize+1 returns an extra row", () => {
    const rows = [1, 2, 3, 4];
    const result = pageRowsWithHasMore(rows, 3);
    assert.deepEqual(result.data, [1, 2, 3]);
    assert.equal(result.hasMore, true);
  });

  it("sets hasMore false when short page", () => {
    const rows = [1, 2];
    const result = pageRowsWithHasMore(rows, 3);
    assert.deepEqual(result.data, [1, 2]);
    assert.equal(result.hasMore, false);
  });
});

describe("hasMoreFromExactTotal", () => {
  it("uses page*pageSize < total", () => {
    assert.equal(hasMoreFromExactTotal(1, 20, 40), true);
    assert.equal(hasMoreFromExactTotal(2, 20, 40), false);
    assert.equal(hasMoreFromExactTotal(1, 20, 20), false);
  });
});

describe("fetchMoneyTransactionListParts", () => {
  it("includeTotal false skips COUNT, total null, hasMore from pageSize+1", async () => {
    let countCalls = 0;
    const result = await fetchMoneyTransactionListParts({
      includeTotal: false,
      page: 1,
      pageSize: 2,
      runCount: async () => {
        countCalls += 1;
        return 99;
      },
      runRows: async (limit) => {
        assert.equal(limit, 3);
        return ["a", "b", "c"];
      },
    });
    assert.equal(countCalls, 0);
    assert.equal(result.total, null);
    assert.notEqual(result.total, -1);
    assert.deepEqual(result.data, ["a", "b"]);
    assert.equal(result.hasMore, true);
  });

  it("includeTotal true runs COUNT and keeps exact total", async () => {
    let countCalls = 0;
    const result = await fetchMoneyTransactionListParts({
      includeTotal: true,
      page: 1,
      pageSize: 2,
      runCount: async () => {
        countCalls += 1;
        return 5;
      },
      runRows: async (limit) => {
        assert.equal(limit, 2);
        return ["a", "b"];
      },
    });
    assert.equal(countCalls, 1);
    assert.equal(result.total, 5);
    assert.deepEqual(result.data, ["a", "b"]);
    assert.equal(result.hasMore, true);
  });

  it("includeTotal true short last page sets hasMore false", async () => {
    const result = await fetchMoneyTransactionListParts({
      includeTotal: true,
      page: 3,
      pageSize: 2,
      runCount: async () => 5,
      runRows: async () => ["e"],
    });
    assert.equal(result.total, 5);
    assert.equal(result.hasMore, false);
  });
});
