import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calendarDayBounds,
  calendarMonthBounds,
  dateRangeParams,
  mergeDrilldownQuery,
  linePointDateForDrilldown,
  sankeyCategoryNodeFromId,
  seriesCategoryKeyForDrilldown,
} from "@/lib/analytics-build-query";

describe("calendarMonthBounds", () => {
  it("returns inclusive local calendar bounds for a 31-day month", () => {
    assert.deepEqual(calendarMonthBounds("2026-08"), {
      fromDate: "2026-08-01",
      toDate: "2026-08-31",
    });
  });

  it("handles February in a non-leap year", () => {
    assert.deepEqual(calendarMonthBounds("2025-02"), {
      fromDate: "2025-02-01",
      toDate: "2025-02-28",
    });
  });
});

describe("calendarDayBounds", () => {
  it("returns the same day for from and to", () => {
    assert.deepEqual(calendarDayBounds("2026-08-15"), {
      fromDate: "2026-08-15",
      toDate: "2026-08-15",
    });
  });
});

describe("sankeyCategoryNodeFromId", () => {
  it("parses income_ and expense_ category nodes", () => {
    assert.deepEqual(
      sankeyCategoryNodeFromId("income_11111111-1111-1111-1111-111111111111"),
      {
        categoryId: "11111111-1111-1111-1111-111111111111",
        kind: "income",
      },
    );
    assert.deepEqual(sankeyCategoryNodeFromId("expense_uncategorized"), {
      categoryId: "uncategorized",
      kind: "expense",
    });
  });

  it("returns null for hub and non-category nodes", () => {
    assert.equal(sankeyCategoryNodeFromId("cash_flow_node"), null);
    assert.equal(sankeyCategoryNodeFromId("surplus_node"), null);
  });
});

describe("seriesCategoryKeyForDrilldown", () => {
  it("maps uncategorized and skips other", () => {
    assert.equal(seriesCategoryKeyForDrilldown("uncategorized"), "__none__");
    assert.equal(seriesCategoryKeyForDrilldown("__other__"), null);
    assert.equal(
      seriesCategoryKeyForDrilldown("11111111-1111-1111-1111-111111111111"),
      "11111111-1111-1111-1111-111111111111",
    );
  });
});

describe("linePointDateForDrilldown", () => {
  it("passes through ISO date keys", () => {
    assert.equal(
      linePointDateForDrilldown("2026-07-04", "date", ""),
      "2026-07-04",
    );
  });

  it("builds a calendar day from day-of-month + filter from", () => {
    const from = new Date(2026, 7, 1, 0, 0, 0, 0).toISOString();
    const q = `from=${encodeURIComponent(from)}`;
    assert.equal(linePointDateForDrilldown("15", "dayOfMonth", q), "2026-08-15");
  });
});

describe("mergeDrilldownQuery", () => {
  const base = "from=old-from&to=old-to&kinds=expense&accountIds=a1&categoryIds=c1";

  it("replaces kinds", () => {
    const q = mergeDrilldownQuery(base, { kinds: ["income"] });
    const sp = new URLSearchParams(q);
    assert.deepEqual(sp.getAll("kinds"), ["income"]);
    assert.equal(sp.get("categoryIds"), "c1");
  });

  it("replaces from/to when both dates provided", () => {
    const { from, to } = dateRangeParams("2026-08-01", "2026-08-31");
    const q = mergeDrilldownQuery(base, {
      fromDate: "2026-08-01",
      toDate: "2026-08-31",
      kinds: ["expense"],
    });
    const sp = new URLSearchParams(q);
    assert.equal(sp.get("from"), from);
    assert.equal(sp.get("to"), to);
    assert.deepEqual(sp.getAll("kinds"), ["expense"]);
  });

  it("replaces accountIds", () => {
    const q = mergeDrilldownQuery(base, { accountIds: ["a2", "a3"] });
    const sp = new URLSearchParams(q);
    assert.deepEqual(sp.getAll("accountIds"), ["a2", "a3"]);
  });
});
