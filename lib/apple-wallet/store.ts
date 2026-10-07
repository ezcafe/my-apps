import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db, withBypassRls } from "@/db";
import {
  appleWalletChannelState,
  appleWalletDevice,
  appleWalletIssueToken,
  appleWalletRegistration,
  appleWalletSubscriber,
  type AppleWalletSubscriberStatus,
} from "@/db/schema/apple-wallet";

export type AppleWalletSubscriberRow = {
  id: string;
  workspaceId: string;
  userSub: string;
  serialNumber: string;
  authToken: string;
  status: AppleWalletSubscriberStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type AppleWalletStore = {
  findSubscriberBySerial(
    serialNumber: string,
  ): Promise<AppleWalletSubscriberRow | null>;
  findSubscriberByWorkspaceUser(
    workspaceId: string,
    userSub: string,
  ): Promise<AppleWalletSubscriberRow | null>;
  upsertSubscriberForIssue(args: {
    workspaceId: string;
    userSub: string;
    serialNumber: string;
    authToken: string;
    now: Date;
  }): Promise<AppleWalletSubscriberRow>;
  /** Ensure channel row exists (also done inside upsertSubscriberForIssue tx). */
  ensureChannelState(workspaceId: string, now: Date): Promise<void>;
  getChannelLatest(workspaceId: string): Promise<{
    latestMessage: string;
    updatedAt: Date;
  } | null>;
  registerDevice(args: {
    deviceLibraryId: string;
    pushToken: string;
    serialNumber: string;
    passTypeId: string;
  }): Promise<boolean>;
  unregisterDevice(
    deviceLibraryId: string,
    serialNumber: string,
  ): Promise<void>;
  serialsForDevice(
    deviceLibraryId: string,
    passTypeId: string,
    since?: Date,
  ): Promise<{ serialNumber: string; updatedAt: Date }[]>;
  countRegistrations(serialNumber: string): Promise<number>;
  pushTokensForWorkspace(workspaceId: string): Promise<string[]>;
  removePushTokens(tokens: string[]): Promise<void>;
  softUnlink(
    workspaceId: string,
    userSub: string,
    now: Date,
  ): Promise<void>;
  notifyCare(
    workspaceId: string,
    careSummary: string,
    now: Date,
  ): Promise<void>;
  insertIssueToken(row: {
    tokenHash: string;
    workspaceId: string;
    userSub: string;
    expiresAt: Date;
  }): Promise<void>;
  findIssueToken(tokenHash: string): Promise<{
    id: string;
    workspaceId: string;
    userSub: string;
    expiresAt: Date;
    consumedAt: Date | null;
  } | null>;
  consumeIssueToken(id: string, at: Date): Promise<boolean>;
  pruneIssueTokens(now: Date): Promise<number>;
};

export function randomAuthToken(): string {
  return randomBytes(24).toString("base64url");
}

export function randomSerialNumber(): string {
  return `aw-${randomBytes(12).toString("base64url")}`;
}

export function hashIssueToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function createDbAppleWalletStore(): AppleWalletStore {
  return {
    async findSubscriberBySerial(serialNumber) {
      const [row] = await withBypassRls(() =>
        db
          .select()
          .from(appleWalletSubscriber)
          .where(eq(appleWalletSubscriber.serialNumber, serialNumber))
          .limit(1),
      );
      return row
        ? {
            ...row,
            status: row.status as AppleWalletSubscriberStatus,
          }
        : null;
    },

    async findSubscriberByWorkspaceUser(workspaceId, userSub) {
      const [row] = await withBypassRls(() =>
        db
          .select()
          .from(appleWalletSubscriber)
          .where(
            and(
              eq(appleWalletSubscriber.workspaceId, workspaceId),
              eq(appleWalletSubscriber.userSub, userSub),
            ),
          )
          .limit(1),
      );
      return row
        ? {
            ...row,
            status: row.status as AppleWalletSubscriberStatus,
          }
        : null;
    },

    async upsertSubscriberForIssue(args) {
      return withBypassRls(async () =>
        db.transaction(async (tx) => {
          const existing = await tx
            .select()
            .from(appleWalletSubscriber)
            .where(
              and(
                eq(appleWalletSubscriber.workspaceId, args.workspaceId),
                eq(appleWalletSubscriber.userSub, args.userSub),
              ),
            )
            .limit(1);
          let row;
          if (existing[0]) {
            [row] = await tx
              .update(appleWalletSubscriber)
              .set({
                status: "active",
                updatedAt: args.now,
              })
              .where(eq(appleWalletSubscriber.id, existing[0].id))
              .returning();
          } else {
            [row] = await tx
              .insert(appleWalletSubscriber)
              .values({
                workspaceId: args.workspaceId,
                userSub: args.userSub,
                serialNumber: args.serialNumber,
                authToken: args.authToken,
                status: "active",
                createdAt: args.now,
                updatedAt: args.now,
              })
              .returning();
          }
          await tx
            .insert(appleWalletChannelState)
            .values({
              workspaceId: args.workspaceId,
              latestMessage: "",
              latestMessageAt: null,
              updatedAt: args.now,
            })
            .onConflictDoNothing();
          return {
            ...row!,
            status: row!.status as AppleWalletSubscriberStatus,
          };
        }),
      );
    },

    async ensureChannelState(workspaceId, now) {
      await withBypassRls(() =>
        db
          .insert(appleWalletChannelState)
          .values({
            workspaceId,
            latestMessage: "",
            latestMessageAt: null,
            updatedAt: now,
          })
          .onConflictDoNothing(),
      );
    },

    async getChannelLatest(workspaceId) {
      const [row] = await withBypassRls(() =>
        db
          .select({
            latestMessage: appleWalletChannelState.latestMessage,
            updatedAt: appleWalletChannelState.updatedAt,
          })
          .from(appleWalletChannelState)
          .where(eq(appleWalletChannelState.workspaceId, workspaceId))
          .limit(1),
      );
      return row ?? null;
    },

    async registerDevice(args) {
      return withBypassRls(async () =>
        db.transaction(async (tx) => {
          await tx
            .insert(appleWalletDevice)
            .values({
              deviceLibraryId: args.deviceLibraryId,
              pushToken: args.pushToken,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: appleWalletDevice.deviceLibraryId,
              set: {
                pushToken: args.pushToken,
                updatedAt: new Date(),
              },
            });
          const inserted = await tx
            .insert(appleWalletRegistration)
            .values({
              deviceLibraryId: args.deviceLibraryId,
              serialNumber: args.serialNumber,
              passTypeId: args.passTypeId,
            })
            .onConflictDoNothing()
            .returning();
          await tx
            .update(appleWalletSubscriber)
            .set({ status: "active" })
            .where(eq(appleWalletSubscriber.serialNumber, args.serialNumber));
          return inserted.length > 0;
        }),
      );
    },

    async unregisterDevice(deviceLibraryId, serialNumber) {
      await withBypassRls(async () =>
        db.transaction(async (tx) => {
          await tx
            .delete(appleWalletRegistration)
            .where(
              and(
                eq(appleWalletRegistration.deviceLibraryId, deviceLibraryId),
                eq(appleWalletRegistration.serialNumber, serialNumber),
              ),
            );
          const [left] = await tx
            .select({ n: count() })
            .from(appleWalletRegistration)
            .where(eq(appleWalletRegistration.serialNumber, serialNumber));
          if ((left?.n ?? 0) === 0) {
            await tx
              .update(appleWalletSubscriber)
              .set({ status: "removed", updatedAt: new Date() })
              .where(eq(appleWalletSubscriber.serialNumber, serialNumber));
          }
          const [deviceLeft] = await tx
            .select({ n: count() })
            .from(appleWalletRegistration)
            .where(eq(appleWalletRegistration.deviceLibraryId, deviceLibraryId));
          if ((deviceLeft?.n ?? 0) === 0) {
            await tx
              .delete(appleWalletDevice)
              .where(eq(appleWalletDevice.deviceLibraryId, deviceLibraryId));
          }
        }),
      );
    },

    async serialsForDevice(deviceLibraryId, passTypeId, since) {
      return withBypassRls(async () => {
        const conditions = [
          eq(appleWalletRegistration.deviceLibraryId, deviceLibraryId),
          eq(appleWalletRegistration.passTypeId, passTypeId),
          eq(appleWalletSubscriber.status, "active"),
        ];
        if (since) {
          conditions.push(gt(appleWalletSubscriber.updatedAt, since));
        }
        return db
          .select({
            serialNumber: appleWalletSubscriber.serialNumber,
            updatedAt: appleWalletSubscriber.updatedAt,
          })
          .from(appleWalletRegistration)
          .innerJoin(
            appleWalletSubscriber,
            eq(
              appleWalletSubscriber.serialNumber,
              appleWalletRegistration.serialNumber,
            ),
          )
          .where(and(...conditions));
      });
    },

    async countRegistrations(serialNumber) {
      const [row] = await withBypassRls(() =>
        db
          .select({ n: count() })
          .from(appleWalletRegistration)
          .where(eq(appleWalletRegistration.serialNumber, serialNumber)),
      );
      return Number(row?.n ?? 0);
    },

    async pushTokensForWorkspace(workspaceId) {
      const rows = await withBypassRls(() =>
        db
          .selectDistinct({ pushToken: appleWalletDevice.pushToken })
          .from(appleWalletRegistration)
          .innerJoin(
            appleWalletDevice,
            eq(
              appleWalletDevice.deviceLibraryId,
              appleWalletRegistration.deviceLibraryId,
            ),
          )
          .innerJoin(
            appleWalletSubscriber,
            eq(
              appleWalletSubscriber.serialNumber,
              appleWalletRegistration.serialNumber,
            ),
          )
          .where(
            and(
              eq(appleWalletSubscriber.workspaceId, workspaceId),
              eq(appleWalletSubscriber.status, "active"),
            ),
          ),
      );
      return rows.map((r) => r.pushToken);
    },

    async removePushTokens(tokens) {
      if (tokens.length === 0) return;
      await withBypassRls(async () =>
        db.transaction(async (tx) => {
          const devices = await tx
            .select({
              deviceLibraryId: appleWalletDevice.deviceLibraryId,
            })
            .from(appleWalletDevice)
            .where(inArray(appleWalletDevice.pushToken, tokens));
          if (devices.length === 0) return;
          const deviceIds = devices.map((d) => d.deviceLibraryId);
          const regs = await tx
            .select({
              serialNumber: appleWalletRegistration.serialNumber,
            })
            .from(appleWalletRegistration)
            .where(inArray(appleWalletRegistration.deviceLibraryId, deviceIds));
          const serials = [...new Set(regs.map((r) => r.serialNumber))];
          await tx
            .delete(appleWalletDevice)
            .where(inArray(appleWalletDevice.deviceLibraryId, deviceIds));
          for (const serialNumber of serials) {
            const [left] = await tx
              .select({ n: count() })
              .from(appleWalletRegistration)
              .where(eq(appleWalletRegistration.serialNumber, serialNumber));
            if ((left?.n ?? 0) === 0) {
              await tx
                .update(appleWalletSubscriber)
                .set({ status: "removed", updatedAt: new Date() })
                .where(eq(appleWalletSubscriber.serialNumber, serialNumber));
            }
          }
        }),
      );
    },

    async softUnlink(workspaceId, userSub, now) {
      await withBypassRls(async () =>
        db.transaction(async (tx) => {
          const [sub] = await tx
            .select()
            .from(appleWalletSubscriber)
            .where(
              and(
                eq(appleWalletSubscriber.workspaceId, workspaceId),
                eq(appleWalletSubscriber.userSub, userSub),
              ),
            )
            .limit(1);
          if (!sub) return;
          await tx
            .update(appleWalletSubscriber)
            .set({ status: "removed", updatedAt: now })
            .where(eq(appleWalletSubscriber.id, sub.id));
          const regs = await tx
            .select({
              deviceLibraryId: appleWalletRegistration.deviceLibraryId,
            })
            .from(appleWalletRegistration)
            .where(
              eq(appleWalletRegistration.serialNumber, sub.serialNumber),
            );
          await tx
            .delete(appleWalletRegistration)
            .where(
              eq(appleWalletRegistration.serialNumber, sub.serialNumber),
            );
          for (const reg of regs) {
            const [left] = await tx
              .select({ n: count() })
              .from(appleWalletRegistration)
              .where(
                eq(
                  appleWalletRegistration.deviceLibraryId,
                  reg.deviceLibraryId,
                ),
              );
            if ((left?.n ?? 0) === 0) {
              await tx
                .delete(appleWalletDevice)
                .where(
                  eq(appleWalletDevice.deviceLibraryId, reg.deviceLibraryId),
                );
            }
          }
        }),
      );
    },

    async notifyCare(workspaceId, careSummary, now) {
      await withBypassRls(async () =>
        db.transaction(async (tx) => {
          await tx
            .insert(appleWalletChannelState)
            .values({
              workspaceId,
              latestMessage: careSummary,
              latestMessageAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: appleWalletChannelState.workspaceId,
              set: {
                latestMessage: careSummary,
                latestMessageAt: now,
                updatedAt: now,
              },
            });
          await tx
            .update(appleWalletSubscriber)
            .set({ updatedAt: now })
            .where(
              and(
                eq(appleWalletSubscriber.workspaceId, workspaceId),
                eq(appleWalletSubscriber.status, "active"),
              ),
            );
        }),
      );
    },

    async insertIssueToken(row) {
      await withBypassRls(() =>
        db.insert(appleWalletIssueToken).values(row),
      );
    },

    async findIssueToken(tokenHash) {
      const [row] = await withBypassRls(() =>
        db
          .select({
            id: appleWalletIssueToken.id,
            workspaceId: appleWalletIssueToken.workspaceId,
            userSub: appleWalletIssueToken.userSub,
            expiresAt: appleWalletIssueToken.expiresAt,
            consumedAt: appleWalletIssueToken.consumedAt,
          })
          .from(appleWalletIssueToken)
          .where(eq(appleWalletIssueToken.tokenHash, tokenHash))
          .limit(1),
      );
      return row ?? null;
    },

    async consumeIssueToken(id, at) {
      return withBypassRls(async () => {
        const updated = await db
          .update(appleWalletIssueToken)
          .set({ consumedAt: at })
          .where(
            and(
              eq(appleWalletIssueToken.id, id),
              sql`${appleWalletIssueToken.consumedAt} is null`,
            ),
          )
          .returning({ id: appleWalletIssueToken.id });
        return updated.length > 0;
      });
    },

    async pruneIssueTokens(now) {
      return withBypassRls(async () => {
        const result = await db
          .delete(appleWalletIssueToken)
          .where(
            or(
              lte(appleWalletIssueToken.expiresAt, now),
              isNotNull(appleWalletIssueToken.consumedAt),
            ),
          )
          .returning({ id: appleWalletIssueToken.id });
        return result.length;
      });
    },
  };
}
