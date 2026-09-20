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
  updateBabyGrowthSchema,
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

  it("accepts legacy single-method without legs", () => {
    const parsed = createBabyFeedSchema.safeParse({
      method: "breast_l",
      durationSec: 120,
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.legs, undefined);
    }
  });

  it("accepts legs with method + optional durationSec/amountMl", () => {
    const parsed = createBabyFeedSchema.safeParse({
      method: "formula",
      durationSec: 300,
      amountMl: 90,
      legs: [
        { method: "breast_l", durationSec: 300 },
        { method: "formula", amountMl: 90 },
      ],
    });
    assert.equal(parsed.success, true);
  });

  it("rejects oversized legs array and invalid leg methods", () => {
    assert.equal(
      createBabyFeedSchema.safeParse({
        method: "breast_l",
        legs: Array.from({ length: 9 }, () => ({
          method: "breast_l",
          durationSec: 1,
        })),
      }).success,
      false,
    );
    assert.equal(
      createBabyFeedSchema.safeParse({
        method: "breast_l",
        legs: [{ method: "bottle", durationSec: 1 }],
      }).success,
      false,
    );
  });

  it("accepts pump_l / pump_r with durationSec", () => {
    assert.equal(
      createBabyFeedSchema.safeParse({
        method: "pump_l",
        durationSec: 420,
      }).success,
      true,
    );
    assert.equal(
      createBabyFeedSchema.safeParse({
        method: "pump_r",
        durationSec: 90,
      }).success,
      true,
    );
  });

  it("rejects pump_l / pump_r without durationSec", () => {
    assert.equal(
      createBabyFeedSchema.safeParse({ method: "pump_l" }).success,
      false,
    );
    assert.equal(
      createBabyFeedSchema.safeParse({ method: "pump_r" }).success,
      false,
    );
  });

  it("accepts pump with amountMl; rejects pump without amountMl", () => {
    assert.equal(
      createBabyFeedSchema.safeParse({
        method: "pump",
        amountMl: 90,
      }).success,
      true,
    );
    assert.equal(
      createBabyFeedSchema.safeParse({ method: "pump" }).success,
      false,
    );
  });
});

describe("updateBabyEventFeedPayloadSchema legs", () => {
  it("accepts legs + legacy fields", () => {
    assert.equal(
      updateBabyEventFeedPayloadSchema.safeParse({
        method: "formula",
        legs: [{ method: "formula", amountMl: 60 }],
      }).success,
      true,
    );
    assert.equal(
      updateBabyEventFeedPayloadSchema.safeParse({
        durationSec: 90,
      }).success,
      true,
    );
  });

  it("rejects oversized legs", () => {
    assert.equal(
      updateBabyEventFeedPayloadSchema.safeParse({
        legs: Array.from({ length: 9 }, () => ({
          method: "pump",
          durationSec: 1,
        })),
      }).success,
      false,
    );
  });
});

describe("createBabyDiaperSchema", () => {
  it("accepts wet dirty mixed dry", () => {
    for (const kind of ["wet", "dirty", "mixed", "dry"] as const) {
      assert.equal(createBabyDiaperSchema.safeParse({ kind }).success, true);
    }
  });

  it("rejects other kinds", () => {
    assert.equal(
      createBabyDiaperSchema.safeParse({ kind: "clean" }).success,
      false,
    );
  });

  it("accepts dirty with optional color texture amount", () => {
    const parsed = createBabyDiaperSchema.safeParse({
      kind: "dirty",
      color: "yellow",
      texture: "soft",
      amount: "medium",
    });
    assert.equal(parsed.success, true);
  });

  it("parsed create with dirty kind only omits amount (no silent medium)", () => {
    const parsed = createBabyDiaperSchema.safeParse({ kind: "dirty" });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.amount, undefined);
    assert.equal("amount" in parsed.data && parsed.data.amount != null, false);
  });

  it("rejects color texture amount on wet or dry", () => {
    for (const kind of ["wet", "dry"] as const) {
      assert.equal(
        createBabyDiaperSchema.safeParse({ kind, color: "yellow" }).success,
        false,
      );
      assert.equal(
        createBabyDiaperSchema.safeParse({ kind, texture: "soft" }).success,
        false,
      );
      assert.equal(
        createBabyDiaperSchema.safeParse({ kind, amount: "medium" }).success,
        false,
      );
    }
  });
});

