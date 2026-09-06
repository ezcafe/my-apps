import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  babyCareEvent,
  babyProfile,
  babyVaccineDoseEnum,
  babyVaccineEntry,
} from "@/db/schema/baby";

describe("baby_profile schema", () => {
  it("defines unique workspace_id (one baby per workspace)", () => {
    const config = getTableConfig(babyProfile);
    const uniqueNames = config.indexes
      .filter((idx) => idx.config.unique)
      .map((idx) => idx.config.name);
    assert.ok(
      uniqueNames.includes("baby_profile_workspace_uq"),
      "expected unique index baby_profile_workspace_uq",
    );
  });
});

describe("baby_care_event schema", () => {
  it("defines partial unique one open sleep per baby", () => {
    const config = getTableConfig(babyCareEvent);
    const openSleep = config.indexes.find(
      (idx) => idx.config.name === "baby_care_event_open_sleep_uq",
    );
    assert.ok(openSleep, "expected baby_care_event_open_sleep_uq");
    assert.equal(openSleep.config.unique, true);
  });
});

describe("baby_vaccine_entry schema", () => {
  it("exports dose enum first|second", () => {
    assert.deepEqual(babyVaccineDoseEnum.enumValues, ["first", "second"]);
  });

  it("indexes workspace and baby by administered_at", () => {
    const config = getTableConfig(babyVaccineEntry);
    const names = config.indexes.map((idx) => idx.config.name);
    assert.ok(
      names.includes("baby_vaccine_entry_workspace_administered_idx"),
      "expected workspace administered index",
    );
    assert.ok(
      names.includes("baby_vaccine_entry_baby_administered_idx"),
      "expected baby administered index",
    );
  });
});
