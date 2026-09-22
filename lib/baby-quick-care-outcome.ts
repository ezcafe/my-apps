import { graphqlErrorCode } from "@/lib/user-facing-error";

/**
 * Classifies a GraphQL / network error for the pending clear rule.
 * Clear only for codes raised exclusively before babyQuickCare commits.
 * BAD_REQUEST is ambiguous — mapServiceError also uses it as a catch-all
 * for unknown post-commit errors.
 *
 * Live mutations throw UserFacingError (circuit wrapper); honor `.code`
 * and walk `cause` via graphqlErrorCode — not only raw extensions.
 */
export const BABY_QUICK_DEFINITE_NO_COMMIT_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  /** Workspace/DB gate failed before babyQuickCare.run — never mid-commit. */
  "SERVICE_UNAVAILABLE",
] as const;

export type BabyQuickErrorClass = "definiteNoCommit" | "ambiguous";

/** Fallback for plain `{ extensions }` / ClientError-shaped objects in tests. */
function codeFromPlainShape(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const ext = (error as { extensions?: { code?: unknown } }).extensions;
  if (ext && typeof ext.code === "string") return ext.code;
  const res = (
    error as {
      response?: { errors?: Array<{ extensions?: { code?: string } }> };
    }
  ).response;
  const first = res?.errors?.[0];
  if (first?.extensions?.code) return first.extensions.code;
  return null;
}

export function classifyBabyQuickCareError(
  error: unknown,
): BabyQuickErrorClass {
  const code = graphqlErrorCode(error) ?? codeFromPlainShape(error);
  if (
    code &&
    (BABY_QUICK_DEFINITE_NO_COMMIT_CODES as readonly string[]).includes(code)
  ) {
    return "definiteNoCommit";
  }
  return "ambiguous";
}

/**
 * After a confirmed babyQuickCare: refetch may fail without undoing success UI.
 * Call outside the mutation catch that sets chainFailed / pending.
 */
export async function softInvalidateAfterQuickCare(
  invalidate?: () => Promise<void>,
): Promise<void> {
  try {
    await invalidate?.();
  } catch {
    // Leave Done/Logged + success message; status query shows its own error.
  }
}

/**
 * role=status copy for home quick-care. Confirmation beats "Saving…" so the
 * success flash paints before soft-invalidate finishes (and stays visible if
 * refetch is slow).
 */
export function babyHomeSaveAnnouncement(input: {
  saving: boolean;
  message: string | null;
  savingLabel: string;
}): string | null {
  if (input.message) return input.message;
  if (input.saving) return input.savingLabel;
  return null;
}
