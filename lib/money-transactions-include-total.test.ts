import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { transactionListQuerySchema } from "@/lib/validators/money";
import {
  moneyTransactionsListQueryInput,
  moneyTransactionsQueryOptions,
} from "@/lib/money-query-options";

describe("transactionListQuerySchema includeTotal", () => {
  it("defaults includeTotal to true", () => {
    const parsed = transactionListQuerySchema.parse({
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-31T23:59:59.999Z",
    });
    assert.equal(parsed.includeTotal, true);
  });

  it("accepts includeTotal false", () => {
    const parsed = transactionListQuerySchema.parse({
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-31T23:59:59.999Z",
      includeTotal: false,
    });
    assert.equal(parsed.includeTotal, false);
  });
});

describe("moneyTransactions list input + queryKey includeTotal", () => {
  it("list input and queryKey differ when includeTotal flips", () => {
    const filterQuery =
      "from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-31T23%3A59%3A59.999Z";
    const withTotal = moneyTransactionsListQueryInput(
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
      true,
    );
    const skipTotal = moneyTransactionsListQueryInput(
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
      false,
    );
    assert.equal(withTotal.includeTotal, true);
    assert.equal(skipTotal.includeTotal, false);

    const keyTrue = moneyTransactionsQueryOptions(
      "ws-1",
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
      true,
    ).queryKey;
    const keyFalse = moneyTransactionsQueryOptions(
      "ws-1",
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
      false,
    ).queryKey;
    assert.notDeepEqual(keyTrue, keyFalse);
    assert.ok(keyTrue.includes(true));
    assert.ok(keyFalse.includes(false));
  });

  it("defaults includeTotal true on input and key when omitted", () => {
    const filterQuery =
      "from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-31T23%3A59%3A59.999Z";
    const input = moneyTransactionsListQueryInput(
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
    );
    assert.equal(input.includeTotal, true);
    const key = moneyTransactionsQueryOptions(
      "ws-1",
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
    ).queryKey;
    assert.ok(key.includes(true));
  });
});
