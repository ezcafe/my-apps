import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { shouldRetryQuery } from "@/lib/get-query-client";
import {
  REQUEST_CIRCUIT_MAX_FAILURES,
  recordRequestFailure,
  resetRequestCircuit,
} from "@/lib/request-circuit";
import {
  UserFacingError,
  isPersistentRequestError,
} from "@/lib/user-facing-error";

describe("shouldRetryQuery", () => {
  beforeEach(() => {
    resetRequestCircuit();
  });

  it("does not retry persistent DB outages", () => {
    const error = new UserFacingError("down", { code: "DB_UNAVAILABLE" });
    assert.equal(isPersistentRequestError(error), true);
    assert.equal(shouldRetryQuery(0, error), false);
  });

  it("retries a transient error once", () => {
    assert.equal(shouldRetryQuery(0, new Error("boom")), true);
    assert.equal(shouldRetryQuery(1, new Error("boom")), false);
  });

  it("does not retry after the session circuit opens", () => {
    for (let i = 0; i < REQUEST_CIRCUIT_MAX_FAILURES; i += 1) {
      recordRequestFailure();
    }
    assert.equal(shouldRetryQuery(0, new Error("boom")), false);
  });
});
