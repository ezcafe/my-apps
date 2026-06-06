import { NextResponse } from "next/server";
import { isDbUnreachable } from "@/lib/db-errors";
import { sendLoanDuePush } from "@/lib/loans-push-server";
import {
  listDueRemindersForCron,
  markInstallmentNotified,
} from "@/lib/loans-services/reminders";

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
    const due = await listDueRemindersForCron();
    let pushSent = 0;
    let pushFailed = 0;
    let notified = 0;

    for (const row of due) {
      const result = await sendLoanDuePush(row);
      pushSent += result.sent;
      pushFailed += result.failed;
      await markInstallmentNotified(row.scheduleInstallmentId);
      notified += 1;
    }

    return NextResponse.json({
      dueCount: due.length,
      installmentsMarked: notified,
      pushSent,
      pushFailed,
    });
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
