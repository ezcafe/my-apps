import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMoneyLedgerPerfSpans,
  isMoneyLedgerPerfEnabled,
  MONEY_LEDGER_PERF_SPAN_NAMES,
  rankMoneyLedgerPerfSpans,
} from "@/lib/money-ledger-perf-spans";

describe("isMoneyLedgerPerfEnabled", () => {
  it("is false when env unset or not 1", () => {
    assert.equal(isMoneyLedgerPerfEnabled({}), false);
    assert.equal(isMoneyLedgerPerfEnabled({ MONEY_LEDGER_PERF: "0" }), false);
    assert.equal(isMoneyLedgerPerfEnabled({ MONEY_LEDGER_PERF: "yes" }), false);
  });

  it("is true only when MONEY_LEDGER_PERF=1", () => {
    assert.equal(isMoneyLedgerPerfEnabled({ MONEY_LEDGER_PERF: "1" }), true);
  });
});

describe("createMoneyLedgerPerfSpans", () => {
  it("records distinct named spans with mock clock", async () => {
    let t = 1_000;
    const spans = createMoneyLedgerPerfSpans({
      now: () => {
        const cur = t;
        t += 25;
        return cur;
      },
    });

    await spans.time("bootstrap", async () => "boot");
    await spans.time("list.count", async () => 42);
    await spans.time("list.rows", async () => []);
    await spans.time("list.tags", async () => []);
    await spans.time("summary", async () => null);
    await spans.time("dehydrate", async () => undefined);

    const recorded = spans.snapshot();
    assert.deepEqual(
      recorded.map((s) => s.name),
      [
        "bootstrap",
        "list.count",
        "list.rows",
        "list.tags",
        "summary",
        "dehydrate",
      ],
    );
    for (const span of recorded) {
      assert.equal(span.ms, 25);
    }
    for (const name of MONEY_LEDGER_PERF_SPAN_NAMES) {
      assert.ok(recorded.some((s) => s.name === name), `missing span ${name}`);
    }
  });

  it("disabled collector records nothing (no prod leak)", async () => {
    let ran = 0;
    const spans = createMoneyLedgerPerfSpans({ enabled: false });
    const value = await spans.time("list.count", async () => {
      ran += 1;
      return 7;
    });
    assert.equal(value, 7);
    assert.equal(ran, 1);
    assert.deepEqual(spans.snapshot(), []);
  });
});

describe("rankMoneyLedgerPerfSpans", () => {
  it("orders by ms descending and keeps top N", () => {
    const ranked = rankMoneyLedgerPerfSpans(
      [
        { name: "bootstrap", ms: 10 },
        { name: "list.count", ms: 80 },
        { name: "list.rows", ms: 40 },
        { name: "list.tags", ms: 5 },
      ],
      2,
    );
    assert.deepEqual(
      ranked.map((s) => s.name),
      ["list.count", "list.rows"],
    );
  });
});
