import { randomBytes } from "node:crypto";
import type { AppleWalletConfig } from "@/lib/apple-wallet/config";
import { buildApplePass } from "@/lib/apple-wallet/pass";
import {
  hashIssueToken,
  randomAuthToken,
  randomSerialNumber,
  type AppleWalletStore,
} from "@/lib/apple-wallet/store";

export const ISSUE_TOKEN_TTL_MS = 10 * 60 * 1000;

export type IssuePassResult = {
  buffer: Buffer;
  subscriber: {
    serialNumber: string;
    authToken: string;
    workspaceId: string;
    userSub: string;
  };
};

export type IssuePassDeps = {
  store: AppleWalletStore;
  config: AppleWalletConfig;
  now?: () => Date;
  buildPass?: typeof buildApplePass;
  newSerial?: () => string;
  newAuthToken?: () => string;
};

export async function issueApplePass(
  workspaceId: string,
  userSub: string,
  deps: IssuePassDeps,
): Promise<IssuePassResult> {
  const now = (deps.now ?? (() => new Date()))();
  const existing = await deps.store.findSubscriberByWorkspaceUser(
    workspaceId,
    userSub,
  );
  const serialNumber = existing?.serialNumber ?? (deps.newSerial ?? randomSerialNumber)();
  const authToken = existing?.authToken ?? (deps.newAuthToken ?? randomAuthToken)();

  // upsertSubscriberForIssue also ensures channel_state in the same DB tx.
  const subscriber = await deps.store.upsertSubscriberForIssue({
    workspaceId,
    userSub,
    serialNumber,
    authToken,
    now,
  });
  const channel = await deps.store.getChannelLatest(workspaceId);
  const build = deps.buildPass ?? buildApplePass;
  const buffer = await build({
    config: deps.config,
    serialNumber: subscriber.serialNumber,
    authToken: subscriber.authToken,
    latestMessage: channel?.latestMessage ?? "",
  });
  return {
    buffer,
    subscriber: {
      serialNumber: subscriber.serialNumber,
      authToken: subscriber.authToken,
      workspaceId: subscriber.workspaceId,
      userSub: subscriber.userSub,
    },
  };
}

export type MintIssueTokenDeps = {
  store: AppleWalletStore;
  now?: () => Date;
  publicOrigin: () => string;
  generateRawToken?: () => string;
};

export async function mintAppleIssueToken(
  workspaceId: string,
  userSub: string,
  deps: MintIssueTokenDeps,
): Promise<{ url: string; expiresAt: string; rawToken: string }> {
  const now = (deps.now ?? (() => new Date()))();
  const raw =
    deps.generateRawToken?.() ?? randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + ISSUE_TOKEN_TTL_MS);
  await deps.store.insertIssueToken({
    tokenHash: hashIssueToken(raw),
    workspaceId,
    userSub,
    expiresAt,
  });
  const origin = deps.publicOrigin().replace(/\/$/, "");
  return {
    url: `${origin}/api/apple-wallet/issue?t=${encodeURIComponent(raw)}`,
    expiresAt: expiresAt.toISOString(),
    rawToken: raw,
  };
}

export type RedeemIssueTokenDeps = {
  store: AppleWalletStore;
  config: AppleWalletConfig;
  now?: () => Date;
  buildPass?: typeof buildApplePass;
};

export class AppleIssueTokenError extends Error {
  constructor(
    readonly code: "unauthorized" | "gone",
    message: string,
  ) {
    super(message);
    this.name = "AppleIssueTokenError";
  }
}

export async function redeemAppleIssueToken(
  rawToken: string,
  deps: RedeemIssueTokenDeps,
): Promise<IssuePassResult> {
  const now = (deps.now ?? (() => new Date()))();
  if (!rawToken || rawToken.length < 16) {
    throw new AppleIssueTokenError("unauthorized", "Invalid issue token");
  }
  const row = await deps.store.findIssueToken(hashIssueToken(rawToken));
  if (!row) {
    throw new AppleIssueTokenError("unauthorized", "Invalid issue token");
  }
  if (row.consumedAt || row.expiresAt.getTime() <= now.getTime()) {
    throw new AppleIssueTokenError("gone", "Issue token expired or used");
  }
  // Issue first; consume only after success so a build/sign failure does not burn the token.
  // Conditional consume must win: concurrent redeem of the same t= must not return a second .pkpass.
  const issued = await issueApplePass(row.workspaceId, row.userSub, {
    store: deps.store,
    config: deps.config,
    now: () => now,
    buildPass: deps.buildPass,
  });
  const claimed = await deps.store.consumeIssueToken(row.id, now);
  if (!claimed) {
    throw new AppleIssueTokenError("gone", "Issue token expired or used");
  }
  return issued;
}
