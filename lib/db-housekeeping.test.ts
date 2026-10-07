import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { cronAuthResponse, verifyCronRequest } from "@/lib/cron-auth";

describe("db housekeeping cron", () => {
  it("route rejects missing/wrong CRON_SECRET", () => {
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-cron-secret";
    try {
      assert.equal(
        verifyCronRequest(
          new Request("http://localhost/api/cron/db-housekeeping", {
            method: "POST",
          }),
        ),
        "unauthorized",
      );
      assert.equal(
        verifyCronRequest(
          new Request("http://localhost/api/cron/db-housekeeping", {
            method: "POST",
            headers: { authorization: "Bearer wrong" },
          }),
        ),
        "unauthorized",
      );
      assert.equal(
        verifyCronRequest(
          new Request("http://localhost/api/cron/db-housekeeping", {
            method: "POST",
            headers: { authorization: "Bearer test-cron-secret" },
          }),
        ),
        "ok",
      );
      const denied = cronAuthResponse("unauthorized");
      assert.ok(denied);
      assert.equal(denied.status, 401);
    } finally {
      if (prev === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prev;
    }
  });

  it("housekeeping module deletes rate_limit + calls import + baby prunes + apple issue tokens", () => {
    const src = readFileSync(join(process.cwd(), "lib/db-housekeeping.ts"), "utf8");
    assert.match(src, /DELETE FROM security_rate_limit/);
    assert.match(src, /pruneExpiredImportPreviews/);
    assert.match(src, /pruneExpiredBabyQuickCareRequests/);
    assert.match(src, /pruneAppleWalletIssueTokens/);
    assert.match(src, /runDbHousekeeping/);
  });

  it("baby prune uses TTL + batch limit", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/baby-quick-care-prune.ts"),
      "utf8",
    );
    assert.match(src, /baby_quick_care_request/);
    assert.match(src, /BABY_QUICK_CARE_TTL_HOURS/);
    assert.match(src, /BABY_QUICK_CARE_PRUNE_BATCH_SIZE/);
  });

  it("cron route wires verifyCronRequest + runDbHousekeeping", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/cron/db-housekeeping/route.ts"),
      "utf8",
    );
    assert.match(src, /verifyCronRequest/);
    assert.match(src, /runDbHousekeeping/);
  });
});
