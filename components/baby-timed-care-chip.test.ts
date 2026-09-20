import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BabyTimedCareChip,
  babyTimedCareChipLabel,
  babyTimedCareChipRunningCopy,
  babyTimedCareMergedStopTitle,
} from "@/components/baby-timed-care-chip";

describe("babyTimedCareChipRunningCopy", () => {
  it("uses tapToStop while running — never Done / tapToSave", () => {
    assert.equal(
      babyTimedCareChipRunningCopy({
        running: true,
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
      }),
      "Tap to stop",
    );
    assert.equal(
      babyTimedCareChipRunningCopy({
        running: false,
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
      }),
      "Tap to start",
    );
  });
});

describe("babyTimedCareMergedStopTitle", () => {
  it("composes endTitle - tapToStop", () => {
    assert.equal(
      babyTimedCareMergedStopTitle("End nap", "Tap to stop"),
      "End nap - Tap to stop",
    );
  });
});

describe("babyTimedCareChipLabel", () => {
  it("idle keeps idle label; running merges stop title", () => {
    assert.equal(
      babyTimedCareChipLabel({
        running: false,
        idleLabel: "Start nap",
        endTitle: "End nap",
        tapToStop: "Tap to stop",
      }),
      "Start nap",
    );
    assert.equal(
      babyTimedCareChipLabel({
        running: true,
        idleLabel: "Start nap",
        endTitle: "End nap",
        tapToStop: "Tap to stop",
      }),
      "End nap - Tap to stop",
    );
  });
});

describe("BabyTimedCareChip", () => {
  it("running uses merged title; no separate Tap to stop subtitle", () => {
    const running = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "run",
        label: babyTimedCareMergedStopTitle("End nap", "Tap to stop"),
        running: true,
        elapsedText: "1:05",
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        onPress: () => {},
      }),
    );
    assert.match(running, /data-face-slot="value"/);
    assert.match(running, /1:05/);
    assert.match(running, /End nap - Tap to stop/);
    // Stop lives in title — not a subtitle face slot.
    assert.doesNotMatch(running, /data-face-slot="subtitle"/);
  });

  it("centers idle face and absolute-centers Done on Breast/Pump chips", () => {
    const idle = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "breast-l",
        label: "Left",
        icon: createElement("span", { "data-icon": "breast" }),
        running: false,
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        onPress: () => {},
      }),
    );
    assert.match(idle, /items-center justify-center/);
    assert.match(idle, /text-center/);
    assert.match(idle, /data-face-slot="icon"/);
    assert.match(idle, /data-face-slot="title"/);
    assert.match(idle, /data-face-slot="value"/);
    assert.doesNotMatch(idle, /data-face-slot="subtitle"/);
    assert.match(idle, />Left</);
    assert.match(idle, /Tap to start/);

    const done = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "breast-l-done",
        label: "Left",
        icon: createElement("span", { "data-icon": "breast" }),
        running: false,
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        doneText: "Done",
        onPress: () => {},
      }),
    );
    assert.match(done, /data-face-slot="done"/);
    assert.match(done, /absolute inset-0/);
    assert.match(done, /flex items-center justify-center/);
    assert.match(done, />Done</);
  });

  it("renders elapsed while running and Done only via doneText", () => {
    const running = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "chip-run",
        label: babyTimedCareMergedStopTitle("Pump L", "Tap to stop"),
        running: true,
        elapsedText: "1:30",
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        onPress: () => {},
      }),
    );
    assert.match(running, /Pump L - Tap to stop/);
    assert.match(running, /1:30/);
    assert.doesNotMatch(running, />Done</);
    assert.doesNotMatch(running, /Tap to save/);
    assert.match(running, /data-running="true"/);

    const done = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "chip-done",
        label: "Pump L",
        running: false,
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        doneText: "Done",
        onPress: () => {},
      }),
    );
    assert.match(done, /Done/);
    assert.match(done, /data-done-flash/);
  });

  it("suppresses doneText while running (never Done over stop title)", () => {
    const html = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "chip-run-done",
        label: babyTimedCareMergedStopTitle("End nap", "Tap to stop"),
        running: true,
        elapsedText: "0:42",
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        doneText: "Done",
        onPress: () => {},
      }),
    );
    assert.match(html, /End nap - Tap to stop/);
    assert.match(html, /0:42/);
    assert.match(html, /data-running="true"/);
    assert.equal((html.match(/data-running="true"/g) ?? []).length, 2);
    assert.doesNotMatch(html, />Done</);
    assert.doesNotMatch(html, /data-done-flash/);
  });

  it("optional recovery renders in a non-p slot; default stays muted helper only", () => {
    const withRecovery = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "chip-rec",
        label: "Left",
        running: false,
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        helperText: "Muted tip",
        recovery: createElement(
          "div",
          { "data-testid": "baby-home-pending-recovery" },
          "Try again",
        ),
        onPress: () => {},
      }),
    );
    assert.match(withRecovery, /text-xs text-muted/);
    assert.match(withRecovery, />Muted tip</);
    assert.match(withRecovery, /data-testid="baby-home-pending-recovery"/);
    assert.match(
      withRecovery,
      /<p class="text-xs text-muted">Muted tip<\/p><div data-testid="baby-home-pending-recovery">/,
    );
    assert.doesNotMatch(withRecovery, /data-slot="timed-care-recovery"/);
    assert.doesNotMatch(
      withRecovery,
      /<p class="text-xs text-muted">[^<]*Try again/,
    );

    const feedDefault = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "chip-feed",
        label: "Left",
        running: false,
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        helperText: "Feed tip",
        onPress: () => {},
      }),
    );
    assert.match(feedDefault, /Feed tip/);
    assert.doesNotMatch(feedDefault, /data-slot="timed-care-recovery"/);
    assert.doesNotMatch(feedDefault, /baby-home-pending-recovery/);
  });
});
