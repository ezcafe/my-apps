import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  investmentActivityTypeToTransactionKind,
  activityDateToOccurredAt,
  occurredAtToActivityDate,
} from "@/lib/money-investment-activity";

describe("investmentActivityTypeToTransactionKind", () => {
  it("maps trades to expense and cash funding as usual", () => {
    assert.equal(investmentActivityTypeToTransactionKind("buy"), "expense");
    assert.equal(investmentActivityTypeToTransactionKind("sell"), "expense");
    assert.equal(investmentActivityTypeToTransactionKind("deposit"), "income");
    assert.equal(investmentActivityTypeToTransactionKind("withdraw"), "expense");
    assert.equal(investmentActivityTypeToTransactionKind("dividend"), "income");
  });
});

describe("activity date helpers", () => {
  it("round-trips YYYY-MM-DD", () => {
    const d = activityDateToOccurredAt("2026-01-15");
    assert.equal(occurredAtToActivityDate(d), "2026-01-15");
  });
});
