import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import PocketId from "@/auth/providers/pocket-id";

const issuer = process.env.AUTH_POCKET_ID_ISSUER;
const clientId = process.env.AUTH_POCKET_ID_ID;
const clientSecret = process.env.AUTH_POCKET_ID_SECRET;
const authSecret = process.env.AUTH_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (!authSecret) {
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
      // /kiosk is intentionally omitted until it can join proxy.ts matcher without
      // breaking soft-nav; page-level auth covers it today. Add startsWith("/kiosk")
      // here in the same change that adds "/kiosk" to the proxy matcher.
      if (
        path.startsWith("/settings") ||
        path.startsWith("/analytics") ||
        path.startsWith("/money") ||
        path.startsWith("/investments") ||
        path.startsWith("/loans") ||
        path.startsWith("/help")
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
