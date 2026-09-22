import assert from "node:assert/strict";
import {
  badRequest,
  clientSafeErrorMessage,
  ClientFacingError,
  conflict,
  dbUnavailable,
  forbidden,
  notFound,
  rateLimited,
  unauthorized,
} from "@/lib/api-http";
import { rateLimited as moneyRateLimited, unauthorized as moneyUnauthorized } from "@/lib/api-money";
import { unauthorized as investmentUnauthorized } from "@/lib/api-investment";
import { describe, it } from "node:test";

async function bodyOf(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe("api-http helpers", () => {
  it("maps status → { error, code } including rate_limited 429", async () => {
    const cases: Array<{
      res: Response;
      status: number;
      code: string;
    }> = [
      { res: await unauthorized(), status: 401, code: "unauthorized" },
      { res: await badRequest("bad"), status: 400, code: "bad_request" },
      { res: await forbidden(), status: 403, code: "forbidden" },
      { res: await notFound(), status: 404, code: "not_found" },
      { res: await conflict("clash"), status: 409, code: "conflict" },
      {
        res: await conflict("in flight", "idempotency_in_progress"),
        status: 409,
        code: "idempotency_in_progress",
      },
      { res: await rateLimited(), status: 429, code: "rate_limited" },
      { res: dbUnavailable(), status: 503, code: "db_unavailable" },
    ];

    for (const c of cases) {
      assert.equal(c.res.status, c.status);
      const body = await bodyOf(c.res);
      assert.equal(typeof body.error, "string");
      assert.equal(body.code, c.code);
    }
  });

  it("dbUnavailable default message is stable (no ops / DATABASE_URL hints)", async () => {
    const body = await bodyOf(dbUnavailable());
    assert.equal(body.error, "Database unavailable");
    assert.equal(body.code, "db_unavailable");
    assert.equal(String(body.error).includes("DATABASE_URL"), false);
    assert.equal(String(body.error).includes("docker"), false);
  });

  it("clientSafeErrorMessage: ClientFacingError / allowlist pass; raw Error falls back", () => {
    assert.equal(
      clientSafeErrorMessage(new ClientFacingError("Missing rows"), "Import failed"),
      "Missing rows",
    );
    assert.equal(
      clientSafeErrorMessage(
        new Error("relation http_idempotency does not exist"),
        "Import failed",
      ),
      "Import failed",
    );
    assert.equal(
      clientSafeErrorMessage(new Error("NOT_FOUND"), "Request failed", new Set(["NOT_FOUND"])),
      "NOT_FOUND",
    );
  });

  it("badRequest may include details", async () => {
    const res = await badRequest("Invalid query", { fieldErrors: { limit: ["Required"] } });
    const body = await bodyOf(res);
    assert.equal(body.code, "bad_request");
    assert.deepEqual(body.details, { fieldErrors: { limit: ["Required"] } });
  });
});

describe("apiMoney_reexportsHttpHelpers", () => {
  it("feature facades still re-export unauthorized / rateLimited", async () => {
    const moneyUnauth = await moneyUnauthorized();
    const moneyRl = await moneyRateLimited();
    const invUnauth = await investmentUnauthorized();

    assert.equal(moneyUnauth.status, 401);
    assert.equal((await bodyOf(moneyUnauth)).code, "unauthorized");
    assert.equal(moneyRl.status, 429);
    assert.equal((await bodyOf(moneyRl)).code, "rate_limited");
    assert.equal(invUnauth.status, 401);
    assert.equal((await bodyOf(invUnauth)).code, "unauthorized");
  });
});
