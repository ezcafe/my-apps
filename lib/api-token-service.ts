import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiToken, type ApiTokenScope } from "@/db/schema/api-token";
import {
  generateApiTokenSecret,
  hashApiTokenForStorage,
  apiTokenLookupHash,
  API_TOKEN_PREFIX_LENGTH,
} from "@/lib/api-auth";
import {
  normalizeTokenAppsInput,
  primaryAppKeyForTokenApps,
  resolveTokenApps,
} from "@/lib/api-token-grants";
import { writeAuditEvent } from "@/lib/audit-log";
import { assertWorkspaceAppAccess } from "@/lib/workspace-app-access";
import type { ShareableWorkspaceAppKey } from "@/lib/workspace-shareable-apps";

export type ApiTokenListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  workspaceId: string;
  appKey: string;
  apps: ShareableWorkspaceAppKey[];
  scopes: ApiTokenScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

function toListItem(r: {
  id: string;
  name: string;
  keyPrefix: string;
  workspaceId: string;
  appKey: string;
  apps: ShareableWorkspaceAppKey[] | null;
  scopes: ApiTokenScope[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}): ApiTokenListItem {
  return {
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    workspaceId: r.workspaceId,
    appKey: r.appKey,
    apps: resolveTokenApps({ appKey: r.appKey, apps: r.apps }),
    scopes: r.scopes,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listApiTokensForUser(
  userSub: string,
): Promise<ApiTokenListItem[]> {
  const rows = await db
    .select({
      id: apiToken.id,
      name: apiToken.name,
      keyPrefix: apiToken.keyPrefix,
      workspaceId: apiToken.workspaceId,
      appKey: apiToken.appKey,
      apps: apiToken.apps,
      scopes: apiToken.scopes,
      lastUsedAt: apiToken.lastUsedAt,
      expiresAt: apiToken.expiresAt,
      createdAt: apiToken.createdAt,
    })
    .from(apiToken)
    .where(and(eq(apiToken.userSub, userSub), isNull(apiToken.revokedAt)))
    .orderBy(desc(apiToken.createdAt));

  return rows.map(toListItem);
}

export async function createApiTokenForUser(
  userSub: string,
  input: {
    name: string;
    workspaceId: string;
    apps?: ShareableWorkspaceAppKey[];
    /** Legacy single-app body field. */
    appKey?: string;
    scopes: ApiTokenScope[];
    expiresAt: Date | null;
  },
): Promise<{ token: string; item: ApiTokenListItem }> {
  const apps = normalizeTokenAppsInput(input.apps, input.appKey);

  for (const app of apps) {
    const member = await assertWorkspaceAppAccess(
      userSub,
      input.workspaceId,
      app,
    );
    if (!member) {
      throw new Error("FORBIDDEN");
    }
  }

  const storedAppKey = primaryAppKeyForTokenApps(apps);
  const secret = await generateApiTokenSecret(storedAppKey);
  const keyHash = await hashApiTokenForStorage(secret);
  const keyPrefix = secret.slice(0, API_TOKEN_PREFIX_LENGTH);
  const keyLookup = apiTokenLookupHash(secret);

  const [row] = await db
    .insert(apiToken)
    .values({
      userSub,
      workspaceId: input.workspaceId,
      appKey: storedAppKey,
      apps,
      name: input.name,
      keyPrefix,
      keyHash,
      keyLookup,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
    })
    .returning({
      id: apiToken.id,
      name: apiToken.name,
      keyPrefix: apiToken.keyPrefix,
      workspaceId: apiToken.workspaceId,
      appKey: apiToken.appKey,
      apps: apiToken.apps,
      scopes: apiToken.scopes,
      lastUsedAt: apiToken.lastUsedAt,
      expiresAt: apiToken.expiresAt,
      createdAt: apiToken.createdAt,
    });

  if (!row) throw new Error("Failed to create token");
  await writeAuditEvent({
    action: "api_token.created",
    userSub,
    workspaceId: row.workspaceId,
    detail: { tokenId: row.id, scopes: row.scopes, apps },
  });

  return {
    token: secret,
    item: toListItem(row),
  };
}

export async function revokeApiTokenForUser(
  userSub: string,
  tokenId: string,
): Promise<boolean> {
  const result = await db
    .update(apiToken)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiToken.id, tokenId),
        eq(apiToken.userSub, userSub),
        isNull(apiToken.revokedAt),
      ),
    )
    .returning({ id: apiToken.id });

  const ok = result.length > 0;
  if (ok) {
    await writeAuditEvent({
      action: "api_token.revoked",
      userSub,
      detail: { tokenId },
    });
  }
  return ok;
}
