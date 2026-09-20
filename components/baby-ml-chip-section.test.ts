import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyMlChipSection } from "@/components/baby-ml-chip-section";

describe("BabyMlChipSection Edit affordance", () => {
  const t = (key: string) =>
    ({
      "home.header.bottle": "Bottle",
      "home.chipMl": "{ml} ml",
      "home.formulaCustom": "Custom",
      "home.formulaCustomOpen": "Custom ml",
      "home.customMlEdit": "Edit",
      "home.customMlEditAria": "Edit custom ml",
    })[key] ?? key;

  it("renders Edit outside the flush 2×2 with accessible name", () => {
    const html = renderToStaticMarkup(
      createElement(BabyMlChipSection, {
        mls: [90, 120, 150],
        selectedMl: 95,
        customSelected: true,
        showEditCustom: true,
        onEditCustom: () => {},
        onSelectMl: () => {},
        onCustom: () => {},
        t,
      }),
    );
    assert.match(html, /data-layout="bottle-ml-chips"/);
    assert.match(html, /data-testid="baby-custom-ml-edit"/);
    assert.match(html, /aria-label="Edit custom ml"/);
    assert.match(html, />Edit</);
    assert.match(html, /fx-hit-40/);
    // Edit is a sibling after the grid, not a fifth tile.
    const editIdx = html.indexOf('data-testid="baby-custom-ml-edit"');
    const gridEnd = html.indexOf("data-bottle-ml=\"custom\"");
    assert.ok(editIdx > gridEnd);
  });

  it("omits Edit when showEditCustom is false", () => {
    const html = renderToStaticMarkup(
      createElement(BabyMlChipSection, {
        mls: [90, 120, 150],
        selectedMl: null,
        onSelectMl: () => {},
        onCustom: () => {},
        t,
      }),
    );
    assert.doesNotMatch(html, /baby-custom-ml-edit/);
  });
});
