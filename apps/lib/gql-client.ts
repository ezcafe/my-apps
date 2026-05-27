import { ClientError, GraphQLClient } from "graphql-request";

/** graphql-request resolves the endpoint with `new URL()`; relative paths throw in the browser without a base. */
function resolveMoneyGraphQLEndpoint(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL("/api/graphql", window.location.origin).href;
  }
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (fromPublic) return `${fromPublic}/api/graphql`;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}/api/graphql`;
  return "http://127.0.0.1:3000/api/graphql";
}

let moneyGraphqlClient: GraphQLClient | null = null;

function getMoneyGraphqlClient() {
  if (moneyGraphqlClient) return moneyGraphqlClient;
  moneyGraphqlClient = new GraphQLClient(resolveMoneyGraphQLEndpoint(), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return moneyGraphqlClient;
}

export async function moneyGraphQLRequest<T extends Record<string, unknown>>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  try {
    return await getMoneyGraphqlClient().request<T>(
      document,
      variables as Record<string, unknown> | undefined,
    );
  } catch (e) {
    if (e instanceof ClientError) {
      const first = e.response.errors?.[0];
      throw new Error(first?.message ?? e.message);
    }
    throw e;
  }
}
