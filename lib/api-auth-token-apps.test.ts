import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveBabyWorkspaceId,
  resolveInvestmentWorkspaceId,
  resolveMoneyWorkspaceId,
  type ResolvedRequestAuth,
} from "@/lib/api-auth";

function apiKeyAuth(
  overrides: Partial<Extract<ResolvedRequestAuth, { method: "api_key" }>> & {
    apiTokenApps: NonNullable<
      Extract<ResolvedRequestAuth, { method: "api_key" }>["apiTokenApps"]
    >;
  },
): ResolvedRequestAuth {
  return {
    method: "api_key",
    userSub: "user-1",
    workspaceId: "ws-1",
    apiTokenId: "tok-1",
    apiTokenAppKey: "money",
    scopes: ["read", "write"],
    ...overrides,
  };
}

describe("resolveMoneyWorkspaceId with apps grants", () => {
  it("allows money grant", async () => {
    const id = await resolveMoneyWorkspaceId(
      apiKeyAuth({ apiTokenApps: ["money"] }),
    );
    assert.equal(id, "ws-1");
  });

  it("rejects baby-only grant", async () => {
    const id = await resolveMoneyWorkspaceId(
      apiKeyAuth({ apiTokenApps: ["baby"] }),
    );
    assert.equal(id, null);
  });

  it("allows both when money included", async () => {
    const id = await resolveMoneyWorkspaceId(
      apiKeyAuth({ apiTokenApps: ["money", "baby"] }),
    );
    assert.equal(id, "ws-1");
  });
});

describe("resolveBabyWorkspaceId with apps grants", () => {
  it("allows baby grant", async () => {
    const id = await resolveBabyWorkspaceId(
      apiKeyAuth({ apiTokenApps: ["baby"] }),
    );
    assert.equal(id, "ws-1");
  });

  it("rejects money-only grant", async () => {
    const id = await resolveBabyWorkspaceId(
      apiKeyAuth({ apiTokenApps: ["money"] }),
    );
    assert.equal(id, null);
  });
});

describe("resolveInvestmentWorkspaceId money key + grants", () => {
  it("allows money grant on mny_ token", async () => {
    const id = await resolveInvestmentWorkspaceId(
      apiKeyAuth({ apiTokenApps: ["money"] }),
    );
    assert.equal(id, "ws-1");
  });

  it("rejects baby-only mny_ token", async () => {
    const id = await resolveInvestmentWorkspaceId(
      apiKeyAuth({ apiTokenApps: ["baby"] }),
    );
    assert.equal(id, null);
  });
});
