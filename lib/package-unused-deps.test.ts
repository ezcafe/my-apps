import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("package.json unused dependency cleanup", () => {
  it("omits unused dependency rate-limiter-flexible", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    assert.equal(
      pkg.dependencies?.["rate-limiter-flexible"],
      undefined,
      "rate-limiter-flexible has no imports — remove from dependencies",
    );
    assert.equal(pkg.devDependencies?.["rate-limiter-flexible"], undefined);
  });

  it("omits unused dependency d3-shape", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    assert.equal(
      pkg.dependencies?.["d3-shape"],
      undefined,
      "d3-shape has no direct imports — remove from dependencies",
    );
    assert.equal(pkg.devDependencies?.["d3-shape"], undefined);
  });
});

