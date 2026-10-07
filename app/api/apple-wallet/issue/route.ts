import { handleIssueGet } from "@/lib/apple-wallet/http";
import { defaultAppleWalletHttpDeps } from "@/lib/apple-wallet/services";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleIssueGet(req, defaultAppleWalletHttpDeps());
}
