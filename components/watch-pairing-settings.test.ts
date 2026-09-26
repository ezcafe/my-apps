import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("WatchPairingSettings source", () => {
  const src = readFileSync(
    join(process.cwd(), "components/watch-pairing-settings.tsx"),
    "utf8",
  );

  it("calls mint endpoint and shows code + expiry test ids", () => {
    assert.match(src, /\/api\/watch\/pair/);
    assert.match(src, /data-testid="watch-pairing-code"/);
    assert.match(src, /data-testid="watch-pairing-expiry"/);
    assert.match(src, /data-testid="watch-pairing-generate"/);
  });

  it("includes app pickers, one-time warning, and Reveal control", () => {
    assert.match(src, /Device pairing/);
    assert.match(src, /One-time use/);
    assert.match(src, /data-testid="watch-pairing-reveal"/);
    assert.match(src, /\/api\/watch\/pair\/redeem/);
  });
});

describe("ApiTokenSettings source", () => {
  const src = readFileSync(
    join(process.cwd(), "components/api-token-settings.tsx"),
    "utf8",
  );

  it("has no Create token form", () => {
    assert.doesNotMatch(src, /TokenCreateForm/);
    assert.doesNotMatch(src, /Create token/);
  });
});