describe("updateBabyEventDiaperPayloadSchema", () => {
  it("accepts dry and dirty detail fields", async () => {
    const { updateBabyEventDiaperPayloadSchema } = await import(
      "@/lib/validators/baby"
    );
    assert.equal(
      updateBabyEventDiaperPayloadSchema.safeParse({ kind: "dry" }).success,
      true,
    );
    assert.equal(
      updateBabyEventDiaperPayloadSchema.safeParse({
        kind: "dirty",
        color: "brown",
        texture: "formed",
        amount: "smear",
      }).success,
      true,
    );
  });

  it("rejects detail on wet or dry", async () => {
    const { updateBabyEventDiaperPayloadSchema } = await import(
      "@/lib/validators/baby"
    );
    assert.equal(
      updateBabyEventDiaperPayloadSchema.safeParse({
        kind: "wet",
        color: "yellow",
      }).success,
      false,
    );
    assert.equal(
      updateBabyEventDiaperPayloadSchema.safeParse({
        kind: "dry",
        amount: "medium",
      }).success,
      false,
    );
  });

  it("omit-kind detail patch alone still parses (merge enforces with existing)", async () => {
    const { updateBabyEventDiaperPayloadSchema } = await import(
      "@/lib/validators/baby"
    );
    assert.equal(
      updateBabyEventDiaperPayloadSchema.safeParse({
        color: "red_bloody",
      }).success,
      true,
    );
  });
});

describe("mergeBabyEventDiaperPayload", () => {
  it("rejects omit-kind detail when existing kind is wet or dry", async () => {
    const { mergeBabyEventDiaperPayload } = await import(
      "@/lib/validators/baby"
    );
    for (const kind of ["wet", "dry"] as const) {
      assert.throws(
        () =>
          mergeBabyEventDiaperPayload({ kind }, { color: "red_bloody" }),
        /Validation failed|diaper detail not allowed/i,
      );
      assert.throws(
        () =>
          mergeBabyEventDiaperPayload({ kind }, { texture: "soft" }),
        /Validation failed|diaper detail not allowed/i,
      );
      assert.throws(
        () =>
          mergeBabyEventDiaperPayload({ kind }, { amount: "medium" }),
        /Validation failed|diaper detail not allowed/i,
      );
    }
  });

  it("strips leftover detail when kind flips to wet or dry", async () => {
    const { mergeBabyEventDiaperPayload } = await import(
      "@/lib/validators/baby"
    );
    const next = mergeBabyEventDiaperPayload(
      {
        kind: "dirty",
        color: "yellow",
        texture: "soft",
        amount: "medium",
        notes: "keep",
      },
      { kind: "wet" },
    );
    assert.deepEqual(next, { kind: "wet", notes: "keep" });
    assert.equal("color" in next, false);
    assert.equal("texture" in next, false);
    assert.equal("amount" in next, false);

    const toDry = mergeBabyEventDiaperPayload(
      {
        kind: "mixed",
        color: "brown",
        texture: "formed",
        amount: "blowout",
      },
      { kind: "dry" },
    );
    assert.deepEqual(toDry, { kind: "dry" });
  });

  it("keeps detail when effective kind stays dirty or mixed", async () => {
    const { mergeBabyEventDiaperPayload } = await import(
      "@/lib/validators/baby"
    );
    const next = mergeBabyEventDiaperPayload(
      { kind: "dirty", color: "yellow", amount: "medium" },
      { texture: "soft" },
    );
    assert.deepEqual(next, {
      kind: "dirty",
      color: "yellow",
      amount: "medium",
      texture: "soft",
    });
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

  it("rejects forged kind vaccine (UI sentinel, not a growth DB kind)", () => {
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "vaccine",
        valueNum: 3.4,
        unit: "kg",
      }).success,
      false,
    );
  });

  it("requires medication and vitamin name after trim", () => {
    assert.equal(
      createBabyGrowthSchema.safeParse({ kind: "medication" }).success,
      false,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "medication",
        valueText: "   ",
      }).success,
      false,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "vitamin",
        valueText: "   ",
      }).success,
      false,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "vitamin",
        valueText: "D3",
      }).success,
      true,
    );
  });

  it("requires pump amount and unit", () => {
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "pump",
        valueNum: 80,
      }).success,
      false,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "pump",
        valueNum: 80,
        unit: "",
      }).success,
      false,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "pump",
        valueNum: 80,
        unit: "ml",
      }).success,
      true,
    );
  });

  it("rejects empty temperature; accepts temp-only, symptoms-only, both", () => {
    assert.equal(
      createBabyGrowthSchema.safeParse({ kind: "temperature" }).success,
      false,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "temperature",
        valueNum: 37.5,
        unit: "°C",
      }).success,
      true,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "temperature",
        notes: JSON.stringify({ v: 1, symptoms: ["cough"] }),
      }).success,
      true,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "temperature",
        valueNum: 38,
        notes: JSON.stringify({ v: 1, symptoms: ["rash"] }),
      }).success,
      true,
    );
  });

  it("rejects unknown symptom ids in temperature notes", () => {
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "temperature",
        notes: JSON.stringify({ v: 1, symptoms: ["fever"] }),
      }).success,
      false,
    );
  });

  it("rejects free-text and invalid JSON temperature notes", () => {
    const freeText = createBabyGrowthSchema.safeParse({
      kind: "temperature",
      valueNum: 37.5,
      notes: "felt warm…",
    });
    assert.equal(freeText.success, false);
    if (!freeText.success) {
      assert.ok(
        freeText.error.issues.some((i) => i.message === "invalid symptoms notes"),
      );
    }
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "temperature",
        valueNum: 37.5,
        notes: "{not-json",
      }).success,
      false,
    );
    assert.equal(
      createBabyGrowthSchema.safeParse({
        kind: "temperature",
        valueNum: 37.5,
        notes: JSON.stringify({ v: 2, symptoms: ["cough"] }),
      }).success,
      false,
    );
  });
});

