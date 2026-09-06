import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

/**
 * Minimal Playwright setup for Baby Care smoke e2e.
 *
 * Auth: Pocket ID / NextAuth. Optional session via storageState —
 * see E2E_* vars in `.env.example` and `e2e/helpers/auth.ts`.
 */
// Prefer localhost over 127.0.0.1 so Next.js dev assets hydrate (allowedDevOrigins).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const storageStatePath = process.env.E2E_STORAGE_STATE?.trim();
const storageState =
  storageStatePath && storageStatePath.length > 0
    ? path.resolve(storageStatePath)
    : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // One worker: parallel Next soft-nav + GraphQL was flaky (ResponseAborted / empty shell).
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    ...(storageState ? { storageState } : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.E2E_WEB_SERVER_COMMAND ?? "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
