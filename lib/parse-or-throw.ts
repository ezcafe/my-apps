/** Shared Zod parse helper for baby (and similar) services. */
export function parseOrThrow<T>(
  schema: {
    safeParse: (
      v: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { message: string } };
  },
  input: unknown,
): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Validation failed: ${parsed.error.message}`);
  }
  return parsed.data;
}
