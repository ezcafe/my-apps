import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IDEMPOTENCY_KEY_MAX_LENGTH } from "@/lib/idempotency-constants";
import {
  jsonWithIdempotencyHeaders,
  mintIdempotencyKey,
} from "@/lib/idempotency-client";

describe("idempotency-client", () => {
  it("mintIdempotencyKey_nonEmptyAndWithin128", () => {
    const key = mintIdempotencyKey();
    assert.ok(key.trim().length > 0);
    assert.ok([...key].length <= IDEMPOTENCY_KEY_MAX_LENGTH);
  });

  it("jsonWithIdempotencyHeaders_setsContentTypeAndKey", () => {
    const headers = jsonWithIdempotencyHeaders();
    assert.equal(headers.get("Content-Type"), "application/json");
    const key = headers.get("Idempotency-Key");
    assert.ok(key);
    assert.ok(key.trim().length > 0);
    assert.ok([...key].length <= IDEMPOTENCY_KEY_MAX_LENGTH);
  });

  it("jsonWithIdempotencyHeaders_mergeKeepsKeyAndContentType", () => {
    const headers = jsonWithIdempotencyHeaders({
      "Content-Type": "text/plain",
      "Idempotency-Key": "should-be-replaced",
      "X-Extra": "1",
    });
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(headers.get("X-Extra"), "1");
    assert.notEqual(headers.get("Idempotency-Key"), "should-be-replaced");
    assert.ok(headers.get("Idempotency-Key"));
  });
});
