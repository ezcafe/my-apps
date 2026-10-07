import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAppleWalletBaseUrl,
  isAppleWalletEnabled,
} from "@/lib/apple-wallet/config";

const completeApple = {
  APPLE_PASS_TYPE_ID: "pass.dev.myapps.test",
  APPLE_TEAM_ID: "TEAMID1234",
  APPLE_SIGNER_CERT: "-----BEGIN CERTIFICATE-----\nA\n-----END CERTIFICATE-----",
  APPLE_SIGNER_KEY: "-----BEGIN PRIVATE KEY-----\nB\n-----END PRIVATE KEY-----",
  APPLE_WWDR_CERT: "-----BEGIN CERTIFICATE-----\nC\n-----END CERTIFICATE-----",
  BASE_URL: "https://app.example.com",
} as NodeJS.ProcessEnv;

describe("isAppleWalletEnabled", () => {
  it("is false when any required APPLE_* is missing", () => {
    for (const key of [
      "APPLE_PASS_TYPE_ID",
      "APPLE_TEAM_ID",
      "APPLE_SIGNER_CERT",
      "APPLE_SIGNER_KEY",
      "APPLE_WWDR_CERT",
    ] as const) {
      const env = { ...completeApple };
      delete env[key];
      assert.equal(isAppleWalletEnabled(env), false, `missing ${key}`);
    }
  });

  it("is true when complete APPLE_* and HTTPS base URL are set", () => {
    assert.equal(isAppleWalletEnabled(completeApple), true);
  });

  it("isAppleWalletEnabled is false when BASE_URL missing or not HTTPS", () => {
    assert.equal(
      isAppleWalletEnabled({
        ...completeApple,
        BASE_URL: undefined,
        NEXT_PUBLIC_APP_URL: undefined,
      } as NodeJS.ProcessEnv),
      false,
    );
    assert.equal(
      isAppleWalletEnabled({
        ...completeApple,
        BASE_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: undefined,
      } as NodeJS.ProcessEnv),
      false,
    );
    assert.equal(
      getAppleWalletBaseUrl({
        NEXT_PUBLIC_APP_URL: "https://tunnel.example.com/",
      } as NodeJS.ProcessEnv),
      "https://tunnel.example.com",
    );
  });
});
