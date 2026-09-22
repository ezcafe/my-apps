import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("docs Tasks 7–9", () => {
  it("ARCHITECTURE lists pagination dialects + follow-up note", () => {
    const doc = readFileSync(join(process.cwd(), "docs/ARCHITECTURE.md"), "utf8");
    assert.match(doc, /List pagination dialects/);
    assert.match(doc, /Follow-up: unify pagination — not this PR/);
    assert.match(doc, /pageSize/);
    assert.match(doc, /limit.*cursor/i);
  });

  it("ARCHITECTURE documents non-RLS system tables including http_idempotency", () => {
    const doc = readFileSync(join(process.cwd(), "docs/ARCHITECTURE.md"), "utf8");
    assert.match(doc, /Non-RLS system tables/);
    assert.match(doc, /api_token/);
    assert.match(doc, /http_idempotency/);
    assert.match(doc, /money_import_preview/);
    assert.match(doc, /Not on this list/);
  });

  it("ARCHITECTURE documents Idempotency-Key client contract", () => {
    const doc = readFileSync(join(process.cwd(), "docs/ARCHITECTURE.md"), "utf8");
    assert.match(doc, /Idempotency-Key \(client contract\)/);
    assert.match(doc, /POST \/api\/money\/import\/commit/);
    assert.match(doc, /POST \/api\/investment\/import\/commit/);
    assert.match(doc, /POST \/api\/workspace\/members/);
    assert.match(doc, /128/);
    assert.match(doc, /Idempotency-Replayed/);
    assert.match(doc, /idempotency_in_progress/);
    assert.match(doc, /idempotency_body_mismatch/);
    assert.match(doc, /unsafe to retry/);
    assert.match(doc, /24h TTL/);
  });

  it("eslint.config.mjs still has array and SUM::int guards", () => {
    const cfg = readFileSync(join(process.cwd(), "eslint.config.mjs"), "utf8");
    assert.ok(cfg.includes("no-restricted-syntax"));
    assert.ok(cfg.includes("::\\\\w+\\\\[\\\\]"));
    assert.ok(cfg.includes("SUM"));
    assert.ok(cfg.includes(")::int"));
  });
});
