/* eslint-disable react-hooks/rules-of-hooks */
import { randomUUID } from "node:crypto";
import { useResponseCache } from "@graphql-yoga/plugin-response-cache";
import { maxDepthPlugin } from "@escape.tech/graphql-armor-max-depth";
import { maxTokensPlugin } from "@escape.tech/graphql-armor-max-tokens";
import { GraphQLError, visit } from "graphql";
import { createSchema, createYoga, type Plugin } from "graphql-yoga";
import { BigIntResolver } from "graphql-scalars";
import { savingsTypeDefs } from "@/lib/graphql/savings-typeDefs";
import { savingsResolvers } from "@/lib/graphql/savings-resolvers";
import { apiTokenLogFingerprint, isApiTokenSecret } from "@/lib/api-auth";
import { createSavingsGraphQLContext } from "@/lib/graphql/savings-context";

const schema = createSchema({
  typeDefs: savingsTypeDefs,
  resolvers: {
    BigInt: BigIntResolver,
    ...savingsResolvers,
  },
});

const responseHeadersByRequest = new WeakMap<Request, Headers>();
const SAVINGS_WORKSPACE_COOKIE = "ctx_workspace_savings";

function getCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(";")) {
    const cookie = part.trim();
    if (!cookie.startsWith(prefix)) continue;
    return cookie.slice(prefix.length);
  }
  return null;
}

export function savingsResponseCacheSessionKey(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    const token = match?.[1]?.trim();
    if (token && isApiTokenSecret(token)) {
      return `api:${apiTokenLogFingerprint(token)}`;
    }
  }

  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const workspace = getCookieValue(cookie, SAVINGS_WORKSPACE_COOKIE) ?? "none";
  const sessionToken =
    getCookieValue(cookie, "__Secure-authjs.session-token") ??
    getCookieValue(cookie, "authjs.session-token") ??
    getCookieValue(cookie, "__Secure-next-auth.session-token") ??
    getCookieValue(cookie, "next-auth.session-token");
  if (!sessionToken) return `cookie:${workspace}:anon`;
  return `cookie:${workspace}:${apiTokenLogFingerprint(sessionToken)}`;
}

function useIntrospectionGuardPlugin(): Plugin {
  return {
    onValidate({ params, setResult }) {
      if (process.env.NODE_ENV !== "production") return;
      let found = false;
      visit(params.documentAST, {
        Field(node) {
          if (node.name.value === "__schema" || node.name.value === "__type") {
            found = true;
          }
        },
      });
      if (!found) return;
      setResult([new GraphQLError("GraphQL introspection is disabled in production")]);
    },
  };
}

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql/savings",
  landingPage: false,
  context: async ({ request }) => {
    const responseHeaders =
      responseHeadersByRequest.get(request) ?? new Headers();
    const requestId =
      responseHeaders.get("x-request-id") ?? randomUUID();
    responseHeaders.set("x-request-id", requestId);
    return createSavingsGraphQLContext(requestId, responseHeaders, request);
  },
  maskedErrors: process.env.NODE_ENV !== "development",
  plugins: [
    useResponseCache({
      session: savingsResponseCacheSessionKey,
      ttl: 0,
      ttlPerSchemaCoordinate: {
        "Query.savingsBootstrap": 60_000,
      },
      invalidateViaMutation: true,
    }),
    maxDepthPlugin({ n: 10 }),
    maxTokensPlugin({ n: 1000 }),
    useIntrospectionGuardPlugin(),
  ],
});

export function handleSavingsGraphQL(request: Request, responseHeaders: Headers) {
  if (!responseHeaders.has("x-request-id")) {
    responseHeaders.set("x-request-id", randomUUID());
  }
  responseHeadersByRequest.set(request, responseHeaders);
  return yoga.fetch(request);
}
