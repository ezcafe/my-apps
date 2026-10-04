import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Source locks for Non-RLS tables (docs/ARCHITECTURE.md).
 * Ensures writers keep userSub / actor ownership filters.
 */
describe("Non-RLS ownership filters (source)", () => {
  const root = process.cwd();

  it("api_token revoke filters by userSub + token id", () => {
    const src = readFileSync(join(root, "lib/api-token-service.ts"), "utf8");
    assert.match(src, /revokeApiTokenForUser/);
    assert.match(src, /eq\(apiToken\.id, tokenId\)/);
    assert.match(src, /eq\(apiToken\.userSub, userSub\)/);
  });

  it("api_token list filters by userSub", () => {
    const src = readFileSync(join(root, "lib/api-token-service.ts"), "utf8");
    assert.match(src, /eq\(apiToken\.userSub, userSub\)/);
    assert.match(src, /isNull\(apiToken\.revokedAt\)/);
  });

  it("http_idempotency select/complete scopes by workspaceId + userSub + route", () => {
    const src = readFileSync(join(root, "lib/http-idempotency.ts"), "utf8");
    assert.match(src, /eq\(httpIdempotency\.workspaceId, actor\.workspaceId\)/);
    assert.match(src, /eq\(httpIdempotency\.userSub, actor\.userSub\)/);
    assert.match(src, /eq\(httpIdempotency\.route, actor\.route\)/);
  });

  it("workspace members add/remove verify owner before mutate", () => {
    const add = readFileSync(
      join(root, "app/api/workspace/members/route.ts"),
      "utf8",
    );
    const remove = readFileSync(
      join(root, "app/api/workspace/members/remove/route.ts"),
      "utf8",
    );
    assert.match(add, /assertWorkspaceOwner/);
    assert.match(remove, /assertWorkspaceOwner/);
    assert.match(add, /beginIdempotencyRequest/);
    assert.match(remove, /beginIdempotencyRequest/);
  });

  it("workspace reset verifies owner before claim", () => {
    const src = readFileSync(
      join(root, "app/api/workspace/reset/route.ts"),
      "utf8",
    );
    assert.match(src, /assertWorkspaceOwner/);
    assert.match(src, /beginIdempotencyRequest/);
  });
});
