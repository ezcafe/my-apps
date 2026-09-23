import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

const invCtx = {
  userSub: "user-1",
  workspaceId: "00000000-0000-4000-8000-000000000001",
  auth: {
    method: "api_key" as const,
    userSub: "user-1",
    workspaceId: "00000000-0000-4000-8000-000000000001",
    apiTokenId: "tok-1",
    apiTokenAppKey: "investment" as const,
    apiTokenApps: [] as const,
    scopes: ["read", "write"] as ("read" | "write")[],
  },
};

/**
 * Isolated mocks for Investment REST handlers (Zod + rate-limit deny).
 * Mutators stub enforceRateLimit; GET Zod path never needs rate-limit allow.
 */
describe("Investment REST hardening (handler paths)", () => {
  let rateLimitAllowed = true;
  let GET: typeof import("@/app/api/investment/activities/route").GET;
  let POST_ACTIVITIES: typeof import("@/app/api/investment/activities/route").POST;
  let POST_IMPORT_PREVIEW: typeof import("@/app/api/investment/import/preview/route").POST;

  before(async () => {
    const apiInv = await import("@/lib/api-investment");
    mock.module("@/lib/api-investment", {
      namedExports: {
        ...apiInv,
        requireInvestmentContext: async () => invCtx,
        withInvestmentWorkspaceRls: async (
          _ctx: unknown,
          run: () => Promise<unknown>,
        ) => run(),
      },
    });
    mock.module("@/lib/rate-limit", {
      namedExports: {
        enforceRateLimit: async () => rateLimitAllowed,
        rateLimitPrincipal: () => "u:user-1",
      },
    });
    mock.module("@/lib/investment-services/activities", {
      namedExports: {
        listInvestmentActivities: async () => [],
        createInvestmentActivity: async () => {
          throw new Error("should not create under rate-limit tests");
        },
        getInvestmentActivity: async () => null,
        updateInvestmentActivity: async () => null,
        deleteInvestmentActivity: async () => false,
      },
    });
    mock.module("@/lib/investment-services/import-statement", {
      namedExports: {
        previewInvestmentStatement: async () => {
          throw new Error("should not preview under rate-limit deny");
        },
        commitInvestmentStatement: async () => {
          throw new Error("should not commit under rate-limit deny");
        },
      },
    });

    ({ GET, POST: POST_ACTIVITIES } = await import(
      "@/app/api/investment/activities/route"
    ));
    ({ POST: POST_IMPORT_PREVIEW } = await import(
      "@/app/api/investment/import/preview/route"
    ));
  });

  it("bad query through activities GET → 400 with issue text (not Validation failed)", async () => {
    rateLimitAllowed = true;
    const res = await GET(
      new Request(
        "http://localhost/api/investment/activities?limit=not-a-number",
        {
          method: "GET",
          headers: {
            authorization: "Bearer inv_test_token_placeholder",
          },
        },
      ),
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as {
      error: string;
      code: string;
      details?: unknown;
    };
    assert.equal(body.code, "bad_request");
    assert.notEqual(body.error, "Validation failed");
    assert.notEqual(body.error, "Invalid query");
    assert.ok(body.error.length > 0);
    assert.ok(body.details);
  });

  it("activities POST: enforceRateLimit deny → 429 rate_limited", async () => {
    rateLimitAllowed = false;
    const res = await POST_ACTIVITIES(
      new Request("http://localhost/api/investment/activities", {
        method: "POST",
        headers: {
          authorization: "Bearer inv_test_token_placeholder",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    assert.equal(res.status, 429);
    const body = (await res.json()) as { error: string; code: string };
    assert.equal(body.code, "rate_limited");
  });

  it("import preview POST: enforceRateLimit deny → 429 rate_limited", async () => {
    rateLimitAllowed = false;
    const res = await POST_IMPORT_PREVIEW(
      new Request("http://localhost/api/investment/import/preview", {
        method: "POST",
        headers: {
          authorization: "Bearer inv_test_token_placeholder",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    assert.equal(res.status, 429);
    const body = (await res.json()) as { error: string; code: string };
    assert.equal(body.code, "rate_limited");
  });
});
