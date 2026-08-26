import { NextResponse } from "next/server";
import { withBypassRls } from "@/db";
import { cronAuthResponse, verifyCronRequest } from "@/lib/cron-auth";
import { isDbUnreachable } from "@/lib/db-errors";
import { processDueMoneyRecurrenceTemplates } from "@/lib/money-services/recurrence";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = cronAuthResponse(verifyCronRequest(request));
  if (denied) return denied;

  try {
    const result = await withBypassRls(() => processDueMoneyRecurrenceTemplates());
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (isDbUnreachable(e)) {
      return NextResponse.json(
        { error: "Database unavailable", code: "db_unavailable" },
        { status: 503 },
      );
    }
    throw e;
  }
}
