import { handlePassKitListUpdated } from "@/lib/apple-wallet/http";
import { defaultAppleWalletHttpDeps } from "@/lib/apple-wallet/services";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    deviceLibraryId: string;
    passTypeId: string;
  }>;
};

export async function GET(req: Request, ctx: Params) {
  const params = await ctx.params;
  return handlePassKitListUpdated(req, params, defaultAppleWalletHttpDeps());
}
