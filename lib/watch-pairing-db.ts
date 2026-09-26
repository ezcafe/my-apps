import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import type { ApiTokenScope } from "@/db/schema/api-token";
import { watchPairingCode } from "@/db/schema/watch-pairing-code";
import { createApiTokenForUser } from "@/lib/api-token-service";
import { assertWorkspaceAppAccess } from "@/lib/workspace-app-access";
import { fetchWorkspacesForUser } from "@/lib/workspace-list";
import type { ShareableWorkspaceAppKey } from "@/lib/workspace-shareable-apps";
import {
  WatchPairError,
  generateWatchPairCode,
  publicAppOrigin,
} from "@/lib/watch-pairing-codes";
import {
  mintWatchPairingCode,
  redeemWatchPairingCode,
  type MintPairInput,
  type WatchPairingDeps,
} from "@/lib/watch-pairing-service";

async function defaultResolveWorkspaceId(
  userSub: string,
  workspaceId: string | undefined,
  apps: ShareableWorkspaceAppKey[],
): Promise<string> {
  if (workspaceId) return workspaceId;
  const listApp: ShareableWorkspaceAppKey = apps.includes("money")
    ? "money"
    : apps[0] ?? "baby";
  const { workspaces, defaultWorkspaceId } = await fetchWorkspacesForUser(
    userSub,
    listApp,
  );
  if (
    defaultWorkspaceId &&
    workspaces.some((w) => w.id === defaultWorkspaceId)
  ) {
    return defaultWorkspaceId;
  }
  const first = workspaces[0]?.id;
  if (!first) {
    throw new WatchPairError("FORBIDDEN", "No workspace for selected apps");
  }
  return first;
}

export function defaultWatchPairingDeps(): WatchPairingDeps {
  return {
    now: () => new Date(),
    resolveWorkspaceId: defaultResolveWorkspaceId,
    assertAppAccess: async (userSub, workspaceId, apps) => {
      for (const app of apps) {
        const m = await assertWorkspaceAppAccess(userSub, workspaceId, app);
        if (!m) return false;
      }
      return apps.length > 0;
    },
    invalidatePriorCodes: async (userSub) => {
      await db
        .update(watchPairingCode)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(watchPairingCode.userSub, userSub),
            isNull(watchPairingCode.consumedAt),
          ),
        );
    },
    insertCode: async (row) => {
      await db.insert(watchPairingCode).values(row);
    },
    findByHash: async (codeHash) => {
      const [row] = await db
        .select({
          id: watchPairingCode.id,
          userSub: watchPairingCode.userSub,
          workspaceId: watchPairingCode.workspaceId,
          apps: watchPairingCode.apps,
          scopes: watchPairingCode.scopes,
          expiresAt: watchPairingCode.expiresAt,
          consumedAt: watchPairingCode.consumedAt,
        })
        .from(watchPairingCode)
        .where(eq(watchPairingCode.codeHash, codeHash))
        .limit(1);
      if (!row) return null;
      return {
        ...row,
        apps: row.apps as ShareableWorkspaceAppKey[],
        scopes: row.scopes as ApiTokenScope[],
      };
    },
    markConsumed: async (id, at) => {
      const result = await db
        .update(watchPairingCode)
        .set({ consumedAt: at })
        .where(
          and(eq(watchPairingCode.id, id), isNull(watchPairingCode.consumedAt)),
        )
        .returning({ id: watchPairingCode.id });
      return result.length > 0;
    },
    createWatchToken: async (userSub, workspaceId, apps, scopes, name) => {
      const { token, item } = await createApiTokenForUser(userSub, {
        name,
        workspaceId,
        apps,
        scopes,
        expiresAt: null,
      });
      return { token, tokenId: item.id };
    },
    publicOrigin: publicAppOrigin,
    generateCode: () => generateWatchPairCode(),
  };
}

export async function mintWatchPairingCodeForUser(
  userSub: string,
  input: MintPairInput,
) {
  return mintWatchPairingCode(userSub, input, defaultWatchPairingDeps());
}

export async function redeemWatchPairingCodeLive(rawCode: string) {
  return redeemWatchPairingCode(rawCode, defaultWatchPairingDeps());
}
