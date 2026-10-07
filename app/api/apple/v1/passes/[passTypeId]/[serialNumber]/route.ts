import { handlePassKitGetPass } from "@/lib/apple-wallet/http";
import { defaultAppleWalletHttpDeps } from "@/lib/apple-wallet/services";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    passTypeId: string;
    serialNumber: string;
  }>;
};

export async function GET(req: Request, ctx: Params) {
  const params = await ctx.params;
  return handlePassKitGetPass(req, params, defaultAppleWalletHttpDeps());
}
