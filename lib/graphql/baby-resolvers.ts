import { GraphQLJSON } from "graphql-scalars";
import { runInWorkspace } from "@/db";
import {
  createBabyDiaper,
  createBabyFeed,
  deleteBabyEvent,
  endBabySleep,
  findOpenSleep,
  startBabySleep,
  updateBabyEvent,
} from "@/features/baby/server/care-events";
import {
  createBabyGrowth,
  deleteBabyGrowth,
  listBabyGrowthEntries,
  updateBabyGrowth,
} from "@/features/baby/server/growth";
import { ensureBabyProfile } from "@/features/baby/server/profile";
import {
  getBabyTelegramLink,
  linkBabyTelegramChat,
  unlinkBabyTelegramChat,
} from "@/features/baby/server/telegram-link";
import {
  careSummary,
  listBabyTimeline,
} from "@/features/baby/server/timeline";
import {
  createBabyVaccine,
  deleteBabyVaccine,
  listBabyVaccines,
  updateBabyVaccine,
  type BabyVaccineRow,
} from "@/features/baby/server/vaccines";
import {
  requireBabyWorkspace,
  requireBabyWriteWorkspace,
  type BabyGraphQLContext,
} from "@/lib/graphql/baby-context";
import { mapServiceError } from "@/lib/graphql/map-service-error";
import { getBabySyncIntervalMinutes } from "@/lib/baby-sync-interval";
import {
  babyLocaleFromCookieHeader,
  t,
  type BabyLocale,
} from "@/lib/baby-i18n";
import { scheduleNotifyBabyCareCreated } from "@/features/baby/server/notify";

function localeOf(ctx: BabyGraphQLContext): BabyLocale {
  return babyLocaleFromCookieHeader(ctx.request?.headers.get("cookie"));
}

function serializeCare(row: {
  id: string;
  workspaceId: string;
  babyId: string;
  type: string;
  occurredAt: Date;
  endedAt: Date | null;
  payload: unknown;
  source: string;
  createdByUserSub: string;
  updatedByUserSub: string;
}) {
  return {
    ...row,
    occurredAt: row.occurredAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
  };
}

function serializeGrowth(row: {
  id: string;
  workspaceId: string;
  babyId: string;
  kind: string;
  recordedAt: Date;
  valueNum: string | null;
  valueText: string | null;
  unit: string | null;
  notes: string | null;
  source: string;
}) {
  return {
    ...row,
    recordedAt: row.recordedAt.toISOString(),
    valueNum: row.valueNum != null ? Number(row.valueNum) : null,
  };
}

