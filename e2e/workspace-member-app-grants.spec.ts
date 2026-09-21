import { test } from "@playwright/test";
import { hasAuthStorage } from "./helpers/auth";

/**
 * Per-member app grants (Money vs Baby) need two signed-in users.
 * Dual E2E_STORAGE_STATE is not wired yet — see e2e/helpers/auth.ts.
 * Enforcement is covered by unit tests:
 *   lib/workspace-app-access.test.ts
 *   lib/workspace-shareable-apps.test.ts
 *   lib/validators/workspace-members.test.ts
 */
test.describe("workspace per-member app grants", () => {
  test("add member with money-only blocks baby — blocked without dual auth", async () => {
    test.skip(
      !hasAuthStorage(),
      "E2E_STORAGE_STATE unset — unit coverage for grants; dual-user e2e blocked",
    );
    test.skip(
      true,
      "Blocked: second storageState for invitee not wired (auth.ts docs)",
    );
  });
});
