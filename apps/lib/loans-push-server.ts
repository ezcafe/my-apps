import webpush from "web-push";
import { formatMinor } from "@/lib/format-money";
import type { DueReminderRow } from "@/lib/loans-services/reminders";
import { listPushSubscriptionsForUser } from "@/lib/loans-services/push";

function ensureVapidConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendLoanDuePush(
  reminder: DueReminderRow,
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const subs = await listPushSubscriptionsForUser(reminder.userSub);
  if (!subs.length) return { sent: 0, failed: 0 };

  const body = `${reminder.loanName} · ${formatMinor(reminder.paymentMinor, reminder.currency)} due ${reminder.dueDate}`;
  const payload = JSON.stringify({
    title: "Loan payment due",
    body,
    url: `/loans/${reminder.loanId}`,
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent += 1;
      } catch {
        failed += 1;
      }
    }),
  );

  return { sent, failed };
}
