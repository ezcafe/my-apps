import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { graphqlRequestHeaders } from "@/lib/gql-request-headers";

describe("graphqlRequestHeaders", () => {
  it("returns Content-Type; omits Cookie outside a Next request scope", async () => {
    const headers = await graphqlRequestHeaders();
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(headers.Cookie, undefined);
  });
});
