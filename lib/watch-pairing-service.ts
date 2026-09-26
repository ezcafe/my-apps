import type { ApiTokenScope } from "@/db/schema/api-token";
import type { ShareableWorkspaceAppKey } from "@/lib/workspace-shareable-apps";
import {
  WATCH_PAIR_TTL_MS,
  WatchPairError,
  formatApiPairingTokenName,
  hashWatchPairCode,
  isValidWatchPairCodeShape,
  normalizeWatchPairCode,
} from "@/lib/watch-pairing-codes";

export type MintPairResult = {
  code: string;
  expiresAt: string;
};

export type RedeemPairResult = {
  baseURL: string;
  token: string;
};

export type MintPairInput = {
  workspaceId?: string;
  apps: ShareableWorkspaceAppKey[];
  scopes?: ApiTokenScope[];
};

export type WatchPairingDeps = {
  now: () => Date;
  resolveWorkspaceId: (
    userSub: string,
    workspaceId: string | undefined,
    apps: ShareableWorkspaceAppKey[],
  ) => Promise<string>;
  assertAppAccess: (
    userSub: string,
    workspaceId: string,
    apps: ShareableWorkspaceAppKey[],
  ) => Promise<boolean>;
  invalidatePriorCodes: (userSub: string) => Promise<void>;
  insertCode: (row: {
    userSub: string;
    workspaceId: string;
    codeHash: string;
    apps: ShareableWorkspaceAppKey[];
    scopes: ApiTokenScope[];
    expiresAt: Date;
  }) => Promise<void>;
  findByHash: (codeHash: string) => Promise<{
    id: string;
    userSub: string;
    workspaceId: string;
    apps: ShareableWorkspaceAppKey[];
    scopes: ApiTokenScope[];
    expiresAt: Date;
    consumedAt: Date | null;
  } | null>;
  markConsumed: (id: string, at: Date) => Promise<boolean>;
  createWatchToken: (
    userSub: string,
    workspaceId: string,
    apps: ShareableWorkspaceAppKey[],
    scopes: ApiTokenScope[],
    name: string,
  ) => Promise<{ token: string; tokenId: string }>;
  publicOrigin: () => string;
  generateCode: () => string;
};

export async function mintWatchPairingCode(
  userSub: string,
  input: MintPairInput,
  deps: WatchPairingDeps,
): Promise<MintPairResult> {
  const apps = input.apps;
  if (!apps.length) {
    throw new WatchPairError("BAD_REQUEST", "Select at least one app");
  }
  const scopes: ApiTokenScope[] =
    input.scopes && input.scopes.length > 0
      ? input.scopes
      : ["read", "write"];

  const workspaceId = await deps.resolveWorkspaceId(
    userSub,
    input.workspaceId,
    apps,
  );
  const ok = await deps.assertAppAccess(userSub, workspaceId, apps);
  if (!ok) throw new WatchPairError("FORBIDDEN", "App access required");

  await deps.invalidatePriorCodes(userSub);

  const code = deps.generateCode();
  const normalized = normalizeWatchPairCode(code);
  const expiresAt = new Date(deps.now().getTime() + WATCH_PAIR_TTL_MS);
  await deps.insertCode({
    userSub,
    workspaceId,
    codeHash: hashWatchPairCode(normalized),
    apps,
    scopes,
    expiresAt,
  });

  return { code: normalized, expiresAt: expiresAt.toISOString() };
}

export async function redeemWatchPairingCode(
  rawCode: string,
  deps: WatchPairingDeps,
): Promise<RedeemPairResult> {
  const normalized = normalizeWatchPairCode(rawCode);
  if (!normalized || !isValidWatchPairCodeShape(normalized)) {
    throw new WatchPairError("BAD_REQUEST", "Invalid pairing code");
  }

  const row = await deps.findByHash(hashWatchPairCode(normalized));
  if (!row) {
    throw new WatchPairError("INVALID_CODE", "Invalid or unknown code");
  }
  if (row.consumedAt) {
    throw new WatchPairError("CONSUMED", "Code already used");
  }
  if (row.expiresAt.getTime() <= deps.now().getTime()) {
    throw new WatchPairError("EXPIRED", "Code expired");
  }

  const marked = await deps.markConsumed(row.id, deps.now());
  if (!marked) {
    throw new WatchPairError("CONSUMED", "Code already used");
  }

  const created = await deps.createWatchToken(
    row.userSub,
    row.workspaceId,
    row.apps,
    row.scopes,
    formatApiPairingTokenName(deps.now()),
  );
  return {
    baseURL: deps.publicOrigin().replace(/\/$/, ""),
    token: created.token,
  };
}
