import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCanArchiveAccount,
  assertCanChangeAccountType,
  SYSTEM_ACCOUNT_PROTECTED,
  SYSTEM_ACCOUNT_TYPE_LOCKED,
} from "./money-services/accounts";

describe("assertCanArchiveAccount", () => {
  it("allows non-system accounts", () => {
    assert.doesNotThrow(() => assertCanArchiveAccount(null));
  });

  it("blocks system accounts", () => {
    assert.throws(
      () => assertCanArchiveAccount("savings"),
      (err: unknown) =>
        err instanceof Error && err.message === SYSTEM_ACCOUNT_PROTECTED,
    );
  });
});

describe("assertCanChangeAccountType", () => {
  it("allows type change on non-system accounts", () => {
    assert.doesNotThrow(() =>
      assertCanChangeAccountType(null, "checking", "savings"),
    );
  });

  it("allows name/balance-style updates that omit type", () => {
    assert.doesNotThrow(() =>
      assertCanChangeAccountType("loan", "loan", undefined),
    );
  });

  it("allows re-submitting the same type on system accounts", () => {
    assert.doesNotThrow(() =>
      assertCanChangeAccountType("credit", "credit", "credit"),
    );
  });

  it("rejects type change on system accounts", () => {
    assert.throws(
      () => assertCanChangeAccountType("investment", "investment", "checking"),
      (err: unknown) =>
        err instanceof Error && err.message === SYSTEM_ACCOUNT_TYPE_LOCKED,
    );
  });
});
