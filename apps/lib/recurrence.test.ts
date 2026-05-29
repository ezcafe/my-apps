import { describe, expect, it } from "vitest";
import { addCadence } from "@/lib/recurrence";

describe("addCadence", () => {
  it("advances by one UTC day for daily cadence", () => {
    const start = new Date("2026-01-15T12:00:00.000Z");
    const next = addCadence(start, "daily");
    expect(next.toISOString()).toBe("2026-01-16T12:00:00.000Z");
  });

  it("advances by five minutes for every_5_minutes cadence", () => {
    const start = new Date("2026-01-15T12:00:00.000Z");
    const next = addCadence(start, "every_5_minutes");
    expect(next.toISOString()).toBe("2026-01-15T12:05:00.000Z");
  });
});
