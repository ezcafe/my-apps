import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  babyProfileQuery,
} from "@/lib/graphql/baby-resolvers";
import { executeBabyGraphQLForTest } from "@/lib/graphql/baby-yoga";
import {
  requireBabyAuth,
  requireBabyWorkspace,
  type BabyGraphQLContext,
} from "@/lib/graphql/baby-context";

function baseCtx(
  overrides: Partial<BabyGraphQLContext> = {},
): BabyGraphQLContext {
  return {
    requestId: "test",
    responseHeaders: new Headers(),
    auth: {
      method: "session",
      userSub: "user-1",
      workspaceId: null,
      apiTokenId: null,
      apiTokenAppKey: null,
      scopes: null,
    },
    userSub: "user-1",
    workspaceId: "ws-1",
    workspaceMembershipVerified: true,
    authMethod: "session",
    apiTokenId: null,
    scopes: null,
    loaders: new Map(),
    ...overrides,
  };
}

describe("baby GraphQL authz (context helpers)", () => {
  it("requireBabyAuth throws UNAUTHORIZED when userSub is null", () => {
    assert.throws(
      () => requireBabyAuth(baseCtx({ userSub: null })),
      (e: unknown) => e instanceof Error && e.message === "UNAUTHORIZED",
    );
  });

  it("requireBabyWorkspace throws FORBIDDEN when membership unverified", () => {
    assert.throws(
      () =>
        requireBabyWorkspace(
          baseCtx({ workspaceMembershipVerified: false }),
        ),
      (e: unknown) => e instanceof Error && e.message === "FORBIDDEN",
    );
  });
});

describe("baby GraphQL schema (real resolvers)", () => {
  const originalLoad = babyProfileQuery.load;

  afterEach(() => {
    babyProfileQuery.load = originalLoad;
  });

  it("babyProfile succeeds via executeBabyGraphQLForTest", async () => {
    babyProfileQuery.load = async () => ({
      id: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      displayName: "Ada",
      birthDate: null,
      createdAt: "2026-09-06T00:00:00.000Z",
      updatedAt: "2026-09-06T00:00:00.000Z",
    });

    const result = await executeBabyGraphQLForTest(
      `{ babyProfile { id displayName } }`,
      {
        userSub: "user-1",
        workspaceId: "22222222-2222-4222-8222-222222222222",
        workspaceMembershipVerified: true,
      },
    );

    assert.equal(result.errors, undefined);
    const data = result.data as {
      babyProfile: { id: string; displayName: string };
    };
    assert.equal(data.babyProfile.displayName, "Ada");
    assert.equal(
      data.babyProfile.id,
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("unauthorized userSub → UNAUTHORIZED", async () => {
    const result = await executeBabyGraphQLForTest(
      `{ babyProfile { id displayName } }`,
      { userSub: null, workspaceMembershipVerified: false },
    );
    assert.ok(result.errors?.length);
    assert.equal(result.errors?.[0]?.message, "UNAUTHORIZED");
  });

  it("unverified membership → FORBIDDEN", async () => {
    const result = await executeBabyGraphQLForTest(
      `{ babyProfile { id displayName } }`,
      {
        userSub: "user-1",
        workspaceId: "ws-1",
        workspaceMembershipVerified: false,
      },
    );
    assert.ok(result.errors?.length);
    assert.equal(result.errors?.[0]?.message, "FORBIDDEN");
  });
});

describe("babyGrowthEntries schema from/to", () => {
  it("accepts from/to args on babyGrowthEntries (validate only)", async () => {
    const { parse, validate } = await import("graphql");
    const { babyGraphQLSchema } = await import("@/lib/graphql/baby-yoga");
    const errors = validate(
      babyGraphQLSchema,
      parse(`
        query BabyGrowth($from: String, $to: String) {
          babyGrowthEntries(from: $from, to: $to) {
            items { id recordedAt }
            nextCursor
          }
        }
      `),
    );
    assert.deepEqual(errors, []);
  });
});

describe("babyVaccines schema", () => {
  it("accepts babyVaccines query and create/update/delete vaccine mutations", async () => {
    const { parse, validate } = await import("graphql");
    const { babyGraphQLSchema } = await import("@/lib/graphql/baby-yoga");
    const qErrors = validate(
      babyGraphQLSchema,
      parse(`
        query BabyVaccines($from: String, $to: String) {
          babyVaccines(from: $from, to: $to) {
            items { id name dose administeredAt }
            nextCursor
          }
        }
      `),
    );
    assert.deepEqual(qErrors, []);
    const createErrors = validate(
      babyGraphQLSchema,
      parse(`
        mutation CreateBabyVaccine($input: CreateBabyVaccineInput!) {
          createBabyVaccine(input: $input) { id name dose }
        }
      `),
    );
    assert.deepEqual(createErrors, []);
    const updateErrors = validate(
      babyGraphQLSchema,
      parse(`
        mutation UpdateBabyVaccine($input: UpdateBabyVaccineInput!) {
          updateBabyVaccine(input: $input) { id name dose }
        }
      `),
    );
    assert.deepEqual(updateErrors, []);
    const deleteErrors = validate(
      babyGraphQLSchema,
      parse(`
        mutation DeleteBabyVaccine($id: ID!) {
          deleteBabyVaccine(id: $id) { id }
        }
      `),
    );
    assert.deepEqual(deleteErrors, []);
  });
});

describe("babyOpenSleep schema", () => {
  it("accepts babyOpenSleep query (validate only)", async () => {
    const { parse, validate } = await import("graphql");
    const { babyGraphQLSchema } = await import("@/lib/graphql/baby-yoga");
    const errors = validate(
      babyGraphQLSchema,
      parse(`
        query BabyOpenSleep {
          babyOpenSleep {
            id
            type
            endedAt
          }
        }
      `),
    );
    assert.deepEqual(errors, []);
  });
});
