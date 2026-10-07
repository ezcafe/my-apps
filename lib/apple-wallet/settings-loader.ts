import { and, count, eq } from "drizzle-orm";
import { db, withBypassRls } from "@/db";
import {
  appleWalletRegistration,
  appleWalletSubscriber,
} from "@/db/schema/apple-wallet";
import { diagnoseAppleWallet } from "@/lib/apple-wallet/config";
import type { AppleWalletReasonCode } from "@/lib/apple-wallet/constants";
import { walletStatusFrom, type WalletUiStatus } from "@/lib/apple-wallet/status";
import { getBabyWorkspaceIdForUser } from "@/lib/workspace-baby";

export type AppleWalletSettingsLoader = {
  appleEnabled: boolean;
  healthyForAdd: boolean;
  reasons: AppleWalletReasonCode[];
  signerValidTo: string | null;
  status: WalletUiStatus;
};

export async function loadAppleWalletSettingsProps(
  userSub: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AppleWalletSettingsLoader> {
  const diagnosis = diagnoseAppleWallet(env);
  const {
    enabled: appleEnabled,
    healthyForAdd,
    reasons,
    signerValidTo,
  } = diagnosis;

  const readiness = {
    appleEnabled,
    healthyForAdd,
    reasons,
    signerValidTo,
  };

  if (!userSub || !appleEnabled) {
    return { ...readiness, status: "not_linked" };
  }

  try {
    const workspaceId = await getBabyWorkspaceIdForUser(userSub);
    if (!workspaceId) {
      return { ...readiness, status: "not_linked" };
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
      return { ...readiness, status: "not_linked" };
    }

    const [reg] = await withBypassRls(() =>
      db
        .select({ n: count() })
        .from(appleWalletRegistration)
        .where(eq(appleWalletRegistration.serialNumber, sub.serialNumber)),
    );

    return {
      ...readiness,
      status: walletStatusFrom(
        { status: "active" },
        Number(reg?.n ?? 0),
        false,
      ),
    };
  } catch {
    return { ...readiness, status: "not_linked" };
  }
}
