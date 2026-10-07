import { handlePassKitLog } from "@/lib/apple-wallet/http";
import { defaultAppleWalletHttpDeps } from "@/lib/apple-wallet/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handlePassKitLog(req, defaultAppleWalletHttpDeps());
}
