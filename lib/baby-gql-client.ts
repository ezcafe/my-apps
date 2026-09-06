import { graphqlRequestWithCircuit } from "@/lib/gql-request-with-circuit";

function resolveBabyGraphQLEndpoint(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL("/api/graphql/baby", window.location.origin).href;
  }
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (fromPublic) return `${fromPublic}/api/graphql/baby`;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}/api/graphql/baby`;
  return "http://127.0.0.1:3000/api/graphql/baby";
}

export async function babyGraphQLRequest<T extends Record<string, unknown>>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  return graphqlRequestWithCircuit<T>(
    "babyGraphQLRequest",
    resolveBabyGraphQLEndpoint(),
    document,
    variables,
  );
}
