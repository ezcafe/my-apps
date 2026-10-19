import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

/** One redirect object: source + destination + permanent on the same `{…}` (no cross-entry). */
function sameObjectRedirect(
  source: string,
  destination: string,
  permanent: boolean,
): RegExp {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    String.raw`\{\s*source:\s*"${esc(source)}"[^{}]*destination:\s*"${esc(destination)}"[^{}]*permanent:\s*${permanent}[^{}]*\}`,
  );
}

describe("kiosk redirects in next.config", () => {
  const src = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");

  it("permanently redirects /kiosk to /money", () => {
    assert.match(src, sameObjectRedirect("/kiosk", "/money", true));
    assert.match(src, sameObjectRedirect("/kiosk/:path*", "/money", true));
    assert.doesNotMatch(
      src,
      /\{\s*source:\s*"\/kiosk"[^{}]*destination:\s*"\/money\/new"/,
    );
    assert.doesNotMatch(
      src,
      /\{\s*source:\s*"\/kiosk\/:path\*"[^{}]*destination:\s*"\/money\/new"/,
    );
  });
});
