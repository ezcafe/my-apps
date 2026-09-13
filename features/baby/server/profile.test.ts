import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveEnsuredRow,
  updateBabyProfile,
} from "@/features/baby/server/profile";

describe("ensureBabyProfile (idempotent algorithm)", () => {
  it("calling twice yields one row", async () => {
    let inserts = 0;
    const store: { id: string; displayName: string }[] = [];

    const ensure = (displayName: string) =>
      resolveEnsuredRow({
        findExisting: async () => store[0],
        tryInsert: async () => {
          inserts += 1;
          if (store.length > 0) return null;
          const row = { id: "profile-1", displayName };
          store.push(row);
          return row;
        },
        findAgain: async () => store[0],
      });

    const a = await ensure("Ada");
    const b = await ensure("Other");
    assert.equal(a.id, b.id);
    assert.equal(a.displayName, "Ada");
    assert.equal(store.length, 1);
    assert.equal(inserts, 1);
  });

  it("concurrent insert loser re-selects existing row", async () => {
    const existing = { id: "profile-1", displayName: "Ada" };
    const row = await resolveEnsuredRow({
      findExisting: async () => null,
      tryInsert: async () => null,
      findAgain: async () => existing,
    });
    assert.equal(row.id, "profile-1");
  });
});

describe("updateBabyProfile", () => {
  const base = {
    id: "profile-1",
    workspaceId: "ws-1",
    displayName: "Ada",
    birthDate: null as string | null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("sets, changes, and clears birthDate", async () => {
    let current = { ...base };
    const deps = {
      ensureBabyProfile: async () => current,
      updateProfile: async (id: string, birthDate: string | null) => {
        assert.equal(id, "profile-1");
        current = {
          ...current,
          birthDate,
          updatedAt: new Date("2026-07-04T12:00:00.000Z"),
        };
        return current;
      },
    };

    const set = await updateBabyProfile(
      "ws-1",
      "u1",
      { birthDate: "2026-01-15" },
      deps,
    );
    assert.equal(set.birthDate, "2026-01-15");

    const change = await updateBabyProfile(
      "ws-1",
      "u1",
      { birthDate: "2026-02-01" },
      deps,
    );
    assert.equal(change.birthDate, "2026-02-01");

    const cleared = await updateBabyProfile(
      "ws-1",
      "u1",
      { birthDate: null },
      deps,
    );
    assert.equal(cleared.birthDate, null);
  });

  it("rejects empty object and missing birthDate key", async () => {
    const deps = {
      ensureBabyProfile: async () => base,
      updateProfile: async () => {
        throw new Error("should not update");
      },
    };
    await assert.rejects(
      () => updateBabyProfile("ws-1", "u1", {}, deps),
      /BABY_BIRTH_DATE_REQUIRED/,
    );
    await assert.rejects(
      () => updateBabyProfile("ws-1", "u1", { displayName: "x" }, deps),
      /BABY_BIRTH_DATE_REQUIRED/,
    );
  });
});
