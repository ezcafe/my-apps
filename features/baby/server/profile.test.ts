import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEnsuredRow } from "@/features/baby/server/profile";

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
