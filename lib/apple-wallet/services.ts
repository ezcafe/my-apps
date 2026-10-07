import { createApnsSender } from "@/lib/apple-wallet/apns";
import {
  getAppleWalletConfig,
  isAppleWalletEnabled,
} from "@/lib/apple-wallet/config";
import type { AppleWalletHttpDeps } from "@/lib/apple-wallet/http";
import { createDbAppleWalletStore } from "@/lib/apple-wallet/store";
import { createAppleWebService } from "@/lib/apple-wallet/webservice";
import { resolveSessionUserSub } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict } from "@/lib/request-guards";
import { publicAppOrigin } from "@/lib/watch-pairing-codes";
import { assertWorkspaceAppAccess } from "@/lib/workspace-app-access";
import {
  getBabyWorkspaceIdForUser,
  BABY_APP_KEY,
} from "@/lib/workspace-baby";

let cachedStore: ReturnType<typeof createDbAppleWalletStore> | null = null;

export function getAppleWalletStore() {
  if (!cachedStore) cachedStore = createDbAppleWalletStore();
  return cachedStore;
}

export function defaultAppleWalletHttpDeps(): AppleWalletHttpDeps {
  const store = getAppleWalletStore();
  return {
    isAppleWalletEnabled: () => isAppleWalletEnabled(),
    getConfig: () => getAppleWalletConfig(),
    store,
    resolveSessionUserSub,
    resolveBabyWorkspaceId: async (userSub, workspaceId) => {
      if (workspaceId) return workspaceId;
      return getBabyWorkspaceIdForUser(userSub);
    },
    assertBabyMember: (userSub, workspaceId) =>
      assertWorkspaceAppAccess(userSub, workspaceId, BABY_APP_KEY),
    enforceRateLimit,
    assertSameOriginStrict,
    publicOrigin: publicAppOrigin,
    webservice: () => {
      const config = getAppleWalletConfig();
      if (!config) {
        throw new Error("Apple Wallet config missing");
      }
      return createAppleWebService({ apple: config, store });
    },
    issueRpm: () => Number(process.env.APPLE_WALLET_ISSUE_RPM ?? 20),
    mintRpm: () =>
      Number(
        process.env.APPLE_WALLET_MINT_RPM ??
          process.env.WATCH_PAIR_MINT_RPM ??
          20,
      ),
    logRpm: () => Number(process.env.APPLE_WALLET_LOG_RPM ?? 60),
  };
}

export function defaultApnsSender() {
  const config = getAppleWalletConfig();
  if (!config) return null;
  return createApnsSender(config);
}
