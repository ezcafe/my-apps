import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loanProgressClickAllowed,
  type LoanProgressItemClickPayload,
  type LoanProgressSeriesKey,
} from "@/components/charts/loan-progress-chart";

describe("loanProgressClickAllowed", () => {
  it("allows click when series is visible", () => {
    assert.equal(loanProgressClickAllowed("actual", undefined), true);
    assert.equal(loanProgressClickAllowed("actual", new Set()), true);
  });

  it("blocks click when series is hidden", () => {
    const hidden = new Set<LoanProgressSeriesKey>(["actual", "scheduled"]);
    assert.equal(loanProgressClickAllowed("actual", hidden), false);
    assert.equal(loanProgressClickAllowed("projected", hidden), true);
  });

  it("payload shape includes label series index", () => {
    const payload: LoanProgressItemClickPayload = {
      label: "3",
      series: "actual",
      index: 2,
    };
    assert.equal(payload.label, "3");
    assert.equal(payload.series, "actual");
    assert.equal(payload.index, 2);
  });
});
