import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isInvestmentApiTokenAppKeyAllowed } from "@/lib/api-investment";
import {
  resolveInvestmentWorkspaceId,
  type ResolvedRequestAuth,
} from "@/lib/api-auth";

describe("requireInvestmentContext app-key gate", () => {
  it("allows money and investment keys; rejects other", () => {
    assert.equal(isInvestmentApiTokenAppKeyAllowed("money"), true);
    assert.equal(isInvestmentApiTokenAppKeyAllowed("investment"), true);
    assert.equal(isInvestmentApiTokenAppKeyAllowed("savings"), false);
    assert.equal(isInvestmentApiTokenAppKeyAllowed("baby"), false);
    assert.equal(isInvestmentApiTokenAppKeyAllowed(null), false);
  });
});

describe("GraphQL investment resolve still accepts money key (regression)", () => {
  it("resolveInvestmentWorkspaceId returns workspace for money api key", async () => {
    const auth: ResolvedRequestAuth = {
      method: "api_key",
      userSub: "user-1",
      workspaceId: "ws-money-key",
      apiTokenId: "tok-1",
      apiTokenAppKey: "money",
      apiTokenApps: ["money"],
      scopes: ["read", "write"],
    };
    const id = await resolveInvestmentWorkspaceId(auth);
    assert.equal(id, "ws-money-key");
  });

  it("resolveInvestmentWorkspaceId returns workspace for investment api key", async () => {
    const auth: ResolvedRequestAuth = {
      method: "api_key",
      userSub: "user-1",
      workspaceId: "ws-inv-key",
      apiTokenId: "tok-2",
      apiTokenAppKey: "investment",
      apiTokenApps: [],
      scopes: ["read", "write"],
    };
    const id = await resolveInvestmentWorkspaceId(auth);
    assert.equal(id, "ws-inv-key");
  });

  it("resolveInvestmentWorkspaceId rejects savings key", async () => {
    const auth: ResolvedRequestAuth = {
      method: "api_key",
      userSub: "user-1",
      workspaceId: "ws-sav",
      apiTokenId: "tok-3",
      apiTokenAppKey: "savings",
      apiTokenApps: [],
      scopes: ["read", "write"],
    };
    const id = await resolveInvestmentWorkspaceId(auth);
    assert.equal(id, null);
  });
});
