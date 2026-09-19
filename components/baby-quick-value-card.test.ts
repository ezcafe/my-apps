import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  BabyQuickSimpleCard,
  BabyQuickValueCard,
} from "@/components/baby-quick-value-card";

describe("BabyQuickValueCard markup", () => {
  it("flush cluster: face → stacked ± → Custom icon slot (gap-0)", () => {
    const html = renderToStaticMarkup(
      createElement(BabyQuickValueCard, {
        labelId: "bottle",
        label: "Bottle",
        valueText: "120 ml",
        subtitle: "next in 5 min",
        onMore: () => {},
        onLess: () => {},
        onSave: () => {},
        moreLabel: "More",
        lessLabel: "Less",
        customControl: createElement(
          "button",
          { type: "button", "aria-label": "Custom ml", "data-custom-ml": true },
          "💧",
        ),
      }),
    );
    assert.match(html, /data-layout="b1-bottle"/);
    assert.match(html, /gap-0/);
    assert.match(html, /data-stepper="more"/);
    assert.match(html, /data-stepper="less"/);
    assert.match(html, /data-custom-slot/);
    assert.match(html, /data-custom-ml/);
    assert.doesNotMatch(html, /data-under-card/);
    assert.match(html, /fx-ripple/);
    assert.match(html, /120 ml/);
    const buttons = html.match(/<button/g) ?? [];
    assert.equal(buttons.length, 4); // log + more + less + custom
  });

  it("shows doneText on the log face when set", () => {
    const html = renderToStaticMarkup(
      createElement(BabyQuickValueCard, {
        labelId: "bottle",
        label: "Bottle",
        valueText: "120 ml",
        doneText: "Logged",
        onMore: () => {},
        onLess: () => {},
        onSave: () => {},
        moreLabel: "More",
        lessLabel: "Less",
      }),
    );
    assert.match(html, /Logged/);
    assert.doesNotMatch(html, /120 ml/);
  });

  it("uses aria-disabled while busy so a second tap still hits the handler", () => {
    const html = renderToStaticMarkup(
      createElement(BabyQuickValueCard, {
        labelId: "bottle",
        label: "Bottle",
        valueText: "120 ml",
        disabled: true,
        onMore: () => {},
        onLess: () => {},
        onSave: () => {},
        moreLabel: "More",
        lessLabel: "Less",
      }),
    );
    assert.match(html, /aria-disabled="true"/);
    assert.doesNotMatch(html, /\sdisabled(=|\s|>)/);
  });
});

describe("BabyQuickSimpleCard Done flash", () => {
  it("shows Done with primary fill and hides idle value/subtitle", () => {
    const html = renderToStaticMarkup(
      createElement(BabyQuickSimpleCard, {
        labelId: "breast-l",
        label: "Left",
        valueText: "Tap to start",
        subtitle: "next in 5min",
        doneText: "Done",
        icon: createElement("span", { className: "size-6", "data-icon": "x" }),
        onPress: () => {},
      }),
    );
    assert.match(html, /data-done-flash/);
    assert.match(html, /data-selected/);
    assert.match(html, /bg-accent/);
    assert.match(html, />Done</);
    assert.doesNotMatch(html, /Tap to start/);
    assert.doesNotMatch(html, /next in 5min/);
    // Icon slot stays mounted (invisible) so Done height matches idle.
    assert.match(html, /data-face-slot="icon"/);
    assert.match(html, /data-icon-collapsed="true"/);
    assert.match(html, /invisible/);
    assert.match(html, /min-h-6/);
    assert.match(html, /data-icon="x"/);
  });

  it("idle and Done faces both reserve icon/value/subtitle slots", () => {
    const idle = renderToStaticMarkup(
      createElement(BabyQuickSimpleCard, {
        labelId: "nap-idle",
        label: "Start nap",
        valueText: "Tap to start",
        icon: createElement("span", { className: "size-6" }),
        onPress: () => {},
      }),
    );
    const done = renderToStaticMarkup(
      createElement(BabyQuickSimpleCard, {
        labelId: "nap-done",
        label: "Start nap",
        valueText: "Tap to start",
        doneText: "Done",
        icon: createElement("span", { className: "size-6" }),
        onPress: () => {},
      }),
    );
    for (const slot of ["icon", "value", "subtitle"] as const) {
      assert.match(idle, new RegExp(`data-face-slot="${slot}"`));
      assert.match(done, new RegExp(`data-face-slot="${slot}"`));
    }
  });

  it("idle card has surface hover affordance", () => {
    const html = renderToStaticMarkup(
      createElement(BabyQuickSimpleCard, {
        labelId: "nap",
        label: "Start nap",
        valueText: "Tap to start",
        onPress: () => {},
      }),
    );
    assert.match(html, /hover:bg-secondary-hover/);
  });
});
