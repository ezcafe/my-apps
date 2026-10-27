import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createInvestmentsLoansPerfSpans,
  INVESTMENTS_LOANS_PERF_SPAN_NAMES,
  INVESTMENTS_PERF_SPAN_NAMES,
  isInvestmentsLoansPerfEnabled,
  LOANS_PERF_SPAN_NAMES,
  rankInvestmentsLoansPerfSpans,
} from "@/lib/investments-loans-perf-spans";

describe("isInvestmentsLoansPerfEnabled", () => {
  it("is false when env unset or not 1", () => {
    assert.equal(isInvestmentsLoansPerfEnabled({}), false);
    assert.equal(
      isInvestmentsLoansPerfEnabled({ INVESTMENTS_LOANS_PERF: "0" }),
      false,
    );
    assert.equal(
      isInvestmentsLoansPerfEnabled({ INVESTMENTS_LOANS_PERF: "yes" }),
      false,
    );
  });

  it("is true only when INVESTMENTS_LOANS_PERF=1", () => {
    assert.equal(
      isInvestmentsLoansPerfEnabled({ INVESTMENTS_LOANS_PERF: "1" }),
      true,
    );
  });
});

describe("createInvestmentsLoansPerfSpans", () => {
  it("records distinct investment + loan spans with mock clock", async () => {
    let t = 1_000;
    const spans = createInvestmentsLoansPerfSpans({
      now: () => {
        const cur = t;
        t += 10;
        return cur;
      },
    });

    for (const name of INVESTMENTS_PERF_SPAN_NAMES) {
      await spans.time(name, async () => undefined);
    }
    for (const name of LOANS_PERF_SPAN_NAMES) {
      await spans.time(name, async () => undefined);
    }

    const recorded = spans.snapshot();
    assert.deepEqual(
      recorded.map((s) => s.name),
      [...INVESTMENTS_LOANS_PERF_SPAN_NAMES],
    );
    for (const span of recorded) {
      assert.equal(span.ms, 10);
    }
  });

  it("disabled collector records nothing (no prod leak)", async () => {
    let ran = 0;
    const spans = createInvestmentsLoansPerfSpans({ enabled: false });
    const value = await spans.time("investments.list", async () => {
      ran += 1;
      return 7;
    });
    assert.equal(value, 7);
    assert.equal(ran, 1);
    assert.deepEqual(spans.snapshot(), []);
  });
});

describe("rankInvestmentsLoansPerfSpans", () => {
  it("orders by ms descending and keeps top N", () => {
    const ranked = rankInvestmentsLoansPerfSpans(
      [
        { name: "investments.list", ms: 10 },
        { name: "loans.detail.serialize", ms: 80 },
        { name: "loans.list.page1", ms: 40 },
      ],
      2,
    );
    assert.deepEqual(
      ranked.map((s) => s.name),
      ["loans.detail.serialize", "loans.list.page1"],
    );
  });
});
