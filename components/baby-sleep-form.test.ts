import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  babyLogSleepEndMutationInput,
  babyLogSleepStartMutationInput,
} from "@/lib/baby-home-custom-time";

describe("BabySleepForm source chrome", () => {
  const src = readFileSync(
    resolve(process.cwd(), "components/baby-sleep-form.tsx"),
    "utf8",
  );

  it("uses Custom time chip + log sleep start/end clock builders", () => {
    assert.match(src, /BabyCustomTimeChip/);
    assert.match(src, /babyLogSleepStartMutationInput/);
    assert.match(src, /babyLogSleepEndMutationInput/);
  });
});

describe("BabySleepForm Custom time mutation wiring", () => {
  const ISO = "2026-09-20T06:40:00.000Z";

  it("start + pending → input spreads occurredAt (not endedAt)", () => {
    const input = babyLogSleepStartMutationInput(ISO);
    assert.deepEqual(input, { occurredAt: ISO });
  });

  it("end + pending → input spreads endedAt (not occurredAt)", () => {
    const input = babyLogSleepEndMutationInput(ISO);
    assert.deepEqual(input, { endedAt: ISO });
  });

  it("no pending → start/end inputs omit time fields", () => {
    assert.deepEqual(babyLogSleepStartMutationInput(null), {});
    assert.deepEqual(babyLogSleepEndMutationInput(null), {});
  });
});
