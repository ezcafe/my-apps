/* eslint-disable react-hooks/rules-of-hooks */
import { randomUUID } from "node:crypto";
import { maxAliasesPlugin } from "@escape.tech/graphql-armor-max-aliases";
import { maxDepthPlugin } from "@escape.tech/graphql-armor-max-depth";
import { maxTokensPlugin } from "@escape.tech/graphql-armor-max-tokens";
import { GraphQLError, visit } from "graphql";
import { createSchema, createYoga, type Plugin } from "graphql-yoga";
import type { ResolvedRequestAuth } from "@/lib/api-auth";
import {
  createBabyGraphQLContext,
  type BabyGraphQLContext,
} from "@/lib/graphql/baby-context";
import { babyResolvers } from "@/lib/graphql/baby-resolvers";
import { babyTypeDefs } from "@/lib/graphql/baby-typeDefs";

const schema = createSchema({
  typeDefs: babyTypeDefs,
  resolvers: babyResolvers,
});

const responseHeadersByRequest = new WeakMap<Request, Headers>();
const preResolvedAuthByRequest = new WeakMap<Request, ResolvedRequestAuth>();

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
      setResult([
        new GraphQLError("GraphQL introspection is disabled in production"),
      ]);
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
  graphqlEndpoint: "/api/graphql/baby",
  landingPage: false,
  context: async ({ request }) => {
    const responseHeaders =
      responseHeadersByRequest.get(request) ?? new Headers();
    const requestId = responseHeaders.get("x-request-id") ?? randomUUID();
    responseHeaders.set("x-request-id", requestId);
    const preAuth = preResolvedAuthByRequest.get(request);
    return createBabyGraphQLContext(
      requestId,
      responseHeaders,
      request,
      preAuth,
    );
  },
  maskedErrors: process.env.NODE_ENV !== "development",
  plugins: [
    maxDepthPlugin({ n: 10 }),
    maxTokensPlugin({ n: 1000 }),
    maxAliasesPlugin({ n: 15 }),
    useIntrospectionGuardPlugin(),
    useRequestIdErrorPlugin(),
  ],
});

export function handleBabyGraphQL(
  request: Request,
  responseHeaders: Headers,
  preResolvedAuth?: ResolvedRequestAuth,
) {
  if (!responseHeaders.has("x-request-id")) {
    responseHeaders.set("x-request-id", randomUUID());
  }
  responseHeadersByRequest.set(request, responseHeaders);
  if (preResolvedAuth) {
    preResolvedAuthByRequest.set(request, preResolvedAuth);
  }
  return yoga.fetch(request);
}

export { schema as babyGraphQLSchema };

/** Test helper: execute a document against the baby schema with a mock context. */
export async function executeBabyGraphQLForTest(
  document: string,
  ctx: Partial<BabyGraphQLContext>,
) {
  const { graphql } = await import("graphql");
  const userSub =
    "userSub" in ctx ? (ctx.userSub ?? null) : "user-1";
  const workspaceMembershipVerified =
    "workspaceMembershipVerified" in ctx
      ? Boolean(ctx.workspaceMembershipVerified)
      : true;
  const auth: ResolvedRequestAuth = userSub
    ? {
        method: "session",
        userSub,
        workspaceId: null,
        apiTokenId: null,
        apiTokenAppKey: null,
        scopes: null,
      }
    : {
        method: null,
        userSub: null,
        workspaceId: null,
        apiTokenId: null,
        apiTokenAppKey: null,
        scopes: null,
      };
  const contextValue: BabyGraphQLContext = {
    requestId: ctx.requestId ?? "test",
    responseHeaders: ctx.responseHeaders ?? new Headers(),
    request: ctx.request,
    auth: ctx.auth ?? auth,
    userSub,
    workspaceId:
      "workspaceId" in ctx ? (ctx.workspaceId ?? null) : "ws-1",
    workspaceMembershipVerified,
    authMethod: ctx.authMethod ?? (userSub ? "session" : null),
    apiTokenId: ctx.apiTokenId ?? null,
    scopes: ctx.scopes ?? null,
    loaders: ctx.loaders ?? new Map(),
  };
  return graphql({
    schema,
    source: document,
    contextValue,
  });
}
