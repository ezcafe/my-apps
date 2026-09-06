import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyOpenSleepCheckState,
  detectOpenSleepAcrossTimelinePages,
  isBabyFeedStartDisabled,
  isBabySleepStartDisabled,
  isOpenSleepTimelineItem,
  openSleepScanFromQuery,
  type OpenSleepTimelinePage,
} from "@/lib/baby-care-session-state";

describe("isBabyFeedStartDisabled", () => {
  it("disables Start while the timer is running or pending", () => {
    assert.equal(isBabyFeedStartDisabled(true), true);
    assert.equal(isBabyFeedStartDisabled(false), false);
    assert.equal(isBabyFeedStartDisabled(false, true), true);
    assert.equal(isBabyFeedStartDisabled(true, true), true);
  });
});

describe("isBabySleepStartDisabled", () => {
  it("disables Start until open check finishes, while open, or pending", () => {
    assert.equal(isBabySleepStartDisabled(false, { openChecked: false }), true);
    assert.equal(isBabySleepStartDisabled(true, { openChecked: true }), true);
    assert.equal(
      isBabySleepStartDisabled(false, { openChecked: true, pending: true }),
      true,
    );
    assert.equal(isBabySleepStartDisabled(false, { openChecked: true }), false);
  });
});

describe("isOpenSleepTimelineItem", () => {
  it("detects open sleep rows", () => {
    assert.equal(
      isOpenSleepTimelineItem({
        kind: "care",
        type: "sleep",
        endedAt: null,
      }),
      true,
    );
    assert.equal(
      isOpenSleepTimelineItem({
        kind: "care",
        type: "sleep",
        endedAt: "2026-09-06T12:00:00.000Z",
      }),
      false,
    );
    assert.equal(
      isOpenSleepTimelineItem({
        kind: "care",
        type: "feed",
        endedAt: null,
      }),
      false,
    );
  });
});

describe("openSleepScanFromQuery", () => {
  it("maps dedicated open-sleep query to open/closed (no page walk)", () => {
    assert.equal(openSleepScanFromQuery(null), "closed");
    assert.equal(openSleepScanFromQuery(undefined), "closed");
    assert.equal(
      openSleepScanFromQuery({
        id: "s1",
        type: "sleep",
        endedAt: null,
      }),
      "open",
    );
    assert.equal(
      openSleepScanFromQuery({
        id: "s1",
        type: "sleep",
        endedAt: "2026-09-06T12:00:00.000Z",
      }),
      "closed",
    );
    assert.equal(
      openSleepScanFromQuery({ id: "f1", type: "feed", endedAt: null }),
      "closed",
    );
  });
});

describe("detectOpenSleepAcrossTimelinePages", () => {
  it("finds open sleep on a later page past the first limit", async () => {
    const pages: OpenSleepTimelinePage[] = [
      {
        items: Array.from({ length: 30 }, () => ({
          kind: "care",
          type: "feed",
          endedAt: null,
        })),
        nextCursor: "page-2",
      },
      {
        items: [
          { kind: "care", type: "diaper", endedAt: null },
          { kind: "care", type: "sleep", endedAt: null },
        ],
        nextCursor: null,
      },
    ];
    let calls = 0;
    const found = await detectOpenSleepAcrossTimelinePages(
      async ({ cursor }) => {
        calls += 1;
        if (cursor == null) return pages[0]!;
        return pages[1]!;
      },
      { pageLimit: 30, maxPages: 5 },
    );
    assert.equal(found, "open");
    assert.equal(calls, 2);
  });

  it("returns closed when no open sleep and pages end", async () => {
    const found = await detectOpenSleepAcrossTimelinePages(
      async () => ({
        items: [{ kind: "care", type: "feed", endedAt: null }],
        nextCursor: null,
      }),
      { pageLimit: 30, maxPages: 5 },
    );
    assert.equal(found, "closed");
  });

  it("stops early once open sleep is on the first page", async () => {
    let calls = 0;
    const found = await detectOpenSleepAcrossTimelinePages(async () => {
      calls += 1;
      return {
        items: [{ kind: "care", type: "sleep", endedAt: null }],
        nextCursor: "more",
      };
    });
    assert.equal(found, "open");
    assert.equal(calls, 1);
  });

  it("returns unknown when page cap is hit with more pages remaining", async () => {
    let calls = 0;
    const result = await detectOpenSleepAcrossTimelinePages(
      async () => {
        calls += 1;
        return {
          items: [{ kind: "care", type: "feed", endedAt: null }],
          nextCursor: `more-${calls}`,
        };
      },
      { pageLimit: 30, maxPages: 2 },
    );
    assert.equal(result, "unknown");
    assert.equal(calls, 2);
  });
});

describe("babyOpenSleepCheckState", () => {
  it("maps open/closed and fail-closes Start on error/unknown", () => {
    assert.deepEqual(babyOpenSleepCheckState("open"), {
      hasOpenSleep: true,
      openChecked: true,
      endEnabled: true,
      checkFailed: false,
      checkIncomplete: false,
    });
    assert.deepEqual(babyOpenSleepCheckState("closed"), {
      hasOpenSleep: false,
      openChecked: true,
      endEnabled: false,
      checkFailed: false,
      checkIncomplete: false,
    });
    assert.deepEqual(babyOpenSleepCheckState("unknown"), {
      hasOpenSleep: false,
      openChecked: false,
      endEnabled: true,
      checkFailed: false,
      checkIncomplete: true,
    });
    assert.deepEqual(babyOpenSleepCheckState("error"), {
      hasOpenSleep: false,
      openChecked: false,
      endEnabled: false,
      checkFailed: true,
      checkIncomplete: false,
    });
  });

  it("keeps Start disabled on error/unknown; End only for open/unknown", () => {
    const error = babyOpenSleepCheckState("error");
    assert.equal(
      isBabySleepStartDisabled(error.hasOpenSleep, {
        openChecked: error.openChecked,
      }),
      true,
    );
    assert.equal(error.endEnabled, false);
    assert.equal(error.checkFailed, true);
    assert.equal(error.checkIncomplete, false);

    const unknown = babyOpenSleepCheckState("unknown");
    assert.equal(
      isBabySleepStartDisabled(unknown.hasOpenSleep, {
        openChecked: unknown.openChecked,
      }),
      true,
    );
    assert.equal(unknown.endEnabled, true);
    assert.equal(unknown.checkFailed, false);
    assert.equal(unknown.checkIncomplete, true);

    const open = babyOpenSleepCheckState("open");
    assert.equal(open.endEnabled, true);
    assert.equal(open.checkIncomplete, false);
    assert.equal(
      isBabySleepStartDisabled(open.hasOpenSleep, {
        openChecked: open.openChecked,
      }),
      true,
    );
  });
});
