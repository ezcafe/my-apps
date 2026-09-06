import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gte, lte } from "drizzle-orm";
import { babyGrowthEntry } from "@/db/schema/baby";
import {
  babyGrowthRecordedAtRangeBounds,
  babyGrowthRecordedAtRangeConds,
  encodeBabyGrowthCursor,
  pageBabyGrowthEntries,
} from "@/features/baby/server/growth";
import { babyGrowthListInputSchema } from "@/lib/validators/baby";

function row(id: string, recordedAt: string) {
  return { id, recordedAt };
}

describe("babyGrowthListInputSchema", () => {
  it("rejects limit 0 and >100; accepts default range", () => {
    assert.equal(babyGrowthListInputSchema.safeParse({ limit: 0 }).success, false);
    assert.equal(
      babyGrowthListInputSchema.safeParse({ limit: 101 }).success,
      false,
    );
    assert.equal(
      babyGrowthListInputSchema.safeParse({ limit: 50 }).success,
      true,
    );
  });

  it("accepts from/to and rejects inverted range", () => {
    assert.equal(
      babyGrowthListInputSchema.safeParse({
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-30T23:59:59.999Z",
      }).success,
      true,
    );
    assert.equal(
      babyGrowthListInputSchema.safeParse({
        from: "2026-09-30T00:00:00.000Z",
        to: "2026-09-01T00:00:00.000Z",
      }).success,
      false,
    );
  });
});

describe("babyGrowthRecordedAtRangeBounds", () => {
  it("parses inclusive from/to; omits missing sides", () => {
    const both = babyGrowthRecordedAtRangeBounds({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.999Z",
    });
    assert.equal(both.from?.toISOString(), "2026-09-01T00:00:00.000Z");
    assert.equal(both.to?.toISOString(), "2026-09-30T23:59:59.999Z");

    assert.deepEqual(babyGrowthRecordedAtRangeBounds({}), {
      from: null,
      to: null,
    });
    assert.equal(
      babyGrowthRecordedAtRangeBounds({ from: "2026-09-01T00:00:00.000Z" }).to,
      null,
    );
  });

  it("keeps inclusive boundary instants for the same window as list gte/lte", () => {
    const bounds = babyGrowthRecordedAtRangeBounds({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.999Z",
    });
    const samples = [
      row("a", "2026-09-15T12:00:00.000Z"),
      row("b", "2026-08-31T23:59:59.000Z"),
      row("c", "2026-09-01T00:00:00.000Z"),
      row("d", "2026-10-01T00:00:00.000Z"),
    ];
    const kept = samples.filter((item) => {
      const at = new Date(item.recordedAt);
      if (bounds.from && at < bounds.from) return false;
      if (bounds.to && at > bounds.to) return false;
      return true;
    });
    assert.deepEqual(
      kept.map((i) => i.id),
      ["a", "c"],
    );
  });
});

describe("babyGrowthRecordedAtRangeConds", () => {
  it("emits the same gte/lte SQL as listBabyGrowthEntries uses", () => {
    const from = "2026-09-01T00:00:00.000Z";
    const to = "2026-09-30T23:59:59.999Z";
    const bounds = babyGrowthRecordedAtRangeBounds({ from, to });
    const conds = babyGrowthRecordedAtRangeConds({ from, to });
    assert.equal(conds.length, 2);
    assert.deepEqual(conds[0], gte(babyGrowthEntry.recordedAt, bounds.from!));
    assert.deepEqual(conds[1], lte(babyGrowthEntry.recordedAt, bounds.to!));
  });

  it("emits no range conds when from/to omitted", () => {
    assert.deepEqual(babyGrowthRecordedAtRangeConds({}), []);
  });
});

describe("pageBabyGrowthEntries", () => {
  it("caps page to limit and sets nextCursor when more remain", () => {
    const items = [
      row("a", "2026-09-06T12:00:00.000Z"),
      row("b", "2026-09-06T11:00:00.000Z"),
      row("c", "2026-09-06T10:00:00.000Z"),
    ];
    const page = pageBabyGrowthEntries(items, { limit: 2 });
    assert.deepEqual(
      page.items.map((i) => i.id),
      ["a", "b"],
    );
    assert.equal(
      page.nextCursor,
      encodeBabyGrowthCursor(Date.parse("2026-09-06T11:00:00.000Z"), "b"),
    );
  });

  it("pages after cursor", () => {
    const items = [
      row("a", "2026-09-06T12:00:00.000Z"),
      row("b", "2026-09-06T11:00:00.000Z"),
      row("c", "2026-09-06T10:00:00.000Z"),
    ];
    const first = pageBabyGrowthEntries(items, { limit: 2 });
    const second = pageBabyGrowthEntries(items, {
      limit: 2,
      cursor: first.nextCursor,
    });
    assert.deepEqual(
      second.items.map((i) => i.id),
      ["c"],
    );
    assert.equal(second.nextCursor, null);
  });

  it("bad cursor throws", () => {
    assert.throws(
      () => pageBabyGrowthEntries([row("a", "2026-09-06T12:00:00.000Z")], {
        limit: 10,
        cursor: "!!!",
      }),
      /bad cursor/,
    );
  });
});
