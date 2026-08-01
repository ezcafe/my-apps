import { auth } from "@/auth";
import type { NextFetchEvent } from "next/server";

/**
 * Next.js 16 `proxy.ts` convention: export a `proxy` function (see upgrade guide).
 * Delegates to Auth.js `auth()` so session + `callbacks.authorized` run on matched routes.
 * @see https://nextjs.org/docs/app/guides/upgrading/version-16#middleware-to-proxy
 * @see https://authjs.dev/getting-started/migrating-to-v5
 */
export async function proxy(request: Request, event: NextFetchEvent) {
  // #region agent log
  {
    const url = new URL(request.url);
    const payload = {
      sessionId: "821bf7",
      runId: "pre-fix",
      hypothesisId: "D",
      location: "proxy.ts:entry",
      message: "proxy invoked",
      data: {
        path: url.pathname,
        hasAuthSecret: Boolean(process.env.AUTH_SECRET),
        host: request.headers.get("host"),
        accept: request.headers.get("accept")?.slice(0, 80) ?? null,
      },
      timestamp: Date.now(),
    };
    console.error("[debug-821bf7]", JSON.stringify(payload));
    const body = JSON.stringify(payload);
    for (const base of [
      "http://127.0.0.1:7618",
      "http://host.docker.internal:7618",
    ]) {
      fetch(`${base}/ingest/38009b80-25c5-44ac-8785-d17f25197c79`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "821bf7",
        },
        body,
      }).catch(() => {});
    }
  }
  // #endregion
  // NextAuth `auth` typings target Pages middleware; App Router proxy passes standard Request.
  return auth(request as never, event as never);
}

export const config = {
  matcher: [
    "/help",
    "/help/:path*",
    "/settings/:path*",
    "/analytics/:path*",
    "/money",
    "/money/:path*",
  ],
};
