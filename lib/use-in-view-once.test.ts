import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseRootMarginPx,
  rectIntersectsViewport,
} from "@/lib/use-in-view-once";

describe("parseRootMarginPx", () => {
  it("expands 1-value shorthand", () => {
    assert.deepEqual(parseRootMarginPx("120px"), {
      top: 120,
      right: 120,
      bottom: 120,
      left: 120,
    });
  });

  it("expands 2-value shorthand", () => {
    assert.deepEqual(parseRootMarginPx("120px 0px"), {
      top: 120,
      right: 0,
      bottom: 120,
      left: 0,
    });
  });

  it("parses 4-value margin", () => {
    assert.deepEqual(parseRootMarginPx("10px 20px 30px 40px"), {
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    });
  });
});

describe("rectIntersectsViewport", () => {
  const viewport = { width: 390, height: 800 };

  it("detects an on-screen card", () => {
    assert.equal(
      rectIntersectsViewport(
        { top: 100, right: 350, bottom: 380, left: 16 },
        "0px",
        viewport,
      ),
      true,
    );
  });

  it("treats near-viewport cards as visible with rootMargin", () => {
    assert.equal(
      rectIntersectsViewport(
        { top: 850, right: 350, bottom: 1100, left: 16 },
        "120px 0px",
        viewport,
      ),
      true,
    );
  });

  it("keeps far-below cards hidden", () => {
    assert.equal(
      rectIntersectsViewport(
        { top: 2000, right: 350, bottom: 2300, left: 16 },
        "120px 0px",
        viewport,
      ),
      false,
    );
  });
});
