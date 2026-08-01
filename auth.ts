import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import PocketId from "@/auth/providers/pocket-id";

const issuer = process.env.AUTH_POCKET_ID_ISSUER;
const clientId = process.env.AUTH_POCKET_ID_ID;
const clientSecret = process.env.AUTH_POCKET_ID_SECRET;
const authSecret = process.env.AUTH_SECRET;
const isProduction = process.env.NODE_ENV === "production";

// #region agent log
{
  const payload = {
    sessionId: "821bf7",
    runId: "pre-fix",
    hypothesisId: "A",
    location: "auth.ts:secret-check",
    message: "AUTH_SECRET presence at module load",
    data: {
      hasAuthSecret: Boolean(authSecret),
      secretLength: authSecret?.length ?? 0,
      isWhitespaceOnly: Boolean(authSecret && authSecret.trim().length === 0),
      nodeEnv: process.env.NODE_ENV ?? null,
      hasAuthUrl: Boolean(process.env.AUTH_URL),
      authUrlHost: (() => {
        try {
          return process.env.AUTH_URL
            ? new URL(process.env.AUTH_URL).host
            : null;
        } catch {
          return "invalid";
        }
      })(),
      hasPocketIssuer: Boolean(issuer),
      hasPocketId: Boolean(clientId),
      hasPocketSecret: Boolean(clientSecret),
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

if (!authSecret) {
  // #region agent log
  {
    const payload = {
      sessionId: "821bf7",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "auth.ts:throw-missing",
      message: "Throwing AUTH_SECRET is required",
      data: { willThrow: true },
      timestamp: Date.now(),
    };
    console.error("[debug-821bf7]", JSON.stringify(payload));
    fetch(
      "http://host.docker.internal:7618/ingest/38009b80-25c5-44ac-8785-d17f25197c79",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "821bf7",
        },
        body: JSON.stringify(payload),
      },
    ).catch(() => {});
  }
  // #endregion
  throw new Error("AUTH_SECRET is required");
}

if (
  isProduction &&
  authSecret === "local-dev-auth-secret-change-me"
) {
  throw new Error("AUTH_SECRET must not use the known local default value");
}

const missingPocketOidc =
  !issuer || !clientId || !clientSecret;

if (isProduction && missingPocketOidc) {
  throw new Error(
    "AUTH_POCKET_ID_ISSUER, AUTH_POCKET_ID_ID, and AUTH_POCKET_ID_SECRET are required in production",
  );
}

const pocketProvider = missingPocketOidc
  ? PocketId({
      issuer: "https://placeholder.invalid",
      clientId: "placeholder",
      clientSecret: "placeholder",
    })
  : PocketId({ issuer, clientId, clientSecret });

export const authConfig = {
  providers: [pocketProvider],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (
        path.startsWith("/settings") ||
        path.startsWith("/analytics") ||
        path.startsWith("/money")
      ) {
        return !!auth;
      }
      return true;
    },
    jwt({ token, account, profile }) {
      if (profile?.sub) token.sub = profile.sub;
      if (account?.providerAccountId) token.sub = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    async signIn(message) {
      const id = message.user?.id;
      if (!id) return;
      const { ensureUserBootstrap } = await import("@/lib/bootstrap");
      await ensureUserBootstrap(id);
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
});
