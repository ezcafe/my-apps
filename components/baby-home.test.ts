import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyHomeContent } from "@/components/baby-home";
import { t } from "@/lib/baby-i18n";

describe("BabyHomeContent", () => {
  it("shows error text (not empty) and keeps CTAs when status fetch failed", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: undefined,
        loading: false,
        statusError: true,
        t: (key) => t(key, "en"),
        locale: "en",
      }),
    );
    assert.match(markup, /data-testid="baby-home-status"/);
    assert.match(markup, /Could not load\. You can still log care below\./);
    assert.doesNotMatch(markup, /Not logged yet/);
    assert.match(markup, /href="\/baby\/feed"/);
    assert.match(markup, /href="\/baby\/sleep"/);
    assert.match(markup, /href="\/baby\/diaper"/);
    assert.doesNotMatch(markup, /href="\/baby\/timeline"/);
    assert.doesNotMatch(markup, /href="\/baby\/growth"/);
    assert.doesNotMatch(markup, /href="\/baby\/settings"/);
    assert.match(markup, /Log feed/);
    assert.match(markup, /Log diaper/);
  });

  it("shows empty chips when status loaded with no care yet", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: { feed: null, sleep: null, diaper: null },
        loading: false,
        t: (key) => t(key, "en"),
        locale: "en",
      }),
    );
    assert.match(markup, /Not logged yet/);
    assert.doesNotMatch(markup, /Could not load/);
    assert.match(markup, /href="\/baby\/feed"/);
    assert.match(markup, /How long since the last feed/);
  });

  it("shows relative when above summary for a logged feed", () => {
    const markup = renderToStaticMarkup(
      createElement(BabyHomeContent, {
        status: {
          feed: {
            id: "1",
            type: "feed",
            at: new Date(Date.now() - 10 * 60_000).toISOString(),
            endedAt: null,
            summary: "Feed (breast_l)",
            source: "web",
          },
          sleep: null,
          diaper: null,
        },
        loading: false,
        t: (key) => t(key, "en"),
        locale: "en",
      }),
    );
    assert.match(markup, /10 min ago/);
    assert.match(markup, /Feed \(breast_l\)/);
    assert.match(markup, /Last feed/);
  });
});
