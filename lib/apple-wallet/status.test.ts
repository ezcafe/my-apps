import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLatestField, LATEST_FIELD_KEY } from "@/lib/apple-wallet/pass";
import { walletStatusFrom } from "@/lib/apple-wallet/status";

describe("apple wallet pass fields", () => {
  it("pass field includes changeMessage", () => {
    const field = buildLatestField("Fed at 2pm");
    assert.equal(field.key, LATEST_FIELD_KEY);
    assert.equal(field.changeMessage, "%@");
    assert.equal(field.value, "Fed at 2pm");
  });
});

describe("walletStatusFrom", () => {
  it("maps not_linked / pending / active / ephemeral fail", () => {
    assert.equal(walletStatusFrom(null, 0), "not_linked");
    assert.equal(walletStatusFrom({ status: "removed" }, 0), "not_linked");
    assert.equal(walletStatusFrom({ status: "active" }, 0), "pending");
    assert.equal(walletStatusFrom({ status: "active" }, 1), "active");
    assert.equal(walletStatusFrom({ status: "active" }, 2), "active");
    assert.equal(walletStatusFrom(null, 0, true), "fail");
    assert.equal(walletStatusFrom({ status: "active" }, 1, false), "active");
    assert.notEqual(walletStatusFrom({ status: "active" }, 0, false), "fail");
  });
});