function serializeVaccine(row: BabyVaccineRow) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    babyId: row.babyId,
    name: row.name,
    dose: row.dose,
    administeredAt: row.administeredAt.toISOString(),
    notes: row.notes,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeProfile(row: {
  id: string;
  workspaceId: string;
  displayName: string;
  birthDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Overridable in unit tests so Yoga uses real resolvers without a live DB. */
export const babyProfileQuery = {
  async load(workspaceId: string) {
    return runInWorkspace(workspaceId, async () =>
      serializeProfile(await ensureBabyProfile(workspaceId)),
    );
  },
};

export const babyResolvers = {
  JSON: GraphQLJSON,
  Query: {
    babyProfile: async (_: unknown, __: unknown, ctx: BabyGraphQLContext) => {
      const { workspaceId } = requireBabyWorkspace(ctx);
      try {
        return await babyProfileQuery.load(workspaceId);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    babyTimeline: async (
      _: unknown,
      args: { from?: string; to?: string; cursor?: string; limit?: number },
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, () =>
          listBabyTimeline(workspaceId, args, localeOf(ctx)),
        );
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    babyOpenSleep: async (
      _: unknown,
      __: unknown,
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, async () => {
          const baby = await ensureBabyProfile(workspaceId);
          const open = await findOpenSleep(workspaceId, baby.id);
          return open ? serializeCare(open) : null;
        });
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    babyGrowthEntries: async (
      _: unknown,
      args: {
        kind?: string;
        from?: string;
        to?: string;
        cursor?: string;
        limit?: number;
      },
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWorkspace(ctx);
      try {
        const page = await runInWorkspace(workspaceId, () =>
          listBabyGrowthEntries(workspaceId, args),
        );
        return {
          items: page.items.map(serializeGrowth),
          nextCursor: page.nextCursor,
        };
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    babyVaccines: async (
      _: unknown,
      args: {
        from?: string;
        to?: string;
        cursor?: string;
        limit?: number;
      },
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWorkspace(ctx);
      try {
        const page = await runInWorkspace(workspaceId, () =>
          listBabyVaccines(workspaceId, args),
        );
        return {
          items: page.items.map(serializeVaccine),
          nextCursor: page.nextCursor,
        };
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    babyTelegramLink: async (
      _: unknown,
      __: unknown,
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWorkspace(ctx);
      try {
        const link = await runInWorkspace(workspaceId, () =>
          getBabyTelegramLink(workspaceId),
        );
        if (!link) return null;
        return {
          ...link,
          linkedAt: link.linkedAt.toISOString(),
          confirmedAt: link.confirmedAt?.toISOString() ?? null,
        };
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    babySyncConfig: async (
      _: unknown,
      __: unknown,
      ctx: BabyGraphQLContext,
    ) => {
      requireBabyWorkspace(ctx);
      return {
        intervalMinutes: getBabySyncIntervalMinutes(),
      };
    },
  },
  Mutation: {
    ensureBabyProfile: async (
      _: unknown,
      args: { displayName?: string },
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, async () =>
          serializeProfile(
            await ensureBabyProfile(workspaceId, args.displayName ?? "Baby"),
          ),
        );
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    createBabyFeed: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      const locale = localeOf(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          createBabyFeed(workspaceId, userSub, args.input as never),
        );
        scheduleNotifyBabyCareCreated({
          workspaceId,
          kind: "feed",
          summary: careSummary("feed", args.input, locale),
          source: "web",
        });
        return serializeCare(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    createBabyDiaper: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      const locale = localeOf(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          createBabyDiaper(workspaceId, userSub, args.input as never),
        );
        scheduleNotifyBabyCareCreated({
          workspaceId,
          kind: "diaper",
          summary: careSummary("diaper", args.input, locale),
          source: "web",
        });
        return serializeCare(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    startBabySleep: async (
      _: unknown,
      args: { input?: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      const locale = localeOf(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          startBabySleep(workspaceId, userSub, (args.input ?? {}) as never),
        );
        scheduleNotifyBabyCareCreated({
          workspaceId,
          kind: "sleep",
          summary: t("summary.sleepStarted", locale),
          source: "web",
        });
        return serializeCare(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    endBabySleep: async (
      _: unknown,
      args: { input?: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          endBabySleep(workspaceId, userSub, (args.input ?? {}) as never),
        );
        return serializeCare(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    updateBabyEvent: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          updateBabyEvent(workspaceId, userSub, args.input),
        );
        return serializeCare(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    deleteBabyEvent: async (
      _: unknown,
      args: { id: string },
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          deleteBabyEvent(workspaceId, args.id),
        );
        return serializeCare(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    createBabyGrowth: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      const locale = localeOf(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          createBabyGrowth(workspaceId, userSub, args.input as never),
        );
        scheduleNotifyBabyCareCreated({
          workspaceId,
          kind: "growth",
          summary: t("summary.growthNotify", locale).replace(
            "{kind}",
            String((args.input as { kind?: string }).kind ?? ""),
          ),
          source: "web",
        });
        return serializeGrowth(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    updateBabyGrowth: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          updateBabyGrowth(workspaceId, userSub, args.input),
        );
        return serializeGrowth(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    deleteBabyGrowth: async (
      _: unknown,
      args: { id: string },
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          deleteBabyGrowth(workspaceId, args.id),
        );
        return serializeGrowth(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    createBabyVaccine: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          createBabyVaccine(workspaceId, userSub, args.input as never),
        );
        return serializeVaccine(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    updateBabyVaccine: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          updateBabyVaccine(workspaceId, userSub, args.input),
        );
        return serializeVaccine(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    deleteBabyVaccine: async (
      _: unknown,
      args: { id: string },
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const row = await runInWorkspace(workspaceId, () =>
          deleteBabyVaccine(workspaceId, args.id),
        );
        return serializeVaccine(row);
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    linkBabyTelegramChat: async (
      _: unknown,
      args: { input: { chatId: string } },
      ctx: BabyGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        const link = await runInWorkspace(workspaceId, () =>
          linkBabyTelegramChat(workspaceId, userSub, args.input),
        );
        return {
          ...link,
          linkedAt: link.linkedAt.toISOString(),
          confirmedAt: link.confirmedAt?.toISOString() ?? null,
        };
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
    unlinkBabyTelegramChat: async (
      _: unknown,
      __: unknown,
      ctx: BabyGraphQLContext,
    ) => {
      const { workspaceId } = requireBabyWriteWorkspace(ctx);
      try {
        await runInWorkspace(workspaceId, () =>
          unlinkBabyTelegramChat(workspaceId),
        );
        return true;
      } catch (e) {
        mapServiceError(e, ctx.requestId);
      }
    },
  },
};
