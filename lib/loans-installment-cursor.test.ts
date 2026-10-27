import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeLoansInstallmentCursor,
  encodeLoansInstallmentCursor,
} from "@/lib/loans-installment-cursor";

describe("loans installment keyset cursor", () => {
  it("round-trips installmentNumber + id", () => {
    const key = {
      installmentNumber: 12,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    };
    const encoded = encodeLoansInstallmentCursor(key);
    assert.equal(encoded, "12:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    assert.deepEqual(decodeLoansInstallmentCursor(encoded), key);
  });

  it("rejects legacy UUID-only cursor (restart)", () => {
    assert.equal(
      decodeLoansInstallmentCursor("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      null,
    );
  });

  it("rejects malformed cursors", () => {
    assert.equal(decodeLoansInstallmentCursor(""), null);
    assert.equal(decodeLoansInstallmentCursor(null), null);
    assert.equal(decodeLoansInstallmentCursor("0:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), null);
    assert.equal(decodeLoansInstallmentCursor("1:not-a-uuid"), null);
  });
});
