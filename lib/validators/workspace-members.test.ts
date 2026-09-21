import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  workspaceMemberCreateSchema,
  workspaceMemberPatchSchema,
} from "@/lib/validators/workspace";

describe("workspace member validators", () => {
  it("accepts create with money apps", () => {
    const parsed = workspaceMemberCreateSchema.safeParse({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      email: "a@example.com",
      apps: ["money"],
    });
    assert.equal(parsed.success, true);
  });

  it("rejects create with notes", () => {
    const parsed = workspaceMemberCreateSchema.safeParse({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      email: "a@example.com",
      apps: ["notes"],
    });
    assert.equal(parsed.success, false);
  });

  it("rejects empty apps", () => {
    const parsed = workspaceMemberCreateSchema.safeParse({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      email: "a@example.com",
      apps: [],
    });
    assert.equal(parsed.success, false);
  });

  it("rejects patch without userSub", () => {
    const parsed = workspaceMemberPatchSchema.safeParse({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      apps: ["baby"],
    });
    assert.equal(parsed.success, false);
  });
});
