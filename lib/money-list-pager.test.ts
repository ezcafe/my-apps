import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  moneyListCanPageNext,
  moneyListPagerLabel,
  moneyListShowPager,
  moneyListTotalPages,
} from "@/lib/money-list-pager";

describe("moneyListPager", () => {
  it("disables Next from hasMore when total is null", () => {
    assert.equal(
      moneyListCanPageNext({ page: 1, total: null, hasMore: true, pageSize: 20 }),
      true,
    );
    assert.equal(
      moneyListCanPageNext({
        page: 2,
        total: null,
        hasMore: false,
        pageSize: 20,
      }),
      false,
    );
  });

  it("does not throw / blank when total null and hasMore true", () => {
    const label = moneyListPagerLabel({
      page: 1,
      total: null,
      hasMore: true,
      pageSize: 20,
    });
    assert.ok(label.length > 0);
    assert.equal(moneyListShowPager({ total: null, hasMore: true, rowCount: 20 }), true);
    assert.equal(moneyListTotalPages({ total: null, pageSize: 20 }), null);
  });

  it("empty + hasMore false hides pager", () => {
    assert.equal(
      moneyListShowPager({ total: null, hasMore: false, rowCount: 0 }),
      false,
    );
  });

  it("exact total keeps Page N of M math", () => {
    assert.equal(moneyListTotalPages({ total: 40, pageSize: 20 }), 2);
    assert.equal(
      moneyListCanPageNext({ page: 1, total: 40, hasMore: true, pageSize: 20 }),
      true,
    );
    assert.match(
      moneyListPagerLabel({
        page: 1,
        total: 40,
        hasMore: true,
        pageSize: 20,
      }),
      /Page 1 of 2/,
    );
  });
});
