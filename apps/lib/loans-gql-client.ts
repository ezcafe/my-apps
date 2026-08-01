import { GraphQLClient } from "graphql-request";
import { graphqlRequestHeaders } from "@/lib/gql-request-headers";
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

export async function loansGraphQLRequest<T extends Record<string, unknown>>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  try {
    const client = new GraphQLClient(resolveLoansGraphQLEndpoint(), {
      credentials: "include",
      headers: await graphqlRequestHeaders(),
    });
    return await client.request<T>(
      document,
      variables as Record<string, unknown> | undefined,
    );
  } catch (e) {
    throw toUserFacingError("loansGraphQLRequest", e);
  }
}
