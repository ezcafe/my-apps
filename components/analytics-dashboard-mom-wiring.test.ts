import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Contract: Money Insights must pass overview column into AnalyticsStats. */
describe("Money Insights MoM wiring", () => {
  it("passes overviewColumn into AnalyticsStats on insights dashboard", () => {
    const src = readFileSync(
      join(process.cwd(), "components/analytics-dashboard.tsx"),
      "utf8",
    );
    assert.match(
      src,
      /<AnalyticsStats[\s\S]*?column=\{overviewColumn\}/,
      "AnalyticsStats must receive overviewColumn for Expenses MoM",
    );
  });
});
