import { GraphQLClient } from "graphql-request";
import { toUserFacingError } from "@/lib/user-facing-error";

function resolveSavingsGraphQLEndpoint(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL("/api/graphql/savings", window.location.origin).href;
  }
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (fromPublic) return `${fromPublic}/api/graphql/savings`;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}/api/graphql/savings`;
  return "http://127.0.0.1:3000/api/graphql/savings";
}

let savingsGraphqlClient: GraphQLClient | null = null;

function getSavingsGraphqlClient() {
  if (savingsGraphqlClient) return savingsGraphqlClient;
  savingsGraphqlClient = new GraphQLClient(resolveSavingsGraphQLEndpoint(), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return savingsGraphqlClient;
}

export async function savingsGraphQLRequest<T extends Record<string, unknown>>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  try {
    return await getSavingsGraphqlClient().request<T>(
      document,
      variables as Record<string, unknown> | undefined,
    );
  } catch (e) {
    throw toUserFacingError("savingsGraphQLRequest", e);
  }
}
