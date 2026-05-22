import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiToken, type ApiTokenScope } from "@/db/schema/api-token";
import {
  generateApiTokenSecret,
  hashApiTokenForStorage,
  API_TOKEN_PREFIX_LENGTH,
} from "@/lib/api-auth";
import { assertWorkspaceMember } from "@/lib/workspace-context";

export type ApiTokenListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  workspaceId: string;
  appKey: string;
  scopes: ApiTokenScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

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
      scopes: apiToken.scopes,
      lastUsedAt: apiToken.lastUsedAt,
      expiresAt: apiToken.expiresAt,
      createdAt: apiToken.createdAt,
    })
    .from(apiToken)
    .where(and(eq(apiToken.userSub, userSub), isNull(apiToken.revokedAt)))
    .orderBy(desc(apiToken.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    workspaceId: r.workspaceId,
    appKey: r.appKey,
    scopes: r.scopes,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createApiTokenForUser(
  userSub: string,
  input: {
    name: string;
    workspaceId: string;
    scopes: ApiTokenScope[];
    expiresAt: Date | null;
  },
): Promise<{ token: string; item: ApiTokenListItem }> {
  const member = await assertWorkspaceMember(userSub, input.workspaceId);
  if (!member) {
    throw new Error("FORBIDDEN");
  }

  const secret = await generateApiTokenSecret();
  const keyHash = await hashApiTokenForStorage(secret);
  const keyPrefix = secret.slice(0, API_TOKEN_PREFIX_LENGTH);

  const [row] = await db
    .insert(apiToken)
    .values({
      userSub,
      workspaceId: input.workspaceId,
      appKey: "money",
      name: input.name,
      keyPrefix,
      keyHash,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
    })
    .returning({
      id: apiToken.id,
      name: apiToken.name,
      keyPrefix: apiToken.keyPrefix,
      workspaceId: apiToken.workspaceId,
      appKey: apiToken.appKey,
      scopes: apiToken.scopes,
      lastUsedAt: apiToken.lastUsedAt,
      expiresAt: apiToken.expiresAt,
      createdAt: apiToken.createdAt,
    });

  if (!row) throw new Error("Failed to create token");

  return {
    token: secret,
    item: {
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      workspaceId: row.workspaceId,
      appKey: row.appKey,
      scopes: row.scopes,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    },
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

  return result.length > 0;
}
