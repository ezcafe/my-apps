import { ClientError } from "graphql-request";

export const DEFAULT_USER_ERROR_MESSAGE =
  "Something went wrong. Please try again.";

const GRAPHQL_CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Sign in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "That item wasn't found.",
  DB_UNAVAILABLE:
    "We're having trouble loading your data. Try again in a moment.",
  RATE_LIMITED: "Too many requests. Wait a moment and try again.",
};

export class UserFacingError extends Error {
  readonly userMessage: string;
  readonly logged: boolean;

  constructor(
    userMessage: string,
    options?: { cause?: unknown; logged?: boolean },
  ) {
    super(userMessage);
    this.name = "UserFacingError";
    this.userMessage = userMessage;
    this.logged = options?.logged ?? false;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

/** Full error details for the browser console only. */
export function logClientError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
}

function graphqlExtensionCode(error: unknown): string | undefined {
  if (!(error instanceof ClientError)) return undefined;
  const first = error.response.errors?.[0];
  const code = first?.extensions?.code;
  return typeof code === "string" ? code : undefined;
}

function rawErrorMessage(error: unknown): string | undefined {
  if (error instanceof ClientError) {
    const first = error.response.errors?.[0];
    const msg = first?.message?.trim();
    if (msg) return msg;
  }
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg) return msg;
  }
  if (typeof error === "string") {
    const msg = error.trim();
    if (msg) return msg;
  }
  return undefined;
}

/** True when a message should not be shown in the UI. */
export function isTechnicalErrorMessage(message: string): boolean {
  const m = message.trim();
  if (!m) return true;
  if (/^GraphQL Error/i.test(m)) return true;
  if (/\{"response"\s*:/.test(m)) return true;
  if (/\bquery\s+[A-Za-z_]\w*\s*\{/.test(m)) return true;
  if (/\bmutation\s+[A-Za-z_]\w*\s*\{/.test(m)) return true;
  if (/\bat\s+[\w.$/<>-]+:\d+:\d+/.test(m)) return true;
  if (/^(TypeError|ReferenceError|SyntaxError):/i.test(m)) return true;
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ENETUNREACH/i.test(m)) return true;
  if (/DATABASE_URL|PostgreSQL|prisma/i.test(m)) return true;
  if (m.length > 280) return true;
  return false;
}

export function toUserFacingMessage(
  error: unknown,
  fallback = DEFAULT_USER_ERROR_MESSAGE,
): string {
  if (error instanceof UserFacingError) {
    return error.userMessage;
  }

  const code = graphqlExtensionCode(error);
  if (code && GRAPHQL_CODE_MESSAGES[code]) {
    return GRAPHQL_CODE_MESSAGES[code];
  }

  const raw = rawErrorMessage(error);
  if (raw && !isTechnicalErrorMessage(raw)) {
    return raw;
  }

  if (error instanceof ClientError) {
    const status = error.response.status;
    if (status === 401) return GRAPHQL_CODE_MESSAGES.UNAUTHORIZED;
    if (status === 403) return GRAPHQL_CODE_MESSAGES.FORBIDDEN;
    if (status === 404) return GRAPHQL_CODE_MESSAGES.NOT_FOUND;
    if (status === 429) return GRAPHQL_CODE_MESSAGES.RATE_LIMITED;
  }

  return fallback;
}

/** Log full error once and return a safe message for UI. */
export function presentClientError(
  context: string,
  error: unknown,
  fallback = DEFAULT_USER_ERROR_MESSAGE,
): string {
  if (error instanceof UserFacingError && error.logged) {
    return error.userMessage;
  }
  logClientError(context, error);
  return toUserFacingMessage(error, fallback);
}

/** Safe message for React Query `error` values (GraphQL errors are already logged). */
export function queryErrorMessage(error: unknown): string | null {
  if (error == null) return null;
  return toUserFacingMessage(error);
}

export function toUserFacingError(
  context: string,
  error: unknown,
  fallback = DEFAULT_USER_ERROR_MESSAGE,
): UserFacingError {
  if (error instanceof UserFacingError && error.logged) {
    return error;
  }
  logClientError(context, error);
  return new UserFacingError(toUserFacingMessage(error, fallback), {
    cause: error,
    logged: true,
  });
}
