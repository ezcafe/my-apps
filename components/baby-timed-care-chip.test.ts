import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BabyTimedCareChip,
  babyTimedCareChipRunningCopy,
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

describe("BabyTimedCareChip", () => {
  it("reserves subtitle line so idle and running heights stay stable", () => {
    const idle = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "idle",
        label: "Pump L",
        running: false,
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        onPress: () => {},
      }),
    );
    const running = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "run",
        label: "Pump L",
        running: true,
        elapsedText: "1:05",
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        onPress: () => {},
      }),
    );
    assert.match(idle, /data-face-slot="value"/);
    assert.match(idle, /data-face-slot="subtitle"/);
    assert.match(running, /data-face-slot="value"/);
    assert.match(running, /data-face-slot="subtitle"/);
    assert.match(running, /1:05/);
    assert.match(running, /Tap to stop/);
  });

  it("renders tapToStop while running and Done only via doneText", () => {
    const running = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "chip-run",
        label: "Pump L",
        running: true,
        elapsedText: "1:30",
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        onPress: () => {},
      }),
    );
    assert.match(running, /Tap to stop/);
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

  it("suppresses doneText while running (never Done over Tap to stop)", () => {
    const html = renderToStaticMarkup(
      createElement(BabyTimedCareChip, {
        labelId: "chip-run-done",
        label: "Nap",
        running: true,
        elapsedText: "0:42",
        tapToStart: "Tap to start",
        tapToStop: "Tap to stop",
        doneText: "Done",
        onPress: () => {},
      }),
    );
    assert.match(html, /Tap to stop/);
    assert.match(html, /0:42/);
    assert.match(html, /data-running="true"/);
    // Button + wrapper both expose running for e2e (sleepCard targets the button).
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
    // Recovery must not live inside the muted helper <p> (sibling, no double wrap).
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
