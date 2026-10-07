import { randomUUID } from "node:crypto";
import type {
  AppleWalletStore,
  AppleWalletSubscriberRow,
} from "@/lib/apple-wallet/store";
import type { AppleWalletSubscriberStatus } from "@/db/schema/apple-wallet";

/** In-memory Apple Wallet store for unit tests (no Postgres). */
export function createMemoryAppleWalletStore(): AppleWalletStore & {
  subscribers: Map<string, AppleWalletSubscriberRow>;
  devices: Map<string, { pushToken: string; updatedAt: Date }>;
  registrations: Map<
    string,
    { deviceLibraryId: string; serialNumber: string; passTypeId: string }
  >;
  channel: Map<string, { latestMessage: string; updatedAt: Date }>;
  issueTokens: Map<
    string,
    {
      id: string;
      tokenHash: string;
      workspaceId: string;
      userSub: string;
      expiresAt: Date;
      consumedAt: Date | null;
    }
  >;
} {
  const subscribers = new Map<string, AppleWalletSubscriberRow>();
  const byWsUser = new Map<string, string>();
  const devices = new Map<string, { pushToken: string; updatedAt: Date }>();
  const registrations = new Map<
    string,
    { deviceLibraryId: string; serialNumber: string; passTypeId: string }
  >();
  const channel = new Map<string, { latestMessage: string; updatedAt: Date }>();
  const issueTokens = new Map<
    string,
    {
      id: string;
      tokenHash: string;
      workspaceId: string;
      userSub: string;
      expiresAt: Date;
      consumedAt: Date | null;
    }
  >();

  const wsUserKey = (ws: string, user: string) => `${ws}:${user}`;
  const regKey = (device: string, serial: string) => `${device}:${serial}`;

  const store: AppleWalletStore & {
    subscribers: typeof subscribers;
    devices: typeof devices;
    registrations: typeof registrations;
    channel: typeof channel;
    issueTokens: typeof issueTokens;
  } = {
    subscribers,
    devices,
    registrations,
    channel,
    issueTokens,

    async findSubscriberBySerial(serialNumber) {
      for (const row of subscribers.values()) {
        if (row.serialNumber === serialNumber) return row;
      }
      return null;
    },

    async findSubscriberByWorkspaceUser(workspaceId, userSub) {
      const id = byWsUser.get(wsUserKey(workspaceId, userSub));
      return id ? (subscribers.get(id) ?? null) : null;
    },

    async upsertSubscriberForIssue(args) {
      const key = wsUserKey(args.workspaceId, args.userSub);
      const existingId = byWsUser.get(key);
      let row: AppleWalletSubscriberRow;
      if (existingId) {
        const prev = subscribers.get(existingId)!;
        row = {
          ...prev,
          status: "active",
          updatedAt: args.now,
        };
        subscribers.set(existingId, row);
      } else {
        const id = randomUUID();
        row = {
          id,
          workspaceId: args.workspaceId,
          userSub: args.userSub,
          serialNumber: args.serialNumber,
          authToken: args.authToken,
          status: "active",
          createdAt: args.now,
          updatedAt: args.now,
        };
        subscribers.set(id, row);
        byWsUser.set(key, id);
      }
      // Same logical tx as DB store: ensure channel_state with the upsert.
      if (!channel.has(args.workspaceId)) {
        channel.set(args.workspaceId, {
          latestMessage: "",
          updatedAt: args.now,
        });
      }
      return row;
    },

    async ensureChannelState(workspaceId, now) {
      if (!channel.has(workspaceId)) {
        channel.set(workspaceId, { latestMessage: "", updatedAt: now });
      }
    },

    async getChannelLatest(workspaceId) {
      return channel.get(workspaceId) ?? null;
    },

    async registerDevice(args) {
      devices.set(args.deviceLibraryId, {
        pushToken: args.pushToken,
        updatedAt: new Date(),
      });
      const key = regKey(args.deviceLibraryId, args.serialNumber);
      const created = !registrations.has(key);
      if (created) {
        registrations.set(key, {
          deviceLibraryId: args.deviceLibraryId,
          serialNumber: args.serialNumber,
          passTypeId: args.passTypeId,
        });
      }
      for (const [id, sub] of subscribers) {
        if (sub.serialNumber === args.serialNumber) {
          subscribers.set(id, { ...sub, status: "active" });
        }
      }
      return created;
    },

    async unregisterDevice(deviceLibraryId, serialNumber) {
      registrations.delete(regKey(deviceLibraryId, serialNumber));
      let serialLeft = 0;
      let deviceLeft = 0;
      for (const reg of registrations.values()) {
        if (reg.serialNumber === serialNumber) serialLeft += 1;
        if (reg.deviceLibraryId === deviceLibraryId) deviceLeft += 1;
      }
      if (serialLeft === 0) {
        for (const [id, sub] of subscribers) {
          if (sub.serialNumber === serialNumber) {
            subscribers.set(id, {
              ...sub,
              status: "removed" as AppleWalletSubscriberStatus,
              updatedAt: new Date(),
            });
          }
        }
      }
      if (deviceLeft === 0) devices.delete(deviceLibraryId);
    },

    async serialsForDevice(deviceLibraryId, passTypeId, since) {
      const out: { serialNumber: string; updatedAt: Date }[] = [];
      for (const reg of registrations.values()) {
        if (
          reg.deviceLibraryId !== deviceLibraryId ||
          reg.passTypeId !== passTypeId
        ) {
          continue;
        }
        const sub = [...subscribers.values()].find(
          (s) => s.serialNumber === reg.serialNumber,
        );
        if (!sub || sub.status !== "active") continue;
        if (since && !(sub.updatedAt > since)) continue;
        out.push({ serialNumber: sub.serialNumber, updatedAt: sub.updatedAt });
      }
      return out;
    },

    async countRegistrations(serialNumber) {
      let n = 0;
      for (const reg of registrations.values()) {
        if (reg.serialNumber === serialNumber) n += 1;
      }
      return n;
    },

    async pushTokensForWorkspace(workspaceId) {
      const tokens = new Set<string>();
      for (const reg of registrations.values()) {
        const sub = [...subscribers.values()].find(
          (s) => s.serialNumber === reg.serialNumber,
        );
        if (!sub || sub.workspaceId !== workspaceId || sub.status !== "active") {
          continue;
        }
        const device = devices.get(reg.deviceLibraryId);
        if (device) tokens.add(device.pushToken);
      }
      return [...tokens];
    },

    async removePushTokens(tokens) {
      const set = new Set(tokens);
      const affectedSerials = new Set<string>();
      for (const [id, device] of [...devices.entries()]) {
        if (!set.has(device.pushToken)) continue;
        devices.delete(id);
        for (const [key, reg] of [...registrations.entries()]) {
          if (reg.deviceLibraryId === id) {
            affectedSerials.add(reg.serialNumber);
            registrations.delete(key);
          }
        }
      }
      for (const serialNumber of affectedSerials) {
        let left = 0;
        for (const reg of registrations.values()) {
          if (reg.serialNumber === serialNumber) left += 1;
        }
        if (left === 0) {
          for (const [id, sub] of subscribers) {
            if (sub.serialNumber === serialNumber) {
              subscribers.set(id, {
                ...sub,
                status: "removed" as AppleWalletSubscriberStatus,
                updatedAt: new Date(),
              });
            }
          }
        }
      }
    },

    async softUnlink(workspaceId, userSub, now) {
      const id = byWsUser.get(wsUserKey(workspaceId, userSub));
      if (!id) return;
      const sub = subscribers.get(id);
      if (!sub) return;
      subscribers.set(id, { ...sub, status: "removed", updatedAt: now });
      const deviceIds = new Set<string>();
      for (const [key, reg] of [...registrations.entries()]) {
        if (reg.serialNumber === sub.serialNumber) {
          deviceIds.add(reg.deviceLibraryId);
          registrations.delete(key);
        }
      }
      for (const deviceId of deviceIds) {
        let left = 0;
        for (const reg of registrations.values()) {
          if (reg.deviceLibraryId === deviceId) left += 1;
        }
        if (left === 0) devices.delete(deviceId);
      }
    },

    async notifyCare(workspaceId, careSummary, now) {
      channel.set(workspaceId, { latestMessage: careSummary, updatedAt: now });
      for (const [id, sub] of subscribers) {
        if (sub.workspaceId === workspaceId && sub.status === "active") {
          subscribers.set(id, { ...sub, updatedAt: now });
        }
      }
    },

    async insertIssueToken(row) {
      const id = randomUUID();
      issueTokens.set(row.tokenHash, {
        id,
        tokenHash: row.tokenHash,
        workspaceId: row.workspaceId,
        userSub: row.userSub,
        expiresAt: row.expiresAt,
        consumedAt: null,
      });
    },

    async findIssueToken(tokenHash) {
      const row = issueTokens.get(tokenHash);
      if (!row) return null;
      return {
        id: row.id,
        workspaceId: row.workspaceId,
        userSub: row.userSub,
        expiresAt: row.expiresAt,
        consumedAt: row.consumedAt,
      };
    },

    async consumeIssueToken(id, at) {
      for (const [hash, row] of issueTokens) {
        if (row.id === id) {
          if (row.consumedAt) return false;
          issueTokens.set(hash, { ...row, consumedAt: at });
          return true;
        }
      }
      return false;
    },

    async pruneIssueTokens(now) {
      let n = 0;
      for (const [hash, row] of [...issueTokens.entries()]) {
        if (row.expiresAt.getTime() <= now.getTime() || row.consumedAt) {
          issueTokens.delete(hash);
          n += 1;
        }
      }
      return n;
    },
  };

  return store;
}
