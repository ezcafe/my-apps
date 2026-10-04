import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("idempotency client wiring (source)", () => {
  it("investment commit fetch uses jsonWithIdempotencyHeaders", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "components/investment-settings/investment-statement-import-wizard.tsx",
      ),
      "utf8",
    );
    assert.match(src, /jsonWithIdempotencyHeaders/);
    assert.match(src, /\/api\/investment\/import\/commit/);
  });

  it("workspace members POST uses jsonWithIdempotencyHeaders", () => {
    const src = readFileSync(
      join(process.cwd(), "components/workspace-members-panel.tsx"),
      "utf8",
    );
    assert.match(src, /jsonWithIdempotencyHeaders/);
    assert.match(src, /\/api\/workspace\/members/);
  });

  it("money csv import wizard uses jsonWithIdempotencyHeaders", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "components/money-settings/money-csv-import-wizard.tsx",
      ),
      "utf8",
    );
    assert.match(src, /jsonWithIdempotencyHeaders/);
    assert.match(src, /moneyImportApiPath/);
  });
});
