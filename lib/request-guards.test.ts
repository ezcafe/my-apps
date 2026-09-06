import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readJsonBounded } from "@/lib/request-guards";

describe("readJsonBounded", () => {
  it("rejects oversized body when Content-Length is set", async () => {
    const pad = "x".repeat(1000);
    const body = JSON.stringify({ pad });
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(body.length),
      },
      body,
    });
    await assert.rejects(
      () => readJsonBounded(req, 500),
      (e: unknown) =>
        e instanceof Error && e.message.startsWith("Payload too large"),
    );
  });

  it("rejects oversized body when Content-Length is omitted", async () => {
    const pad = "x".repeat(1000);
    const body = JSON.stringify({ pad });
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    assert.equal(req.headers.get("content-length"), null);
    await assert.rejects(
      () => readJsonBounded(req, 500),
      (e: unknown) =>
        e instanceof Error && e.message.startsWith("Payload too large"),
    );
  });

  it("parses JSON within the byte bound without Content-Length", async () => {
    const body = JSON.stringify({ ok: true });
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    assert.equal(req.headers.get("content-length"), null);
    const parsed = await readJsonBounded(req, 1024);
    assert.deepEqual(parsed, { ok: true });
  });
});
