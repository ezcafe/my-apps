import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  babyCareEvent,
  babyProfile,
  babyQuickCareRequest,
  babyVaccineDoseEnum,
  babyVaccineEntry,
  type BabyFeedLeg,
  type BabyQuickCareStoredResult,
} from "@/db/schema/baby";
import type { BabyFeedLeg as LibBabyFeedLeg } from "@/lib/baby-feed-session";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("BabyFeedLeg is shared from lib/baby-feed-session", () => {
    const leg: BabyFeedLeg = { method: "breast_l", durationSec: 60 };
    const same: LibBabyFeedLeg = leg;
    assert.equal(same.method, "breast_l");
  });
});

describe("baby_quick_care_request schema", () => {
  it("defines unique (workspace, request_id) and created_at index", () => {
    const config = getTableConfig(babyQuickCareRequest);
    const names = config.indexes.map((idx) => idx.config.name);
    assert.ok(names.includes("baby_quick_care_request_uq"));
    assert.ok(names.includes("baby_quick_care_request_created_idx"));
    const uq = config.indexes.find(
      (idx) => idx.config.name === "baby_quick_care_request_uq",
    );
    assert.equal(uq?.config.unique, true);
  });

  it("typed result shape uses v:1 and ISO step events", () => {
    const sample: BabyQuickCareStoredResult = {
      v: 1,
      steps: [
        {
          step: "createDiaper",
          event: {
            id: "e1",
            type: "diaper",
            occurredAt: "2026-07-04T12:00:00.000Z",
            endedAt: null,
            payload: { kind: "wet" },
          },
        },
      ],
      openSleep: null,
    };
    assert.equal(sample.v, 1);
    assert.equal(sample.steps[0]?.step, "createDiaper");
  });

  it("migration SQL enables RLS, FORCE, and workspace policy", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "db/migrations/0039_baby_quick_care_request.sql",
      ),
      "utf8",
    );
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /FORCE ROW LEVEL SECURITY/);
    assert.match(sql, /CREATE POLICY baby_quick_care_request_workspace_rls/);
    assert.match(sql, /app_current_workspace_id\(\)/);
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
