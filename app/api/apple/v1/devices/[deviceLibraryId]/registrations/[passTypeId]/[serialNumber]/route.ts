import {
  handlePassKitRegister,
  handlePassKitUnregister,
} from "@/lib/apple-wallet/http";
import { defaultAppleWalletHttpDeps } from "@/lib/apple-wallet/services";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    deviceLibraryId: string;
    passTypeId: string;
    serialNumber: string;
  }>;
};

export async function POST(req: Request, ctx: Params) {
  const params = await ctx.params;
  return handlePassKitRegister(req, params, defaultAppleWalletHttpDeps());
}

export async function DELETE(req: Request, ctx: Params) {
  const params = await ctx.params;
  return handlePassKitUnregister(req, params, defaultAppleWalletHttpDeps());
}
