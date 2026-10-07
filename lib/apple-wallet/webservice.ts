import { timingSafeEqual } from "node:crypto";
import type { AppleWalletConfig } from "@/lib/apple-wallet/config";
import { buildApplePass } from "@/lib/apple-wallet/pass";
import type { AppleWalletStore } from "@/lib/apple-wallet/store";

export type WsResponse = {
  status: number;
  body?: string | Buffer;
  headers?: Record<string, string>;
};

export type AppleWebServiceDeps = {
  apple: Pick<AppleWalletConfig, "passTypeId" | "teamId" | "baseUrl"> &
    Partial<AppleWalletConfig>;
  store: AppleWalletStore;
  buildPass?: (
    subscriber: {
      serialNumber: string;
      authToken: string;
      workspaceId: string;
    },
    latestMessage: string,
  ) => Promise<Buffer>;
  log?: (message: string) => void;
};

const json = (status: number, data: unknown): WsResponse => ({
  status,
  body: JSON.stringify(data),
  headers: { "content-type": "application/json" },
});

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function tokenFrom(authorization: string | null): string | null {
  const match = authorization?.match(/^ApplePass\s+(.+)$/);
  return match ? match[1]!.trim() : null;
}

/** HTTP dates have 1s precision. */
function toHttpSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function createAppleWebService(deps: AppleWebServiceDeps) {
  const { apple, store } = deps;
  const log = deps.log ?? ((m: string) => console.info(`[apple-wallet] ${m}`));

  async function authorize(
    passTypeId: string,
    serial: string,
    authorization: string | null,
    opts: { requireActive?: boolean } = {},
  ) {
    if (passTypeId !== apple.passTypeId) return null;
    const token = tokenFrom(authorization);
    if (!token) return null;
    const subscriber = await store.findSubscriberBySerial(serial);
    if (!subscriber) return null;
    if (!safeEqual(subscriber.authToken, token)) return null;
    if (opts.requireActive !== false && subscriber.status !== "active") {
      return null;
    }
    return subscriber;
  }

  async function defaultBuildPass(
    subscriber: {
      serialNumber: string;
      authToken: string;
      workspaceId: string;
    },
    latestMessage: string,
  ): Promise<Buffer> {
    if (deps.buildPass) {
      return deps.buildPass(subscriber, latestMessage);
    }
    const full = apple as AppleWalletConfig;
    return buildApplePass({
      config: full,
      serialNumber: subscriber.serialNumber,
      authToken: subscriber.authToken,
      latestMessage,
    });
  }

  return {
    async register(args: {
      deviceLibraryId: string;
      passTypeId: string;
      serialNumber: string;
      authorization: string | null;
      body: unknown;
    }): Promise<WsResponse> {
      const subscriber = await authorize(
        args.passTypeId,
        args.serialNumber,
        args.authorization,
      );
      if (!subscriber) return { status: 401 };
      const pushToken = (args.body as { pushToken?: unknown } | null)?.pushToken;
      if (
        typeof pushToken !== "string" ||
        !/^[0-9a-fA-F]{16,200}$/.test(pushToken)
      ) {
        return { status: 400 };
      }
      const created = await store.registerDevice({
        deviceLibraryId: args.deviceLibraryId,
        pushToken,
        serialNumber: args.serialNumber,
        passTypeId: args.passTypeId,
      });
      return { status: created ? 201 : 200 };
    },

    async unregister(args: {
      deviceLibraryId: string;
      passTypeId: string;
      serialNumber: string;
      authorization: string | null;
    }): Promise<WsResponse> {
      // Token match only (allow removed) so Apple can retry unregister → 200.
      const subscriber = await authorize(
        args.passTypeId,
        args.serialNumber,
        args.authorization,
        { requireActive: false },
      );
      if (!subscriber) return { status: 401 };
      await store.unregisterDevice(args.deviceLibraryId, args.serialNumber);
      return { status: 200 };
    },

    async listUpdated(args: {
      deviceLibraryId: string;
      passTypeId: string;
      passesUpdatedSince: string | null;
    }): Promise<WsResponse> {
      if (args.passTypeId !== apple.passTypeId) return { status: 404 };
      let since: Date | undefined;
      if (args.passesUpdatedSince) {
        const ms = Number(args.passesUpdatedSince);
        if (Number.isFinite(ms)) since = new Date(ms);
      }
      const rows = await store.serialsForDevice(
        args.deviceLibraryId,
        args.passTypeId,
        since,
      );
      if (rows.length === 0) return { status: 204 };
      const lastUpdated = Math.max(...rows.map((r) => r.updatedAt.getTime()));
      return json(200, {
        serialNumbers: rows.map((r) => r.serialNumber),
        lastUpdated: String(lastUpdated),
      });
    },

    async getPass(args: {
      passTypeId: string;
      serialNumber: string;
      authorization: string | null;
      ifModifiedSince: string | null;
    }): Promise<WsResponse> {
      const token = tokenFrom(args.authorization);
      if (!token) return { status: 401 };

      const subscriber = await store.findSubscriberBySerial(args.serialNumber);
      if (!subscriber) {
        // Unknown serial after we have some auth shape — still 401 if token
        // cannot be checked; WalletCast returns null from authorize → 401.
        // Design: 404 only if serial unknown after auth succeeds.
        // Without a row we cannot verify token → 401.
        return { status: 401 };
      }
      if (args.passTypeId !== apple.passTypeId) return { status: 401 };
      if (!safeEqual(subscriber.authToken, token)) return { status: 401 };
      if (subscriber.status !== "active") return { status: 401 };

      const channel = await store.getChannelLatest(subscriber.workspaceId);
      if (!channel) return { status: 404 };

      const lastModified = new Date(
        Math.max(subscriber.updatedAt.getTime(), channel.updatedAt.getTime()),
      );
      if (args.ifModifiedSince) {
        const since = new Date(args.ifModifiedSince);
        if (
          !Number.isNaN(since.getTime()) &&
          toHttpSeconds(lastModified) <= toHttpSeconds(since)
        ) {
          return { status: 304 };
        }
      }

      const pass = await defaultBuildPass(subscriber, channel.latestMessage);
      return {
        status: 200,
        body: pass,
        headers: {
          "content-type": "application/vnd.apple.pkpass",
          "last-modified": lastModified.toUTCString(),
          "cache-control": "no-cache",
        },
      };
    },

    async log(body: unknown): Promise<WsResponse> {
      const logs = (body as { logs?: unknown } | null)?.logs;
      if (Array.isArray(logs)) {
        for (const entry of logs.slice(0, 20)) {
          log(String(entry).slice(0, 500));
        }
      }
      return { status: 200 };
    },
  };
}

export type AppleWebService = ReturnType<typeof createAppleWebService>;
