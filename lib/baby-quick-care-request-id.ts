/** One fresh id per accepted press. A retry reuses the stored pending id. */
export function newBabyQuickRequestId(): string {
  return crypto.randomUUID();
}
