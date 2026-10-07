import { handleSubscriptionDelete } from "@/lib/apple-wallet/http";
import { defaultAppleWalletHttpDeps } from "@/lib/apple-wallet/services";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  return handleSubscriptionDelete(req, defaultAppleWalletHttpDeps());
}
