import { auth } from "@/auth";
import type { NextFetchEvent } from "next/server";

/**
 * Next.js 16 `proxy.ts` convention: export a `proxy` function (see upgrade guide).
 * Delegates to Auth.js `auth()` so session + `callbacks.authorized` run on matched routes.
 * @see https://nextjs.org/docs/app/guides/upgrading/version-16#middleware-to-proxy
 * @see https://authjs.dev/getting-started/migrating-to-v5
 */
export async function proxy(request: Request, event: NextFetchEvent) {
  // NextAuth `auth` typings target Pages middleware; App Router proxy passes standard Request.
  return auth(request as never, event as never);
}

export const config = {
  matcher: [
    "/help",
    "/help/:path*",
    "/settings",
    "/settings/:path*",
    "/analytics/:path*",
    "/money",
    "/money/:path*",
  ],
};
