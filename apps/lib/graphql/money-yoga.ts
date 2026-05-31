/* Envelop/Yoga plugin factories — not React hooks (eslint react-hooks/rules-of-hooks). */
/* eslint-disable react-hooks/rules-of-hooks */
import { randomUUID } from "node:crypto";
import { useResponseCache } from "@graphql-yoga/plugin-response-cache";
import { maxDepthPlugin } from "@escape.tech/graphql-armor-max-depth";
import { maxTokensPlugin } from "@escape.tech/graphql-armor-max-tokens";
import { GraphQLError, visit } from "graphql";
import { createSchema, createYoga, type Plugin } from "graphql-yoga";
import { moneyTypeDefs } from "@/lib/graphql/money-typeDefs";
import { moneyResolvers } from "@/lib/graphql/money-resolvers";
import { apiTokenLogFingerprint, isApiTokenSecret } from "@/lib/api-auth";
import {
  createMoneyGraphQLContext,
  type MoneyGraphQLContext,
} from "@/lib/graphql/context";

const schema = createSchema({
  typeDefs: moneyTypeDefs,
  resolvers: moneyResolvers,
});

const responseHeadersByRequest = new WeakMap<Request, Headers>();
const MONEY_WORKSPACE_COOKIE = "ctx_workspace_money";

function getCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(";")) {
    const cookie = part.trim();
    if (!cookie.startsWith(prefix)) continue;
    return cookie.slice(prefix.length);
  }
  return null;
}

/** Cache key segment to prevent cross-tenant cache collisions. */
export function responseCacheSessionKey(request: Request): string | null {
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
  const workspace = getCookieValue(cookie, MONEY_WORKSPACE_COOKIE) ?? "none";
  const sessionToken =
    getCookieValue(cookie, "__Secure-authjs.session-token") ??
    getCookieValue(cookie, "authjs.session-token") ??
    getCookieValue(cookie, "__Secure-next-auth.session-token") ??
    getCookieValue(cookie, "next-auth.session-token");
  if (!sessionToken) return `cookie:${workspace}:anon`;
  return `cookie:${workspace}:${apiTokenLogFingerprint(sessionToken)}`;
}

function useServerTimingPlugin(): Plugin {
  return {
    onExecute({ args }) {
      const start = performance.now();
      const operationName = args.operationName ?? "anon";
      return {
        onExecuteDone() {
          const ms = performance.now() - start;
          const ctx = args.contextValue as unknown as MoneyGraphQLContext;
          const request = ctx.request;
          if (request) {
            const headers = responseHeadersByRequest.get(request);
            headers?.append(
              "Server-Timing",
              `gql;desc="${operationName}";dur=${ms.toFixed(1)}`,
            );
          }
          if (ms > 500) {
            console.warn(
              `[graphql] slow operation ${operationName} ${ms.toFixed(0)}ms`,
            );
          }
        },
      };
    },
  };
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

function useRequestIdErrorPlugin(): Plugin {
  return {
    onResultProcess({ result, setResult, request }) {
      const responseHeaders = responseHeadersByRequest.get(request);
      const requestId = responseHeaders?.get("x-request-id");
      if (!requestId || !("errors" in result) || !result.errors?.length) return;
      const nextErrors = result.errors.map(
        (err) =>
          new GraphQLError(err.message, {
            nodes: err.nodes,
            source: err.source,
            positions: err.positions,
            path: err.path,
            originalError: err.originalError,
            extensions: { ...err.extensions, requestId },
          }),
      );
      setResult({ ...result, errors: nextErrors });
    },
  };
}

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  landingPage: false,
  context: async ({ request }) => {
    const responseHeaders =
      responseHeadersByRequest.get(request) ?? new Headers();
    const requestId =
      responseHeaders.get("x-request-id") ?? randomUUID();
    responseHeaders.set("x-request-id", requestId);
    return createMoneyGraphQLContext(requestId, responseHeaders, request);
  },
  maskedErrors: process.env.NODE_ENV !== "development",
  plugins: [
    useResponseCache({
      session: responseCacheSessionKey,
      ttl: 0,
      ttlPerSchemaCoordinate: {
        "Query.moneyAnalyticsSummary": 45_000,
        "Query.moneyAnalyticsOverview": 30_000,
        "Query.moneyAnalyticsBudgets": 30_000,
        "Query.moneyFormBudgetStatus": 0,
        "Query.moneyAnalyticsSankey": 30_000,
        "Query.moneyAnalyticsDistribution": 30_000,
        "Query.moneyAnalyticsLeaders": 30_000,
        "Query.moneyBootstrap": 60_000,
      },
      invalidateViaMutation: true,
    }),
    maxDepthPlugin({ n: 10 }),
    maxTokensPlugin({ n: 1000 }),
    useIntrospectionGuardPlugin(),
    useRequestIdErrorPlugin(),
    useServerTimingPlugin(),
  ],
});

export function handleMoneyGraphQL(request: Request, responseHeaders: Headers) {
  if (!responseHeaders.has("x-request-id")) {
    responseHeaders.set("x-request-id", randomUUID());
  }
  responseHeadersByRequest.set(request, responseHeaders);
  return yoga.fetch(request);
}
