import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activityEditMutationFor,
  buildActivityCareUpdatePayload,
  validateActivityCareEdit,
} from "@/lib/baby-insights-activity-edit";

describe("activityEditMutationFor", () => {
  it("care editTarget save hits updateBabyEvent", () => {
    assert.equal(
      activityEditMutationFor({ source: "care", id: "c1" }, "update"),
      "updateBabyEvent",
    );
  });

  it("growth editTarget save hits updateBabyGrowth", () => {
    assert.equal(
      activityEditMutationFor({ source: "growth", id: "g1" }, "update"),
      "updateBabyGrowth",
    );
  });

  it("care never maps to growth mutation", () => {
    assert.notEqual(
      activityEditMutationFor({ source: "care", id: "c1" }, "update"),
      "updateBabyGrowth",
    );
    assert.notEqual(
      activityEditMutationFor({ source: "care", id: "c1" }, "delete"),
      "deleteBabyGrowth",
    );
  });

  it("growth never maps to care mutation", () => {
    assert.notEqual(
      activityEditMutationFor({ source: "growth", id: "g1" }, "update"),
      "updateBabyEvent",
    );
  });
});

describe("validateActivityCareEdit", () => {
  it("validation fail for bad times returns i18n keys", () => {
    assert.equal(
      validateActivityCareEdit({
        occurredAt: "not-a-date",
        careType: "feed",
      }),
      "insights.editInvalidStart",
    );
    assert.equal(
      validateActivityCareEdit({
        occurredAt: "2026-09-14T10:00:00.000Z",
        endedAt: "2026-09-14T09:00:00.000Z",
        careType: "sleep",
      }),
      "insights.editEndBeforeStart",
    );
  });

  it("ok for valid feed times", () => {
    assert.equal(
      validateActivityCareEdit({
        occurredAt: "2026-09-14T10:00:00.000Z",
        careType: "feed",
      }),
      null,
    );
  });
});

describe("buildActivityCareUpdatePayload", () => {
  it("omits payload for sleep (time-only) edits", () => {
    assert.equal(
      buildActivityCareUpdatePayload({ careType: "sleep" }),
      undefined,
    );
  });

  it("never copies quickRequestId from stored payload", () => {
    const patch = buildActivityCareUpdatePayload({
      careType: "feed",
      amountMl: 120,
    });
    assert.deepEqual(patch, { amountMl: 120 });
    assert.equal(patch && "quickRequestId" in patch, false);
  });

  it("diaper patch is kind only", () => {
    assert.deepEqual(
      buildActivityCareUpdatePayload({
        careType: "diaper",
        diaperKind: "wet",
      }),
      { kind: "wet" },
    );
  });
});
