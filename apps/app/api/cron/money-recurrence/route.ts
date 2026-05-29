import { NextResponse } from "next/server";
import { isDbUnreachable } from "@/lib/db-errors";
import { processDueMoneyRecurrenceTemplates } from "@/lib/money-services/recurrence";

export const dynamic = "force-dynamic";

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization")?.trim();
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDueMoneyRecurrenceTemplates();
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
