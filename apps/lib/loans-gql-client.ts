import { GraphQLClient } from "graphql-request";
import { toUserFacingError } from "@/lib/user-facing-error";

function resolveLoansGraphQLEndpoint(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL("/api/graphql", window.location.origin).href;
  }
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (fromPublic) return `${fromPublic}/api/graphql`;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}/api/graphql`;
  return "http://127.0.0.1:3000/api/graphql";
}

let loansGraphqlClient: GraphQLClient | null = null;

function getLoansGraphqlClient() {
  if (loansGraphqlClient) return loansGraphqlClient;
  loansGraphqlClient = new GraphQLClient(resolveLoansGraphQLEndpoint(), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return loansGraphqlClient;
}

export async function loansGraphQLRequest<T extends Record<string, unknown>>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  try {
    return await getLoansGraphqlClient().request<T>(
      document,
      variables as Record<string, unknown> | undefined,
    );
  } catch (e) {
    throw toUserFacingError("loansGraphQLRequest", e);
  }
}
