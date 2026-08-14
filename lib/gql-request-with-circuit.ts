import { GraphQLClient } from "graphql-request";
import { graphqlRequestHeaders } from "@/lib/gql-request-headers";
import {
  isRequestCircuitOpen,
  recordRequestFailure,
  recordRequestSuccess,
} from "@/lib/request-circuit";
import {
  isPersistentRequestError,
  requestCircuitOpenError,
  toUserFacingError,
} from "@/lib/user-facing-error";

/** GraphQL fetch that skips the network after repeated persistent session errors. */
export async function graphqlRequestWithCircuit<T extends Record<string, unknown>>(
  context: string,
  endpoint: string,
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (isRequestCircuitOpen()) {
    throw requestCircuitOpenError();
  }

  try {
    const client = new GraphQLClient(endpoint, {
      credentials: "include",
      headers: await graphqlRequestHeaders(),
    });
    const result = await client.request<T>(
      document,
      variables as Record<string, unknown> | undefined,
    );
    recordRequestSuccess();
    return result;
  } catch (error) {
    if (isPersistentRequestError(error)) {
      recordRequestFailure();
    }
    throw toUserFacingError(context, error);
  }
}
