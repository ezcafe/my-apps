import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyCustomMlForm } from "@/components/baby-custom-ml-modal";

const t = (key: string) => key;

describe("BabyCustomMlForm markup", () => {
  it("renders input, Cancel, and Confirm", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomMlForm, {
        initialMl: 120,
        onCancel: () => {},
        onConfirm: () => {},
        t,
      }),
    );
    assert.match(html, /home\.customMlLabel/);
    assert.match(html, /common\.cancel/);
    assert.match(html, /home\.customMlUse/);
    assert.match(html, /<input/);
  });

  it("error state shows message and aria-invalid", () => {
    const html = renderToStaticMarkup(
      createElement(BabyCustomMlForm, {
        initialMl: 120,
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
