import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { BABY_VACCINE_CAPTURE_HREF } from "@/lib/baby-growth-page-chips";

describe("baby growth redirects in next.config", () => {
  const src = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");

  it("permanently redirects /baby/measure to /baby/growth", () => {
    assert.match(
      src,
      /source:\s*"\/baby\/measure"[\s\S]*?destination:\s*"\/baby\/growth"[\s\S]*?permanent:\s*true/,
    );
  });

  it("no longer redirects /baby/growth to Insights", () => {
    assert.doesNotMatch(
      src,
      /source:\s*"\/baby\/growth"[\s\S]*?destination:\s*"\/baby\/insights"/,
    );
  });

  it("permanently redirects /baby/vaccines to Growth with Vaccine preselected", () => {
    assert.equal(BABY_VACCINE_CAPTURE_HREF, "/baby/growth?kind=vaccine");
    const escaped = BABY_VACCINE_CAPTURE_HREF.replace("?", "\\?");
    assert.match(
      src,
      new RegExp(
        `source:\\s*"/baby/vaccines"[\\s\\S]*?destination:\\s*"${escaped}"[\\s\\S]*?permanent:\\s*true`,
      ),
    );
    assert.match(
      src,
      new RegExp(
        `source:\\s*"/baby/vaccines/:path\\*"[\\s\\S]*?destination:\\s*"${escaped}"[\\s\\S]*?permanent:\\s*true`,
      ),
    );
  });
});
