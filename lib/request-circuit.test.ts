import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  REQUEST_CIRCUIT_MAX_FAILURES,
  isRequestCircuitOpen,
  recordRequestFailure,
  recordRequestSuccess,
  requestCircuitSnapshot,
  resetRequestCircuit,
} from "@/lib/request-circuit";

describe("request circuit", () => {
  beforeEach(() => {
    resetRequestCircuit();
  });

  it("stays closed before the failure threshold", () => {
    for (let i = 0; i < REQUEST_CIRCUIT_MAX_FAILURES - 1; i += 1) {
      recordRequestFailure();
    }
    assert.equal(isRequestCircuitOpen(), false);
    assert.equal(
      requestCircuitSnapshot().consecutiveFailures,
      REQUEST_CIRCUIT_MAX_FAILURES - 1,
    );
  });

  it("opens after consecutive persistent failures", () => {
    for (let i = 0; i < REQUEST_CIRCUIT_MAX_FAILURES; i += 1) {
      recordRequestFailure();
    }
    assert.equal(isRequestCircuitOpen(), true);
  });

  it("closes on success or manual reset", () => {
    for (let i = 0; i < REQUEST_CIRCUIT_MAX_FAILURES; i += 1) {
      recordRequestFailure();
    }
    recordRequestSuccess();
    assert.equal(isRequestCircuitOpen(), false);
    assert.equal(requestCircuitSnapshot().consecutiveFailures, 0);

    for (let i = 0; i < REQUEST_CIRCUIT_MAX_FAILURES; i += 1) {
      recordRequestFailure();
    }
    resetRequestCircuit();
    assert.equal(isRequestCircuitOpen(), false);
  });
});
