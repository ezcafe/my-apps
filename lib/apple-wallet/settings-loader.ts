import { and, count, eq } from "drizzle-orm";
import { db, withBypassRls } from "@/db";
import {
  appleWalletRegistration,
  appleWalletSubscriber,
} from "@/db/schema/apple-wallet";
import { isAppleWalletEnabled } from "@/lib/apple-wallet/config";
import { walletStatusFrom, type WalletUiStatus } from "@/lib/apple-wallet/status";
import { getBabyWorkspaceIdForUser } from "@/lib/workspace-baby";

export type AppleWalletSettingsLoader = {
  appleEnabled: boolean;
  status: WalletUiStatus;
};

export async function loadAppleWalletSettingsProps(
  userSub: string | undefined,
): Promise<AppleWalletSettingsLoader> {
  const appleEnabled = isAppleWalletEnabled();
  if (!userSub || !appleEnabled) {
    return { appleEnabled, status: "not_linked" };
  }

  try {
    const workspaceId = await getBabyWorkspaceIdForUser(userSub);
    if (!workspaceId) {
      return { appleEnabled, status: "not_linked" };
    }

    const [sub] = await withBypassRls(() =>
      db
        .select({
          status: appleWalletSubscriber.status,
          serialNumber: appleWalletSubscriber.serialNumber,
        })
        .from(appleWalletSubscriber)
        .where(
          and(
            eq(appleWalletSubscriber.workspaceId, workspaceId),
            eq(appleWalletSubscriber.userSub, userSub),
            eq(appleWalletSubscriber.status, "active"),
          ),
        )
        .limit(1),
    );

    if (!sub) {
      return { appleEnabled, status: "not_linked" };
    }

    const [reg] = await withBypassRls(() =>
      db
        .select({ n: count() })
        .from(appleWalletRegistration)
        .where(eq(appleWalletRegistration.serialNumber, sub.serialNumber)),
    );

    return {
      appleEnabled,
      status: walletStatusFrom(
        { status: "active" },
        Number(reg?.n ?? 0),
        false,
      ),
    };
  } catch {
    return { appleEnabled, status: "not_linked" };
  }
}
