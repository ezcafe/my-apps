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
      apiTokenApps: null,
      scopes: null,
    },
    userSub: "user-1",
    workspaceId: "ws-1",
    workspaceMembershipVerified: true,
    dbUnreachable: false,
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

  it("requireBabyWorkspace throws SERVICE_UNAVAILABLE when dbUnreachable", () => {
    assert.throws(
      () =>
        requireBabyWorkspace(
          baseCtx({
            workspaceId: null,
            workspaceMembershipVerified: false,
            dbUnreachable: true,
          }),
        ),
      (e: unknown) => e instanceof Error && e.message === "SERVICE_UNAVAILABLE",
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

describe("babyInsightsSeries schema", () => {
  it("accepts babyInsightsSeries query (validate only)", async () => {
    const { parse, validate } = await import("graphql");
    const { babyGraphQLSchema } = await import("@/lib/graphql/baby-yoga");
    const errors = validate(
      babyGraphQLSchema,
      parse(`
        query BabyInsightsSeries($from: String!, $to: String!) {
          babyInsightsSeries(from: $from, to: $to) {
            hydration { days { date wetCount feedCount } alert emptyReason }
            nightRest { days { date nightSleepMinutes intervalCount } emptyReason }
            sleepEfficiency { emptyReason }
            counts { feeds sleep diapers }
            careCountDays { day feed sleep diaper }
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

describe("baby home redesign wiring (stubbed services)", () => {
  const ws = "22222222-2222-4222-8222-222222222222";

  it("babyHomeQuickStatus returns stubbed status", async () => {
    const { babyHomeQuickStatusQuery } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const original = babyHomeQuickStatusQuery.load;
    babyHomeQuickStatusQuery.load = async () => ({
      lastFeed: null,
      lastPump: null,
      lastSleep: null,
      lastDiaper: null,
      openSleep: null,
      feedsToday: 2,
      birthDate: "2026-01-01",
      latestWeightKg: null,
      recentBottleMl: [],
    });
    try {
      const result = await executeBabyGraphQLForTest(
        `{
          babyHomeQuickStatus(
            dayFrom: "2026-07-04T00:00:00.000+07:00"
            dayTo: "2026-07-05T00:00:00.000+07:00"
          ) {
            feedsToday
            birthDate
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(result.errors, undefined);
      const data = result.data as {
        babyHomeQuickStatus: { feedsToday: number; birthDate: string };
      };
      assert.equal(data.babyHomeQuickStatus.feedsToday, 2);
      assert.equal(data.babyHomeQuickStatus.birthDate, "2026-01-01");
    } finally {
      babyHomeQuickStatusQuery.load = original;
    }
  });

  it("updateBabyProfile wires to stub and returns birthDate", async () => {
    const { babyUpdateProfileMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const original = babyUpdateProfileMutation.run;
    babyUpdateProfileMutation.run = async (_ws, _user, input) => {
      const birthDate =
        input && typeof input === "object" && "birthDate" in input
          ? (input as { birthDate: string | null }).birthDate
          : null;
      return {
        id: "11111111-1111-4111-8111-111111111111",
        workspaceId: ws,
        displayName: "Ada",
        birthDate,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-04T00:00:00.000Z"),
      };
    };
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          updateBabyProfile(input: { birthDate: "2026-01-15" }) {
            birthDate
            displayName
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(result.errors, undefined);
      const data = result.data as {
        updateBabyProfile: { birthDate: string; displayName: string };
      };
      assert.equal(data.updateBabyProfile.birthDate, "2026-01-15");
    } finally {
      babyUpdateProfileMutation.run = original;
    }
  });

  it("babyQuickCare notify filter: endNap silent, insert-only feed, replay → zero", async () => {
    const { babyQuickCareMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const { babyQuickCareNotifyKinds } = await import(
      "@/lib/baby-quick-care-notify"
    );
    const originalRun = babyQuickCareMutation.run;
    const originalNotifyMany = babyQuickCareMutation.notifyMany;
    const notifies: string[] = [];

    const event = {
      id: "e1",
      workspaceId: ws,
      babyId: "b1",
      type: "feed" as const,
      occurredAt: new Date("2026-07-04T12:00:00.000Z"),
      endedAt: null,
      payload: { method: "formula", amountMl: 120 },
      source: "web" as const,
      createdByUserSub: "u",
      updatedByUserSub: "u",
    };

    babyQuickCareMutation.notifyMany = (inputs) => {
      for (const input of inputs) notifies.push(input.kind);
    };

    try {
      babyQuickCareMutation.run = async () => ({
        replayed: false,
        openSleep: null,
        steps: [
          { step: "saveBreast" as const, wrote: "insert" as const, event },
          {
            step: "endNap" as const,
            wrote: "update" as const,
            event: { ...event, id: "nap", type: "sleep" as const, payload: {} },
          },
          {
            step: "createFormula" as const,
            wrote: "update" as const,
            event,
          },
        ],
      });
      notifies.length = 0;
      const three = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            action: { kind: FORMULA, amountMl: 120 }
            breastRunning: null
            clientRequestId: "req-yoga-001"
          }) {
            replayed
            steps { step wrote }
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(three.errors, undefined, String(three.errors));
      assert.deepEqual(notifies, ["feed"]);
      assert.deepEqual(
        babyQuickCareNotifyKinds(
          [
            { step: "saveBreast", wrote: "insert" },
            { step: "endNap", wrote: "update" },
            { step: "createFormula", wrote: "update" },
          ],
          false,
        ),
        ["feed"],
      );

      babyQuickCareMutation.run = async () => ({
        replayed: true,
        openSleep: null,
        steps: [
          {
            step: "createFormula" as const,
            wrote: "insert" as const,
            event,
          },
        ],
      });
      notifies.length = 0;
      const replay = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            action: { kind: FORMULA, amountMl: 120 }
            breastRunning: null
            clientRequestId: "req-yoga-002"
          }) {
            replayed
            steps { step }
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(replay.errors, undefined);
      assert.deepEqual(notifies, []);

      babyQuickCareMutation.run = async () => ({
        replayed: false,
        openSleep: null,
        steps: [],
      });
      notifies.length = 0;
      const idle = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            action: { kind: BREAST, side: "breast_l" }
            breastRunning: null
            clientRequestId: "req-yoga-003"
          }) {
            replayed
            steps { step }
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(idle.errors, undefined);
      assert.deepEqual(notifies, []);

      let seenSessionInput: unknown;
      babyQuickCareMutation.run = async (_ws, _user, input) => {
        seenSessionInput = input;
        return {
          replayed: false,
          openSleep: null,
          steps: [
            {
              step: "createFormula" as const,
              wrote: "update" as const,
              event,
            },
          ],
        };
      };
      notifies.length = 0;
      const withSession = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            action: { kind: FORMULA, amountMl: 90 }
            breastRunning: null
            feedSessionEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
            clientRequestId: "req-yoga-session-1"
          }) {
            replayed
            steps { step wrote }
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(withSession.errors, undefined, String(withSession.errors));
      assert.equal(
        (seenSessionInput as { feedSessionEventId?: string }).feedSessionEventId,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      );
      assert.deepEqual(notifies, []);
    } finally {
      babyQuickCareMutation.run = originalRun;
      babyQuickCareMutation.notifyMany = originalNotifyMany;
    }
  });

  it("babyQuickCare DIAPER detail fields and latestWeightKg compile", async () => {
    const { babyQuickCareMutation, babyHomeQuickStatusQuery } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const originalRun = babyQuickCareMutation.run;
    const originalLoad = babyHomeQuickStatusQuery.load;
    let seenInput: unknown;
    babyQuickCareMutation.run = async (_ws, _user, input) => {
      seenInput = input;
      return {
        replayed: false,
        openSleep: null,
        steps: [
          {
            step: "createDiaper",
            wrote: "insert",
            event: {
              id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              type: "diaper",
              occurredAt: new Date("2026-07-04T10:00:00.000Z"),
              endedAt: null,
              payload: {
                kind: "dirty",
                color: "yellow",
                texture: "soft",
                amount: "medium",
              },
              source: "web",
              createdByUserSub: "user-1",
              updatedByUserSub: "user-1",
              workspaceId: ws,
              babyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            },
          },
        ],
      };
    };
    babyHomeQuickStatusQuery.load = async () => ({
      lastFeed: null,
      lastPump: null,
      lastSleep: null,
      lastDiaper: null,
      openSleep: null,
      feedsToday: 0,
      birthDate: null,
      latestWeightKg: null,
      recentBottleMl: [],
    });
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            clientRequestId: "req-yoga-diaper-1"
            action: {
              kind: DIAPER
              diaperKind: dirty
              diaperColor: yellow
              diaperTexture: soft
              diaperAmount: medium
            }
            breastRunning: null
          }) {
            replayed
            steps { step }
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(result.errors, undefined);
      const action = (seenInput as { action: Record<string, unknown> }).action;
      assert.equal(action.kind, "DIAPER");
      assert.equal(action.diaperKind, "dirty");
      assert.equal(action.diaperColor, "yellow");
      assert.equal(action.diaperTexture, "soft");
      assert.equal(action.diaperAmount, "medium");

      const status = await executeBabyGraphQLForTest(
        `query {
          babyHomeQuickStatus(
            dayFrom: "2026-07-04T00:00:00.000+07:00"
            dayTo: "2026-07-05T00:00:00.000+07:00"
          ) {
            latestWeightKg
            feedsToday
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(status.errors, undefined);
      const data = status.data as {
        babyHomeQuickStatus: { latestWeightKg: number | null; feedsToday: number };
      };
      assert.equal(data.babyHomeQuickStatus.latestWeightKg, null);
      assert.equal(data.babyHomeQuickStatus.feedsToday, 0);
    } finally {
      babyQuickCareMutation.run = originalRun;
      babyHomeQuickStatusQuery.load = originalLoad;
    }
  });

  it("babyQuickCare wet + detail fields → BAD_REQUEST", async () => {
    const { babyQuickCareMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const { parseOrThrow } = await import("@/lib/parse-or-throw");
    const { babyQuickCareSchema } = await import("@/lib/validators/baby");
    const originalRun = babyQuickCareMutation.run;
    let ranPastParse = false;
    babyQuickCareMutation.run = async (_ws, _user, input) => {
      parseOrThrow(babyQuickCareSchema, input);
      ranPastParse = true;
      return { replayed: false, openSleep: null, steps: [] };
    };
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            clientRequestId: "req-yoga-wet-detail"
            action: {
              kind: DIAPER
              diaperKind: wet
              diaperColor: yellow
            }
            breastRunning: null
          }) {
            replayed
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.ok(result.errors?.length);
      assert.equal(result.errors?.[0]?.extensions?.code, "BAD_REQUEST");
      assert.match(
        String(result.errors?.[0]?.message ?? ""),
        /Validation failed/i,
      );
      assert.equal(ranPastParse, false);
    } finally {
      babyQuickCareMutation.run = originalRun;
    }
  });

  it("babyQuickCare PUMP_AMOUNT + amountMl reaches handler", async () => {
    const { babyQuickCareMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const originalRun = babyQuickCareMutation.run;
    let seenInput: unknown;
    babyQuickCareMutation.run = async (_ws, _user, input) => {
      seenInput = input;
      return {
        replayed: false,
        openSleep: null,
        steps: [
          {
            step: "createPumpAmount",
            wrote: "insert",
            event: {
              id: "pppppppp-pppp-4ppp-8ppp-pppppppppppp",
              type: "feed",
              occurredAt: new Date("2026-07-04T10:00:00.000Z"),
              endedAt: null,
              payload: { method: "pump", amountMl: 120 },
              source: "web",
              createdByUserSub: "user-1",
              updatedByUserSub: "user-1",
              workspaceId: ws,
              babyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            },
          },
        ],
      };
    };
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            clientRequestId: "req-yoga-pump-amount-1"
            action: { kind: PUMP_AMOUNT, amountMl: 120 }
            breastRunning: null
          }) {
            replayed
            steps { step wrote }
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(result.errors, undefined);
      const action = (seenInput as { action: Record<string, unknown> }).action;
      assert.equal(action.kind, "PUMP_AMOUNT");
      assert.equal(action.amountMl, 120);
    } finally {
      babyQuickCareMutation.run = originalRun;
    }
  });

  it("babyQuickCare PUMP_AMOUNT without amountMl still fails Zod", async () => {
    const { babyQuickCareMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const { parseOrThrow } = await import("@/lib/parse-or-throw");
    const { babyQuickCareSchema } = await import("@/lib/validators/baby");
    const originalRun = babyQuickCareMutation.run;
    let ranPastParse = false;
    babyQuickCareMutation.run = async (_ws, _user, input) => {
      parseOrThrow(babyQuickCareSchema, input);
      ranPastParse = true;
      return { replayed: false, openSleep: null, steps: [] };
    };
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            clientRequestId: "req-yoga-pump-no-amount"
            action: { kind: PUMP_AMOUNT }
            breastRunning: null
          }) {
            replayed
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.ok(result.errors?.length);
      assert.equal(ranPastParse, false);
    } finally {
      babyQuickCareMutation.run = originalRun;
    }
  });

  it("babyQuickCare rejects unknown diaperColor at GraphQL enum layer", async () => {
    const { babyQuickCareMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const originalRun = babyQuickCareMutation.run;
    let ran = false;
    babyQuickCareMutation.run = async () => {
      ran = true;
      return { replayed: false, openSleep: null, steps: [] };
    };
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            clientRequestId: "req-yoga-bad-color"
            action: {
              kind: DIAPER
              diaperKind: dirty
              diaperColor: not_a_color
            }
            breastRunning: null
          }) {
            replayed
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.ok(result.errors?.length);
      assert.match(
        String(result.errors?.[0]?.message ?? ""),
        /BabyDiaperColor|not_a_color|Enum/i,
      );
      assert.equal(ran, false);
    } finally {
      babyQuickCareMutation.run = originalRun;
    }
  });

  it("babyQuickCare DIAPER + occurredAt reaches handler", async () => {
    const { babyQuickCareMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const originalRun = babyQuickCareMutation.run;
    let seenInput: unknown;
    babyQuickCareMutation.run = async (_ws, _user, input) => {
      seenInput = input;
      return { replayed: false, openSleep: null, steps: [] };
    };
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            clientRequestId: "req-yoga-diaper-occurred"
            action: { kind: DIAPER, diaperKind: wet }
            breastRunning: null
            occurredAt: "2026-09-20T06:40:00.000+07:00"
          }) {
            replayed
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(result.errors, undefined);
      assert.equal(
        (seenInput as { occurredAt?: string }).occurredAt,
        "2026-09-20T06:40:00.000+07:00",
      );
    } finally {
      babyQuickCareMutation.run = originalRun;
    }
  });

  it("babyQuickCare SLEEP end + endedAt reaches handler", async () => {
    const { babyQuickCareMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const originalRun = babyQuickCareMutation.run;
    let seenInput: unknown;
    babyQuickCareMutation.run = async (_ws, _user, input) => {
      seenInput = input;
      return { replayed: false, openSleep: null, steps: [] };
    };
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            clientRequestId: "req-yoga-sleep-ended"
            action: { kind: SLEEP }
            breastRunning: null
            endedAt: "2026-09-20T06:40:00.000+07:00"
          }) {
            replayed
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.equal(result.errors, undefined);
      assert.equal(
        (seenInput as { endedAt?: string }).endedAt,
        "2026-09-20T06:40:00.000+07:00",
      );
    } finally {
      babyQuickCareMutation.run = originalRun;
    }
  });

  it("babyQuickCare bad datetime → BAD_REQUEST before handler", async () => {
    const { babyQuickCareMutation } = await import(
      "@/lib/graphql/baby-resolvers"
    );
    const { parseOrThrow } = await import("@/lib/parse-or-throw");
    const { babyQuickCareSchema } = await import("@/lib/validators/baby");
    const originalRun = babyQuickCareMutation.run;
    let ranPastParse = false;
    babyQuickCareMutation.run = async (_ws, _user, input) => {
      parseOrThrow(babyQuickCareSchema, input);
      ranPastParse = true;
      return { replayed: false, openSleep: null, steps: [] };
    };
    try {
      const result = await executeBabyGraphQLForTest(
        `mutation {
          babyQuickCare(input: {
            clientRequestId: "req-yoga-bad-time"
            action: { kind: DIAPER, diaperKind: wet }
            breastRunning: null
            occurredAt: "not-a-datetime"
          }) {
            replayed
          }
        }`,
        {
          userSub: "user-1",
          workspaceId: ws,
          workspaceMembershipVerified: true,
        },
      );
      assert.ok(result.errors?.length);
      assert.equal(ranPastParse, false);
    } finally {
      babyQuickCareMutation.run = originalRun;
    }
  });
});
