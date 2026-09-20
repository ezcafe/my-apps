import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyCustomTimeForm } from "@/components/baby-custom-time-modal";

const t = (key: string) => key;

describe("BabyCustomTimeForm", () => {
  it("legacy time-only: datetime-local — no duration or diaper What", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomTimeForm, {
        fields: "time",
        initialIso: "2026-09-20T06:40:00.000Z",
        onCancel: () => {},
        onConfirm: () => {},
        onClear: () => {},
        t,
      }),
    );
    assert.match(html, /data-testid="baby-custom-time-form"/);
    assert.match(html, /type="datetime-local"/);
    assert.match(html, /home\.customTimeLabel/);
    assert.match(html, /home\.customTimeUse/);
    assert.match(html, /home\.customTimeClear/);
    assert.doesNotMatch(html, /home\.customDurationLabel/);
    assert.doesNotMatch(html, /data-testid="baby-custom-duration"/);
    assert.doesNotMatch(html, /home\.customDiaperWhatLabel/);
  });

  it("diaper variant (time+diaperKind): When + What (Wet/Poop/Mixed/Dry)", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomTimeForm, {
        fields: "time+diaperKind",
        initialIso: "2026-09-20T06:40:00.000Z",
        onCancel: () => {},
        onConfirm: () => {},
        onClear: () => {},
        t,
      }),
    );
    assert.match(html, /type="datetime-local"/);
    assert.match(html, /home\.customTimeLabel/);
    assert.match(html, /home\.customDiaperWhatLabel/);
    assert.match(html, /data-testid="baby-custom-diaper-kind"/);
    assert.match(html, /data-diaper-kind="wet"/);
    assert.match(html, /data-diaper-kind="dirty"/);
    assert.match(html, /data-diaper-kind="mixed"/);
    assert.match(html, /data-diaper-kind="dry"/);
    assert.doesNotMatch(html, /home\.customDurationLabel/);
  });

  it("nap variant (time+duration): shows duration minutes field", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomTimeForm, {
        fields: "time+duration",
        initialIso: "2026-09-20T06:40:00.000Z",
        initialDurationMinutes: 45,
        onCancel: () => {},
        onConfirm: () => {},
        onClear: () => {},
        t,
      }),
    );
    assert.match(html, /type="datetime-local"/);
    assert.match(html, /home\.customDurationLabel/);
    assert.match(html, /data-testid="baby-custom-duration"/);
    assert.match(html, /value="45"/);
  });

  it("omits Clear when no pending initialIso", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomTimeForm, {
        fields: "time",
        initialIso: null,
        onCancel: () => {},
        onConfirm: () => {},
        onClear: () => {},
        t,
      }),
    );
    assert.doesNotMatch(html, /home\.customTimeClear/);
  });
});
