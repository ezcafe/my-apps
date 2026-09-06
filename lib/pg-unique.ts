/** Postgres unique_violation. */
export function isPgUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  return code === "23505";
}
