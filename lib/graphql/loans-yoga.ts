/* eslint-disable react-hooks/rules-of-hooks */
import { randomUUID } from "node:crypto";
import { useResponseCache } from "@graphql-yoga/plugin-response-cache";
import { maxDepthPlugin } from "@escape.tech/graphql-armor-max-depth";
import { maxTokensPlugin } from "@escape.tech/graphql-armor-max-tokens";
import { GraphQLError, visit } from "graphql";
import { createSchema, createYoga, type Plugin } from "graphql-yoga";
import { BigIntResolver } from "graphql-scalars";
import { loansTypeDefs } from "@/lib/graphql/loans-typeDefs";
import { loansResolvers } from "@/lib/graphql/loans-resolvers";
import { apiTokenLogFingerprint, isApiTokenSecret } from "@/lib/api-auth";
import { createLoansGraphQLContext } from "@/lib/graphql/loans-context";

const schema = createSchema({
  typeDefs: loansTypeDefs,
  resolvers: {
    BigInt: BigIntResolver,
    ...loansResolvers,
  },
});

const responseHeadersByRequest = new WeakMap<Request, Headers>();
const LOANS_WORKSPACE_COOKIE = "ctx_workspace_loans";

function getCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(";")) {
    const cookie = part.trim();
    if (!cookie.startsWith(prefix)) continue;
    return cookie.slice(prefix.length);
  }
  return null;
}

export function loansResponseCacheSessionKey(request: Request): string | null {
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
  const workspace = getCookieValue(cookie, LOANS_WORKSPACE_COOKIE) ?? "none";
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
  graphqlEndpoint: "/api/graphql/loans",
  landingPage: false,
  context: async ({ request }) => {
    const responseHeaders =
      responseHeadersByRequest.get(request) ?? new Headers();
    const requestId =
      responseHeaders.get("x-request-id") ?? randomUUID();
    responseHeaders.set("x-request-id", requestId);
    return createLoansGraphQLContext(requestId, responseHeaders, request);
  },
  maskedErrors: process.env.NODE_ENV !== "development",
  plugins: [
    useResponseCache({
      session: loansResponseCacheSessionKey,
      ttl: 0,
      ttlPerSchemaCoordinate: {
        "Query.loansBootstrap": 60_000,
      },
      invalidateViaMutation: true,
    }),
    maxDepthPlugin({ n: 10 }),
    maxTokensPlugin({ n: 1000 }),
    useIntrospectionGuardPlugin(),
  ],
});

export function handleLoansGraphQL(request: Request, responseHeaders: Headers) {
  if (!responseHeaders.has("x-request-id")) {
    responseHeaders.set("x-request-id", randomUUID());
  }
  responseHeadersByRequest.set(request, responseHeaders);
  return yoga.fetch(request);
}
