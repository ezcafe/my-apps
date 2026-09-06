import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_LAST_CARE_MAX_PAGES,
  hasAllCareStatuses,
  lastCareStatusByType,
  shouldFetchNextCareStatusPage,
} from "@/lib/baby-last-care-status";

type Item = {
  type: string;
  at: string;
  endedAt: string | null;
  summary: string;
};

function item(
  type: string,
  at: string,
  opts?: Partial<Pick<Item, "endedAt" | "summary">>,
): Item {
  return {
    type,
    at,
    endedAt: opts?.endedAt ?? null,
    summary: opts?.summary ?? `${type} @ ${at}`,
  };
}

describe("lastCareStatusByType", () => {
  it("returns nulls for an empty list", () => {
    assert.deepEqual(lastCareStatusByType([]), {
      feed: null,
      sleep: null,
      diaper: null,
    });
  });

  it("picks the first feed, sleep, and diaper in newest-first order", () => {
    const items = [
      item("feed", "2026-09-06T12:00:00.000Z", { summary: "newest feed" }),
      item("sleep", "2026-09-06T11:00:00.000Z", {
        endedAt: "2026-09-06T11:30:00.000Z",
        summary: "newest sleep",
      }),
      item("diaper", "2026-09-06T10:00:00.000Z", { summary: "newest diaper" }),
      item("feed", "2026-09-05T12:00:00.000Z", { summary: "older feed" }),
    ];
    const result = lastCareStatusByType(items);
    assert.equal(result.feed?.summary, "newest feed");
    assert.equal(result.sleep?.summary, "newest sleep");
    assert.equal(result.diaper?.summary, "newest diaper");
  });

  it("returns null for a missing care type", () => {
    const result = lastCareStatusByType([
      item("feed", "2026-09-06T12:00:00.000Z"),
    ]);
    assert.ok(result.feed);
    assert.equal(result.sleep, null);
    assert.equal(result.diaper, null);
  });

  it("keeps open sleep (endedAt null) for in-progress UI", () => {
    const open = item("sleep", "2026-09-06T11:00:00.000Z", {
      endedAt: null,
      summary: "nap in progress",
    });
    const result = lastCareStatusByType([open]);
    assert.deepEqual(result.sleep, open);
    assert.equal(result.sleep?.endedAt, null);
  });

  it("ignores growth and unknown types", () => {
    const result = lastCareStatusByType([
      item("weight", "2026-09-06T12:00:00.000Z"),
      item("height", "2026-09-06T11:00:00.000Z"),
      item("unknown", "2026-09-06T10:00:00.000Z"),
    ]);
    assert.deepEqual(result, {
      feed: null,
      sleep: null,
      diaper: null,
    });
  });

  it("first match wins when duplicates exist", () => {
    const items = [
      item("diaper", "2026-09-06T14:00:00.000Z", { summary: "first diaper" }),
      item("diaper", "2026-09-06T13:00:00.000Z", { summary: "second diaper" }),
    ];
    assert.equal(lastCareStatusByType(items).diaper?.summary, "first diaper");
  });
});

describe("hasAllCareStatuses", () => {
  it("is false until feed, sleep, and diaper are all present", () => {
    assert.equal(
      hasAllCareStatuses({
        feed: item("feed", "2026-09-06T12:00:00.000Z"),
        sleep: null,
        diaper: null,
      }),
      false,
    );
    assert.equal(
      hasAllCareStatuses({
        feed: item("feed", "2026-09-06T12:00:00.000Z"),
        sleep: item("sleep", "2026-09-06T11:00:00.000Z"),
        diaper: item("diaper", "2026-09-06T10:00:00.000Z"),
      }),
      true,
    );
  });
});

describe("shouldFetchNextCareStatusPage", () => {
  const partial = {
    feed: item("feed", "2026-09-06T12:00:00.000Z"),
    sleep: null,
    diaper: null,
  };
  const full = {
    feed: item("feed", "2026-09-06T12:00:00.000Z"),
    sleep: item("sleep", "2026-09-06T11:00:00.000Z"),
    diaper: item("diaper", "2026-09-06T10:00:00.000Z"),
  };

  it("continues when types are missing and cursor remains", () => {
    assert.equal(shouldFetchNextCareStatusPage(partial, 1, "c2"), true);
  });

  it("stops when all three types are found", () => {
    assert.equal(shouldFetchNextCareStatusPage(full, 1, "c2"), false);
  });

  it("stops at the page cap", () => {
    assert.equal(
      shouldFetchNextCareStatusPage(partial, BABY_LAST_CARE_MAX_PAGES, "c4"),
      false,
    );
  });

  it("stops without a next cursor", () => {
    assert.equal(shouldFetchNextCareStatusPage(partial, 1, null), false);
    assert.equal(shouldFetchNextCareStatusPage(partial, 1, ""), false);
  });
});
