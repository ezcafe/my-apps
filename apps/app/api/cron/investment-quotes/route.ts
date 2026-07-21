import { NextResponse } from "next/server";
import { refreshAllWorkspaceQuotesCron } from "@/lib/investment-services/quotes";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured", code: "bad_request" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (token !== secret) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 },
    );
  }

  const result = await refreshAllWorkspaceQuotesCron();
  return NextResponse.json({ data: result });
}
