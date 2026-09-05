import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastRow } from "@/components/notification-provider";

describe("ToastRow action link", () => {
  it("omits a link when action is not provided", () => {
    const markup = renderToStaticMarkup(
      createElement(ToastRow, {
        title: "Transaction added",
        description: "Your entry was saved.",
        variant: "success",
        onDismiss: () => {},
      }),
    );
    assert.match(markup, /Transaction added/);
    assert.doesNotMatch(markup, /<a[\s>]/i);
  });

  it("renders a view link with the given href and label", () => {
    const markup = renderToStaticMarkup(
      createElement(ToastRow, {
        title: "Loan created",
        variant: "success",
        action: { href: "/loans/abc-123", label: "View loan" },
        onDismiss: () => {},
      }),
    );
    assert.match(markup, /Loan created/);
    assert.match(markup, /href="\/loans\/abc-123"/);
    assert.match(markup, />View loan</);
  });
});
