import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyCustomMlForm } from "@/components/baby-custom-ml-modal";

const t = (key: string) => key;

describe("BabyCustomMlForm markup", () => {
  it("renders When (datetime-local) + Amount (ml), Cancel, Confirm", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomMlForm, {
        initialMl: 120,
        initialIso: "2026-09-20T06:40:00.000Z",
        onCancel: () => {},
        onConfirm: () => {},
        t,
      }),
    );
    assert.match(html, /data-testid="baby-custom-ml-form"/);
    assert.match(html, /type="datetime-local"/);
    assert.match(html, /home\.customTimeLabel/);
    assert.match(html, /home\.customMlLabel/);
    assert.match(html, /common\.cancel/);
    assert.match(html, /home\.customMlUse/);
  });

  it("error state shows message and aria-invalid", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomMlForm, {
        initialMl: 120,
        initialIso: null,
        onCancel: () => {},
        onConfirm: () => {},
        t,
        initialErrorKey: "home.customMlInvalid",
      }),
    );
    assert.match(html, /home\.customMlInvalid/);
    assert.match(html, /aria-invalid="true"/);
  });
});
