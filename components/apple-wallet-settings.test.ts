import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { APPLE_WALLET_ISSUE_PATH } from "@/lib/apple-wallet/constants";

describe("AppleWalletSettings Add delivery", () => {
  it("uses navigational form GET to issue path (not fetch→blob→download)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/apple-wallet-settings.tsx"),
      "utf8",
    );
    assert.match(src, /method=["']GET["']/i);
    assert.ok(
      src.includes("APPLE_WALLET_ISSUE_PATH") ||
        src.includes(APPLE_WALLET_ISSUE_PATH),
    );
    assert.doesNotMatch(src, /createObjectURL/);
    assert.doesNotMatch(src, /\.download\s*=/);
    assert.doesNotMatch(src, /fetch\(\s*["']\/api\/apple-wallet\/issue["']/);
  });
});
