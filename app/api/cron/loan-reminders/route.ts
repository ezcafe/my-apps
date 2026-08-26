import { NextResponse } from "next/server";
import { cronAuthResponse, verifyCronRequest } from "@/lib/cron-auth";
import { isDbUnreachable } from "@/lib/db-errors";
import { sendLoanDuePush } from "@/lib/loans-push-server";
import {
  listDueRemindersForCron,
  markInstallmentNotified,
} from "@/lib/loans-services/reminders";
import { withBypassRls } from "@/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = cronAuthResponse(verifyCronRequest(request));
  if (denied) return denied;

  try {
    const due = await withBypassRls(() => listDueRemindersForCron());
    let pushSent = 0;
    let pushFailed = 0;
    let notified = 0;

    for (const row of due) {
      const result = await sendLoanDuePush(row);
      pushSent += result.sent;
      pushFailed += result.failed;
      await withBypassRls(() => markInstallmentNotified(row.scheduleInstallmentId));
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
