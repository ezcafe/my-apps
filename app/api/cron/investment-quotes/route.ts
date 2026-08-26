import { NextResponse } from "next/server";
import { withBypassRls } from "@/db";
import { cronAuthResponse, verifyCronRequest } from "@/lib/cron-auth";
import { refreshAllWorkspaceQuotesCron } from "@/lib/investment-services/quotes";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = cronAuthResponse(verifyCronRequest(req));
  if (denied) return denied;

  const result = await withBypassRls(() => refreshAllWorkspaceQuotesCron());
  return NextResponse.json({ data: result });
}
