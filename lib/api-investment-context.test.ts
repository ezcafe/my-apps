import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";
import type { ResolvedRequestAuth } from "@/lib/api-auth";

/**
 * Isolated file so mock.module runs before `@/lib/api-investment` is loaded.
 * Proves requireInvestmentContext cannot drop the app-key gate.
 */
describe("requireInvestmentContext with mocked auth", () => {
  let appKey: string | null = "money";
  let requireInvestmentContext: typeof import("@/lib/api-investment").requireInvestmentContext;

  before(async () => {
    const apiAuth = await import("@/lib/api-auth");
    mock.module("@/lib/api-auth", {
      namedExports: {
        ...apiAuth,
        resolveRequestAuth: async () =>
          ({
            method: "api_key",
            userSub: "user-1",
            workspaceId: "ws-1",
            apiTokenId: "tok-1",
            apiTokenAppKey: appKey,
            apiTokenApps: appKey === "money" ? ["money"] : [],
            scopes: ["read", "write"],
          }) satisfies ResolvedRequestAuth,
        resolveInvestmentWorkspaceId: async () => "ws-1",
        verifyMoneyWorkspaceAccess: async () => true,
      },
    });
    ({ requireInvestmentContext } = await import("@/lib/api-investment"));
  });

  it("money key → context", async () => {
    appKey = "money";
    const ctx = await requireInvestmentContext();
    assert.ok(!("error" in ctx));
    if ("error" in ctx) return;
    assert.equal(ctx.userSub, "user-1");
    assert.equal(ctx.workspaceId, "ws-1");
  });

  it("investment key → context", async () => {
    appKey = "investment";
    const ctx = await requireInvestmentContext();
    assert.ok(!("error" in ctx));
    if ("error" in ctx) return;
    assert.equal(ctx.workspaceId, "ws-1");
  });

  it("savings key → forbidden", async () => {
    appKey = "savings";
    const ctx = await requireInvestmentContext();
    assert.ok("error" in ctx);
    if (!("error" in ctx)) return;
    assert.equal(ctx.error.status, 403);
    const body = (await ctx.error.json()) as { code: string };
    assert.equal(body.code, "forbidden");
  });
});
