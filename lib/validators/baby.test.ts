import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyDisplayNameSchema,
  babyGrowthListInputSchema,
  babyTimelineInputSchema,
  babyVaccineListInputSchema,
  createBabyDiaperSchema,
  createBabyFeedSchema,
  createBabyGrowthSchema,
  createBabyVaccineSchema,
  linkBabyTelegramSchema,
  updateBabyEventFeedPayloadSchema,
  updateBabyEventSchema,
} from "@/lib/validators/baby";

describe("createBabyFeedSchema", () => {
  it("rejects invalid method", () => {
    const parsed = createBabyFeedSchema.safeParse({ method: "bottle" });
    assert.equal(parsed.success, false);
  });

  it("accepts breast_l", () => {
    const parsed = createBabyFeedSchema.safeParse({ method: "breast_l" });
    assert.equal(parsed.success, true);
  });

  it("rejects durationSec ≤ 0", () => {
    assert.equal(
      createBabyFeedSchema.safeParse({
        method: "breast_l",
        durationSec: 0,
      }).success,
      false,
    );
    assert.equal(
      createBabyFeedSchema.safeParse({
        method: "breast_l",
        durationSec: -1,
      }).success,
      false,
    );
  });

  it("rejects bad occurredAt", () => {
    assert.equal(
      createBabyFeedSchema.safeParse({
        method: "breast_l",
        occurredAt: "not-a-datetime",
      }).success,
      false,
    );
  });
});

describe("createBabyDiaperSchema", () => {
  it("accepts wet dirty mixed", () => {
    for (const kind of ["wet", "dirty", "mixed"] as const) {
      assert.equal(createBabyDiaperSchema.safeParse({ kind }).success, true);
    }
  });

  it("rejects other kinds", () => {
    assert.equal(
      createBabyDiaperSchema.safeParse({ kind: "clean" }).success,
      false,
    );
  });
});

describe("createBabyGrowthSchema", () => {
  it("creates weight with numeric value", () => {
    const parsed = createBabyGrowthSchema.safeParse({
      kind: "weight",
      valueNum: 3.4,
      unit: "kg",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects empty kind and out-of-enum kinds", () => {
    assert.equal(createBabyGrowthSchema.safeParse({ kind: "" }).success, false);
    assert.equal(
      createBabyGrowthSchema.safeParse({ kind: "bmi" }).success,
      false,
    );
  });
});

describe("babyTimelineInputSchema", () => {
  it("rejects limit 0 and >100", () => {
    assert.equal(
      babyTimelineInputSchema.safeParse({ limit: 0 }).success,
      false,
    );
    assert.equal(
      babyTimelineInputSchema.safeParse({ limit: 101 }).success,
      false,
    );
    assert.equal(
      babyTimelineInputSchema.safeParse({ limit: 50 }).success,
      true,
    );
    assert.equal(
      babyTimelineInputSchema.safeParse({ limit: 100 }).success,
      true,
    );
    assert.equal(
      babyTimelineInputSchema.safeParse({ limit: 200 }).success,
      false,
    );
  });
});

describe("babyGrowthListInputSchema", () => {
  it("rejects limit 0 and >100", () => {
    assert.equal(
      babyGrowthListInputSchema.safeParse({ limit: 0 }).success,
      false,
    );
    assert.equal(
      babyGrowthListInputSchema.safeParse({ limit: 101 }).success,
      false,
    );
    assert.equal(
      babyGrowthListInputSchema.safeParse({ limit: 50 }).success,
      true,
    );
  });

  it("accepts optional from/to ISO datetimes with offset", () => {
    assert.equal(
      babyGrowthListInputSchema.safeParse({
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-30T23:59:59.999Z",
      }).success,
      true,
    );
    assert.equal(
      babyGrowthListInputSchema.safeParse({
        from: "2026-09-01",
      }).success,
      false,
    );
  });

  it("rejects from after to", () => {
    assert.equal(
      babyGrowthListInputSchema.safeParse({
        from: "2026-09-30T00:00:00.000Z",
        to: "2026-09-01T00:00:00.000Z",
      }).success,
      false,
    );
  });
});

describe("linkBabyTelegramSchema", () => {
  it("rejects empty chatId", () => {
    assert.equal(
      linkBabyTelegramSchema.safeParse({ chatId: "" }).success,
      false,
    );
    assert.equal(
      linkBabyTelegramSchema.safeParse({ chatId: "123" }).success,
      true,
    );
  });

  it("rejects non-numeric and overlong chatId", () => {
    assert.equal(
      linkBabyTelegramSchema.safeParse({ chatId: "abc" }).success,
      false,
    );
    assert.equal(
      linkBabyTelegramSchema.safeParse({ chatId: "-1001234567890" }).success,
      true,
    );
    assert.equal(
      linkBabyTelegramSchema.safeParse({
        chatId: "1".repeat(21),
      }).success,
      false,
    );
  });
});

describe("babyDisplayNameSchema", () => {
  it("caps length", () => {
    assert.equal(babyDisplayNameSchema.safeParse("Ada").success, true);
    assert.equal(babyDisplayNameSchema.safeParse("").success, false);
    assert.equal(
      babyDisplayNameSchema.safeParse("x".repeat(101)).success,
      false,
    );
  });
});

describe("updateBabyEventSchema payload", () => {
  it("rejects arbitrary keys on feed payload patch", () => {
    assert.equal(
      updateBabyEventFeedPayloadSchema.safeParse({
        notes: "ok",
        evil: true,
      }).success,
      false,
    );
    assert.equal(
      updateBabyEventFeedPayloadSchema.safeParse({ notes: "ok" }).success,
      true,
    );
  });

  it("rejects oversized payload blob", () => {
    assert.equal(
      updateBabyEventSchema.safeParse({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        payload: { notes: "x".repeat(5000) },
      }).success,
      false,
    );
  });
});

describe("createBabyVaccineSchema", () => {
  it("rejects empty name and bad dose", () => {
    assert.equal(
      createBabyVaccineSchema.safeParse({ name: "", dose: "first" }).success,
      false,
    );
    assert.equal(
      createBabyVaccineSchema.safeParse({ name: "Hexaxim", dose: "booster" })
        .success,
      false,
    );
    assert.equal(
      createBabyVaccineSchema.safeParse({ name: "Hexaxim", dose: "second" })
        .success,
      true,
    );
  });
});

describe("babyVaccineListInputSchema", () => {
  it("accepts range and rejects inverted", () => {
    assert.equal(
      babyVaccineListInputSchema.safeParse({
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-30T00:00:00.000Z",
      }).success,
      true,
    );
    assert.equal(
      babyVaccineListInputSchema.safeParse({
        from: "2026-09-30T00:00:00.000Z",
        to: "2026-09-01T00:00:00.000Z",
      }).success,
      false,
    );
  });

  it("accepts GraphQL null cursor (first infinite page)", () => {
    const parsed = babyVaccineListInputSchema.safeParse({
      cursor: null,
      limit: 50,
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.cursor, null);
    }
  });
});