describe("updateBabyGrowthSchema", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("requires medication and vitamin name when kind is present", () => {
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        kind: "medication",
        valueText: "   ",
      }).success,
      false,
    );
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        kind: "vitamin",
      }).success,
      false,
    );
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        kind: "vitamin",
        valueText: "D3",
      }).success,
      true,
    );
  });

  it("rejects empty temperature and invalid notes when kind is present", () => {
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        kind: "temperature",
      }).success,
      false,
    );
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        kind: "temperature",
        notes: "felt warm…",
      }).success,
      false,
    );
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        kind: "temperature",
        valueNum: 37.2,
        unit: "°C",
      }).success,
      true,
    );
  });

  it("requires kind when health fields are patched", () => {
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        valueText: "",
      }).success,
      false,
    );
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        notes: JSON.stringify({ v: 1, symptoms: ["cough"] }),
      }).success,
      false,
    );
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        recordedAt: "2026-01-01T00:00:00.000Z",
      }).success,
      true,
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

describe("updateBabyProfileSchema / babyBirthDateSchema", () => {
  it("accepts valid calendar days including leap day", async () => {
    const { updateBabyProfileSchema } = await import("@/lib/validators/baby");
    assert.equal(
      updateBabyProfileSchema.safeParse({ birthDate: "2026-07-04" }).success,
      true,
    );
    assert.equal(
      updateBabyProfileSchema.safeParse({ birthDate: "2024-02-29" }).success,
      true,
    );
    assert.equal(
      updateBabyProfileSchema.safeParse({ birthDate: null }).success,
      true,
    );
  });

  it("rejects impossible and bad formats with BABY_BIRTH_DATE_INVALID", async () => {
    const { updateBabyProfileSchema } = await import("@/lib/validators/baby");
    for (const birthDate of [
      "04/07/2026",
      "2026-7-4",
      "2026-02-30",
      "2023-02-29",
      "2100-02-29",
    ]) {
      const parsed = updateBabyProfileSchema.safeParse({ birthDate });
      assert.equal(parsed.success, false, birthDate);
      const msg = JSON.stringify(parsed.error?.issues ?? []);
      assert.match(msg, /BABY_BIRTH_DATE_INVALID/, birthDate);
    }
  });

  it("rejects future and too-old with stable tokens", async () => {
    const { updateBabyProfileSchema } = await import("@/lib/validators/baby");
    const future = updateBabyProfileSchema.safeParse({
      birthDate: "2099-01-01",
    });
    assert.equal(future.success, false);
    assert.match(
      JSON.stringify(future.error?.issues ?? []),
      /BABY_BIRTH_DATE_FUTURE/,
    );

    const tooOld = updateBabyProfileSchema.safeParse({
      birthDate: "2000-01-01",
    });
    assert.equal(tooOld.success, false);
    assert.match(
      JSON.stringify(tooOld.error?.issues ?? []),
      /BABY_BIRTH_DATE_TOO_OLD/,
    );
  });
});

