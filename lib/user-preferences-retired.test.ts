import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("user preferences API retired", () => {
  it("user preferences route file is removed", () => {
    const route = resolve(
      process.cwd(),
      "app/api/user/preferences/route.ts",
    );
    assert.equal(
      existsSync(route),
      false,
      "expected app/api/user/preferences/route.ts to be deleted (no empty-bag stub)",
    );
  });

  it("preferences city-search route is removed", () => {
    const citySearch = resolve(
      process.cwd(),
      "app/api/user/preferences/city-search/route.ts",
    );
    assert.equal(
      existsSync(citySearch),
      false,
      "expected city-search route to be deleted",
    );
  });
});
