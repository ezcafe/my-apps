import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BabyCareGuidelines,
  babyCareGuidelinesNextOpen,
} from "@/components/baby-care-guidelines";

const sections = [
  { id: "feed" as const, title: "Feed", body: ["Feed tip"] },
  { id: "sleep" as const, title: "Sleep", body: ["Sleep tip"] },
  { id: "diaper" as const, title: "Diaper", body: ["Diaper tip"] },
  { id: "pump" as const, title: "Pump", body: ["Pump tip"] },
];

describe("babyCareGuidelinesNextOpen", () => {
  it("opens one and closes on second press (exclusive)", () => {
    assert.equal(babyCareGuidelinesNextOpen(null, "feed"), "feed");
    assert.equal(babyCareGuidelinesNextOpen("feed", "sleep"), "sleep");
    assert.equal(babyCareGuidelinesNextOpen("sleep", "sleep"), null);
  });
});

describe("BabyCareGuidelines", () => {
  it("defaults all collapsed — no guideline body text", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCareGuidelines, { sections }),
    );
    assert.match(html, /data-testid="baby-care-guidelines"/);
    assert.match(html, /aria-expanded="false"/);
    assert.doesNotMatch(html, /Feed tip/);
    assert.doesNotMatch(html, /Pump tip/);
  });

  it("shows only the open section body", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCareGuidelines, {
        sections,
        openId: "pump",
      }),
    );
    assert.match(html, /Pump tip/);
    assert.doesNotMatch(html, /Feed tip/);
    assert.match(html, /aria-expanded="true"/);
  });
});
