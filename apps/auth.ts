import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import PocketId from "@/auth/providers/pocket-id";

const issuer = process.env.AUTH_POCKET_ID_ISSUER;
const clientId = process.env.AUTH_POCKET_ID_ID;
const clientSecret = process.env.AUTH_POCKET_ID_SECRET;

const pocketProvider =
  issuer && clientId && clientSecret
    ? PocketId({ issuer, clientId, clientSecret })
    : PocketId({
        issuer: "https://placeholder.invalid",
        clientId: "placeholder",
        clientSecret: "placeholder",
      });

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
