import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";
import { NextResponse } from "next/server";

/**
 * Auth smoke for Foods POST — mock.module before route/context load.
 * Listed in scripts/run-unit-tests.mjs MODULE_MOCK_FILES.
 */
describe("POST foods entries auth", () => {
  let requireFoodsContext: typeof import("@/lib/api-foods").requireFoodsContext;

  before(async () => {
    mock.module("@/lib/api-auth", {
      namedExports: {
        resolveRequestAuth: async () => ({
          method: "session" as const,
          userSub: null,
          workspaceId: null,
          apiTokenId: null,
          apiTokenAppKey: null,
          apiTokenApps: null,
          scopes: null,
        }),
        hasWriteScope: () => true,
      },
    });
    const mod = await import("@/lib/api-foods");
    requireFoodsContext = mod.requireFoodsContext;
  });

  it("POST foods entries returns 401/403 without membership", async () => {
    const result = await requireFoodsContext(
      new Request("http://localhost/api/foods/entries", { method: "POST" }),
    );
    assert.ok("error" in result, "expected error branch");
    assert.ok(result.error instanceof NextResponse);
    assert.ok(
      result.error.status === 401 || result.error.status === 403,
      `expected 401 or 403, got ${result.error.status}`,
    );
  });
});