describe("babyQuickCareSchema", () => {
  it("requires side / amountMl / diaperKind by action kind", async () => {
    const { babyQuickCareSchema } = await import("@/lib/validators/baby");
    const base = { clientRequestId: "req-12345678", breastRunning: null };
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "BREAST" },
      }).success,
      false,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "BREAST", side: "breast_l" },
      }).success,
      true,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "FORMULA" },
      }).success,
      false,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "FORMULA", amountMl: 120 },
      }).success,
      true,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "PUMP_AMOUNT" },
      }).success,
      false,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "PUMP_AMOUNT", amountMl: 90 },
      }).success,
      true,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "BREAST", side: "pump_l" },
      }).success,
      true,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "DIAPER" },
      }).success,
      false,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "DIAPER", diaperKind: "wet" },
      }).success,
      true,
    );
  });

  it("accepts dry and dirty detail; rejects detail on wet", async () => {
    const { babyQuickCareSchema } = await import("@/lib/validators/baby");
    const base = { clientRequestId: "req-12345678", breastRunning: null };
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: { kind: "DIAPER", diaperKind: "dry" },
      }).success,
      true,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: {
          kind: "DIAPER",
          diaperKind: "dirty",
          diaperColor: "yellow",
          diaperTexture: "soft",
        },
      }).success,
      true,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        action: {
          kind: "DIAPER",
          diaperKind: "wet",
          diaperColor: "yellow",
        },
      }).success,
      false,
    );
  });

  it("accepts optional occurredAt/endedAt ISO; rejects garbage", async () => {
    const { babyQuickCareSchema } = await import("@/lib/validators/baby");
    const base = {
      clientRequestId: "req-12345678",
      breastRunning: null,
      action: { kind: "DIAPER" as const, diaperKind: "wet" as const },
    };
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        occurredAt: "2026-09-20T06:40:00.000+07:00",
      }).success,
      true,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        endedAt: "2026-09-20T06:40:00.000Z",
      }).success,
      true,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        occurredAt: "not-a-datetime",
      }).success,
      false,
    );
    assert.equal(
      babyQuickCareSchema.safeParse({
        ...base,
        endedAt: "yesterday",
      }).success,
      false,
    );
  });
});

describe("babyHomeQuickStatusInputSchema", () => {
  it("rejects inverted or >26h windows", async () => {
    const { babyHomeQuickStatusInputSchema } = await import(
      "@/lib/validators/baby"
    );
    assert.equal(
      babyHomeQuickStatusInputSchema.safeParse({
        dayFrom: "2026-07-04T00:00:00.000+07:00",
        dayTo: "2026-07-05T00:00:00.000+07:00",
      }).success,
      true,
    );
    assert.equal(
      babyHomeQuickStatusInputSchema.safeParse({
        dayFrom: "2026-07-05T00:00:00.000+07:00",
        dayTo: "2026-07-04T00:00:00.000+07:00",
      }).success,
      false,
    );
    assert.equal(
      babyHomeQuickStatusInputSchema.safeParse({
        dayFrom: "2026-07-04T00:00:00.000+07:00",
        dayTo: "2026-07-06T00:00:00.000+07:00",
      }).success,
      false,
    );
  });
});
