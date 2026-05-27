import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  apiToken,
  type ApiTokenScope,
} from "@/db/schema/api-token";
import { assertWorkspaceMember } from "@/lib/workspace-context";
import { getWorkspaceIdForUser } from "@/lib/workspace";
import { isDbUnreachable } from "@/lib/db-errors";

const scryptAsync = promisify(scrypt);

export const API_TOKEN_PREFIX = "mny_";
export const API_TOKEN_PREFIX_LENGTH = 12;

export type RequestAuthMethod = "session" | "api_key";

export type ResolvedRequestAuth =
  | {
      method: "session";
      userSub: string;
      workspaceId: null;
      apiTokenId: null;
      scopes: null;
    }
  | {
      method: "api_key";
      userSub: string;
      workspaceId: string;
      apiTokenId: string;
      scopes: ApiTokenScope[];
    }
  | {
      method: null;
      userSub: null;
      workspaceId: null;
      apiTokenId: null;
      scopes: null;
    };

function parseBearerToken(request?: Request): string | null {
  if (!request) return null;
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? null;
}

export function isApiTokenSecret(value: string): boolean {
  return value.startsWith(API_TOKEN_PREFIX) && value.length > API_TOKEN_PREFIX_LENGTH;
}

function tokenPrefix(secret: string): string {
  return secret.slice(0, API_TOKEN_PREFIX_LENGTH);
}

async function hashApiToken(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(secret, salt, 64)) as Buffer;
  return `scrypt:N=16384,r=8,p=1:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

async function verifyApiTokenHash(secret: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts[0] !== "scrypt") return false;
  const hasParams = parts.length === 4;
  if (!hasParams && parts.length !== 3) return false;
  const salt = Buffer.from(parts[hasParams ? 2 : 1]!, "base64url");
  const expected = Buffer.from(parts[hasParams ? 3 : 2]!, "base64url");
  const derived = (await scryptAsync(secret, salt, 64)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function generateApiTokenSecret(): Promise<string> {
  const body = randomBytes(32).toString("base64url");
  return `${API_TOKEN_PREFIX}${body}`;
}

export async function hashApiTokenForStorage(secret: string): Promise<string> {
  return hashApiToken(secret);
}

type ApiTokenRow = {
  id: string;
  userSub: string;
  workspaceId: string;
  scopes: ApiTokenScope[];
};

async function findActiveTokenBySecret(
  secret: string,
): Promise<ApiTokenRow | null> {
  if (!isApiTokenSecret(secret)) return null;
  const prefix = tokenPrefix(secret);

  const rows = await db
    .select({
      id: apiToken.id,
      userSub: apiToken.userSub,
      workspaceId: apiToken.workspaceId,
      keyHash: apiToken.keyHash,
      scopes: apiToken.scopes,
      expiresAt: apiToken.expiresAt,
      revokedAt: apiToken.revokedAt,
    })
    .from(apiToken)
    .where(
      and(
        eq(apiToken.keyPrefix, prefix),
        isNull(apiToken.revokedAt),
        or(
          isNull(apiToken.expiresAt),
          sql`${apiToken.expiresAt} > now()`,
        ),
      ),
    );

  for (const row of rows) {
    const ok = await verifyApiTokenHash(secret, row.keyHash);
    if (!ok) continue;
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) continue;
    return {
      id: row.id,
      userSub: row.userSub,
      workspaceId: row.workspaceId,
      scopes: row.scopes,
    };
  }
  return null;
}

function touchApiTokenLastUsed(tokenId: string): void {
  void db
    .update(apiToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiToken.id, tokenId))
    .catch(() => {
      /* best-effort */
    });
}

export async function resolveRequestAuth(
  request?: Request,
): Promise<ResolvedRequestAuth> {
  const bearer = parseBearerToken(request);
  if (bearer && isApiTokenSecret(bearer)) {
    try {
      const row = await findActiveTokenBySecret(bearer);
      if (!row) {
        return {
          method: null,
          userSub: null,
          workspaceId: null,
          apiTokenId: null,
          scopes: null,
        };
      }
      touchApiTokenLastUsed(row.id);
      return {
        method: "api_key",
        userSub: row.userSub,
        workspaceId: row.workspaceId,
        apiTokenId: row.id,
        scopes: row.scopes,
      };
    } catch (e) {
      if (isDbUnreachable(e)) throw e;
      return {
        method: null,
        userSub: null,
        workspaceId: null,
        apiTokenId: null,
        scopes: null,
      };
    }
  }

  const session = await auth();
  const userSub = session?.user?.id ?? null;
  if (!userSub) {
    return {
      method: null,
      userSub: null,
      workspaceId: null,
      apiTokenId: null,
      scopes: null,
    };
  }

  return {
    method: "session",
    userSub,
    workspaceId: null,
    apiTokenId: null,
    scopes: null,
  };
}

export async function resolveSessionUserSub(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function hasWriteScope(scopes: ApiTokenScope[] | null): boolean {
  if (!scopes) return true;
  return scopes.includes("write");
}

export async function resolveMoneyWorkspaceId(
  auth: ResolvedRequestAuth,
): Promise<string | null> {
  if (!auth.userSub) return null;

  if (auth.method === "api_key" && auth.workspaceId) {
    return auth.workspaceId;
  }

  try {
    return await getWorkspaceIdForUser(auth.userSub);
  } catch {
    return null;
  }
}

export async function verifyMoneyWorkspaceAccess(
  auth: ResolvedRequestAuth,
  workspaceId: string,
): Promise<boolean> {
  if (!auth.userSub) return false;
  try {
    return await assertWorkspaceMember(auth.userSub, workspaceId);
  } catch {
    return false;
  }
}

/** Stable fingerprint for logs (never log full secrets). */
export function apiTokenLogFingerprint(secret: string): string {
  const key = process.env.AUTH_SECRET ?? "dev-local-fingerprint-key";
  return createHmac("sha256", key).update(secret).digest("hex").slice(0, 8);
}
