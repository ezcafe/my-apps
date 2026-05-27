import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { responseCacheSessionKey } from "@/lib/graphql/money-yoga";

describe("responseCacheSessionKey", () => {
  it("keys api tokens by token fingerprint", () => {
    const request = new Request("http://localhost/api/graphql", {
      headers: {
        authorization: "Bearer mny_1234567890abcdefghijklmnopqrstuvwxyz",
      },
    });
    const key = responseCacheSessionKey(request);
    assert.ok(key?.startsWith("api:"));
  });

  it("includes workspace cookie for session requests", () => {
    const request = new Request("http://localhost/api/graphql", {
      headers: {
        cookie:
          "ctx_workspace_money=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa; authjs.session-token=session-1",
      },
    });
    const key = responseCacheSessionKey(request);
    assert.ok(key?.startsWith("cookie:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:"));
  });

  it("returns null when request is anonymous", () => {
    const request = new Request("http://localhost/api/graphql");
    assert.equal(responseCacheSessionKey(request), null);
  });
});
