"use client";

import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import {
  LOAN_PUSH_DELETE_MUTATION,
  LOAN_PUSH_SAVE_MUTATION,
} from "@/lib/loans-gql-documents";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export async function registerLoansServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function subscribeLoansPush(): Promise<boolean> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await registerLoansServiceWorker();
  if (!registration?.pushManager) return false;

  const existing = await registration.pushManager.getSubscription();
  const sub =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  await loansGraphQLRequest(LOAN_PUSH_SAVE_MUTATION, {
    input: {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  });

  return true;
}

export async function unsubscribeLoansPush(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const sub = await registration?.pushManager?.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await loansGraphQLRequest(LOAN_PUSH_DELETE_MUTATION, {
    input: { endpoint },
  });
}
