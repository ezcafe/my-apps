import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeUserEmail,
  evaluateWorkspaceAppAccess,
} from "@/lib/workspace-app-access";

describe("normalizeUserEmail", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeUserEmail("  Ada@Example.COM "), "ada@example.com");
  });

  it("returns null for empty", () => {
    assert.equal(normalizeUserEmail(""), null);
    assert.equal(normalizeUserEmail("   "), null);
    assert.equal(normalizeUserEmail(null), null);
    assert.equal(normalizeUserEmail(undefined), null);
  });
});

describe("evaluateWorkspaceAppAccess", () => {
  it("denies when not a member", () => {
    assert.equal(
      evaluateWorkspaceAppAccess({
        role: null,
        workspaceKind: "shared",
        appKey: "money",
        hasAppGrant: true,
      }),
      false,
    );
  });

  it("allows owners for any app", () => {
    assert.equal(
      evaluateWorkspaceAppAccess({
        role: "owner",
        workspaceKind: "shared",
        appKey: "money",
        hasAppGrant: false,
      }),
      true,
    );
  });

  it("allows personal workspace members", () => {
    assert.equal(
      evaluateWorkspaceAppAccess({
        role: "member",
        workspaceKind: "personal",
        appKey: "money",
        hasAppGrant: false,
      }),
      true,
    );
  });

  it("allows shared member with grant for shareable app", () => {
    assert.equal(
      evaluateWorkspaceAppAccess({
        role: "member",
        workspaceKind: "shared",
        appKey: "money",
        hasAppGrant: true,
      }),
      true,
    );
  });

  it("denies shared member without grant for shareable app", () => {
    assert.equal(
      evaluateWorkspaceAppAccess({
        role: "member",
        workspaceKind: "shared",
        appKey: "baby",
        hasAppGrant: false,
      }),
      false,
    );
  });

  it("allows shared membership-only for non-shareable apps", () => {
    assert.equal(
      evaluateWorkspaceAppAccess({
        role: "member",
        workspaceKind: "shared",
        appKey: "notes",
        hasAppGrant: false,
      }),
      true,
    );
  });
});
