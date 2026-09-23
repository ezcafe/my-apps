import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";
import { forbidden, rateLimited } from "@/lib/api-http";

describe("tokens/timezone GraphQL transport JSON errors", () => {
  let handleMoneyGraphQLHttp: typeof import("@/lib/graphql/http-handler").handleMoneyGraphQLHttp;
  let rateLimitAllowed = true;

  before(async () => {
    const apiAuth = await import("@/lib/api-auth");
    mock.module("@/lib/api-auth", {
      namedExports: {
        ...apiAuth,
        // Avoid next-auth `headers()` outside request scope in unit tests.
        resolveRequestAuth: async () => ({
          method: null,
          userSub: null,
          workspaceId: null,
          apiTokenId: null,
          apiTokenAppKey: null,
      apiTokenApps: null,
          scopes: null,
        }),
      },
    });
    mock.module("@/lib/rate-limit", {
      namedExports: {
        enforceRateLimit: async () => rateLimitAllowed,
        rateLimitPrincipal: () => "anon",
      },
    });
    ({ handleMoneyGraphQLHttp } = await import("@/lib/graphql/http-handler"));
  });

  it("rateLimited and forbidden helpers are JSON with code (not raw text)", async () => {
    const rl = await rateLimited();
    const fb = await forbidden("Cross-origin request blocked");

    assert.equal(rl.headers.get("content-type")?.includes("application/json"), true);
    assert.equal(fb.headers.get("content-type")?.includes("application/json"), true);

    const rlBody = (await rl.json()) as { error: string; code: string };
    const fbBody = (await fb.json()) as { error: string; code: string };
    assert.equal(rl.status, 429);
    assert.equal(rlBody.code, "rate_limited");
    assert.equal(fb.status, 403);
    assert.equal(fbBody.code, "forbidden");
  });

  it("GraphQL HTTP path: rate deny → 429 JSON { code: rate_limited }", async () => {
    rateLimitAllowed = false;
    const res = await handleMoneyGraphQLHttp(
      new Request("http://localhost/api/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      "graphql-money-test",
    );

    assert.equal(res.status, 429);
    assert.equal(res.headers.get("content-type")?.includes("application/json"), true);
    const body = (await res.json()) as { error: string; code: string };
    assert.equal(body.code, "rate_limited");
    assert.equal(typeof body.error, "string");
  });

  it("GraphQL HTTP path: CSRF deny → 403 JSON { code: forbidden }", async () => {
    rateLimitAllowed = true;
    const res = await handleMoneyGraphQLHttp(
      new Request("http://localhost/api/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "session=test",
          // Missing Origin → assertSameOriginStrict fails for cookie POSTs
        },
        body: "{}",
      }),
      "graphql-money-csrf",
    );

    assert.equal(res.status, 403);
    assert.equal(res.headers.get("content-type")?.includes("application/json"), true);
    const body = (await res.json()) as { error: string; code: string };
    assert.equal(body.code, "forbidden");
  });
});
