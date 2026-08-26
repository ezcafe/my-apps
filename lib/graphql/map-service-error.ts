import { GraphQLError } from "graphql";

function gqlErr(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

const ALLOWLISTED: Record<string, { message: string; code: string }> = {
  UNAUTHORIZED: { message: "Unauthorized", code: "UNAUTHORIZED" },
  FORBIDDEN: { message: "Forbidden", code: "FORBIDDEN" },
  NOT_FOUND: { message: "Not found", code: "NOT_FOUND" },
  DB_UNAVAILABLE: {
    message: "Service temporarily unavailable",
    code: "DB_UNAVAILABLE",
  },
};

/**
 * Maps known service errors to GraphQL errors. Unknown errors are logged and
 * returned as a generic BAD_REQUEST to avoid leaking internals.
 */
export function mapServiceError(e: unknown, requestId?: string): never {
  const msg = e instanceof Error ? e.message : String(e);
  const known = ALLOWLISTED[msg];
  if (known) gqlErr(known.message, known.code);

  // Validation / domain messages from services are usually safe and prefixed.
  if (
    msg.startsWith("Validation failed") ||
    msg.startsWith("Invalid ") ||
    msg.startsWith("BAD_REQUEST") ||
    msg.includes("exceeds") ||
    msg.includes("required") ||
    msg.includes("must be")
  ) {
    const cleaned = msg.replace(/^BAD_REQUEST:\s*/i, "");
    gqlErr(cleaned || "Bad request", "BAD_REQUEST");
  }

  console.error(
    `[graphql] unhandled service error${requestId ? ` requestId=${requestId}` : ""}:`,
    e,
  );
  gqlErr("Request failed", "BAD_REQUEST");
}
