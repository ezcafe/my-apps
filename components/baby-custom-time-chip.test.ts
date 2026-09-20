import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyCustomTimeChip } from "@/components/baby-custom-time-chip";

describe("BabyCustomTimeChip face", () => {
  it("idle: shows Custom once — empty value line (not Custom Custom)", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomTimeChip, {
        label: "Custom",
        valueText: "",
        onPress: () => {},
      }),
    );
    assert.match(html, />Custom</);
    assert.equal((html.match(/Custom/g) ?? []).length, 1);
  });

  it("idle: title only — no reserved value slot so label is vertically centered", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomTimeChip, {
        label: "Custom nap",
        valueText: "",
        onPress: () => {},
      }),
    );
    assert.match(html, /justify-center/);
    assert.doesNotMatch(html, /min-h-6/);
    assert.doesNotMatch(html, /data-face-slot="value"/);
  });

  it("pending: label Custom + time value", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomTimeChip, {
        label: "Custom",
        valueText: "14:30",
        selected: true,
        onPress: () => {},
      }),
    );
    assert.match(html, />Custom</);
    assert.match(html, />14:30</);
    assert.match(html, /data-face-slot="value"/);
    assert.match(html, /min-h-6/);
  });
});
