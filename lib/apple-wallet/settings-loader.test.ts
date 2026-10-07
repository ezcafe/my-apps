import assert from "node:assert/strict";
import { describe, it } from "node:test";
import forge from "node-forge";
import {
  diagnoseAppleWallet,
  type AppleWalletReasonCode,
} from "@/lib/apple-wallet/config";
import {
  loadAppleWalletSettingsProps,
  type AppleWalletSettingsLoader,
} from "@/lib/apple-wallet/settings-loader";

function makeSignerPem(notAfterMsFromNow: number): string {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  const now = Date.now();
  cert.validity.notBefore = new Date(now - 60_000);
  cert.validity.notAfter = new Date(now + notAfterMsFromNow);
  const attrs = [{ name: "commonName", value: "pass.dev.myapps.test" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return forge.pki.certificateToPem(cert);
}

const DAY_MS = 24 * 60 * 60 * 1000;

const disabledEnv = {
  BASE_URL: "http://localhost:3000",
} as NodeJS.ProcessEnv;

const expiredEnv = {
  APPLE_PASS_TYPE_ID: "pass.dev.myapps.test",
  APPLE_TEAM_ID: "TEAMID1234",
  APPLE_SIGNER_CERT: makeSignerPem(-DAY_MS),
  APPLE_SIGNER_KEY: "-----BEGIN PRIVATE KEY-----\nB\n-----END PRIVATE KEY-----",
  APPLE_WWDR_CERT: "-----BEGIN CERTIFICATE-----\nC\n-----END CERTIFICATE-----",
  BASE_URL: "https://app.example.com",
} as NodeJS.ProcessEnv;

function assertReadinessShape(result: AppleWalletSettingsLoader) {
  assert.equal(typeof result.appleEnabled, "boolean");
  assert.equal(typeof result.healthyForAdd, "boolean");
  assert.ok(Array.isArray(result.reasons));
  assert.ok(result.reasons.length > 0);
  assert.ok(
    result.signerValidTo === null || typeof result.signerValidTo === "string",
  );
}

describe("loadAppleWalletSettingsProps readiness", () => {
  it("returns diagnose reasons when Apple is disabled (no user)", async () => {
    const expected = diagnoseAppleWallet(disabledEnv);
    const result = await loadAppleWalletSettingsProps(undefined, disabledEnv);
    assertReadinessShape(result);
    assert.equal(result.appleEnabled, false);
    assert.equal(result.healthyForAdd, false);
    assert.deepEqual(result.reasons, expected.reasons);
    assert.ok(
      (result.reasons as AppleWalletReasonCode[]).includes("public_url_https") ||
        (result.reasons as AppleWalletReasonCode[]).includes("passkit_certs"),
    );
    assert.ok(!result.reasons.includes("ready"));
    assert.equal(result.status, "not_linked");
  });

  it("enabled + expired fixture yields healthyForAdd false", async () => {
    const expected = diagnoseAppleWallet(expiredEnv);
    assert.equal(expected.enabled, true);
    assert.equal(expected.healthyForAdd, false);

    const result = await loadAppleWalletSettingsProps(undefined, expiredEnv);
    assertReadinessShape(result);
    assert.equal(result.appleEnabled, true);
    assert.equal(result.healthyForAdd, false);
    assert.ok(result.reasons.includes("signer_expired"));
    assert.ok(!result.reasons.includes("ready"));
    assert.equal(result.status, "not_linked");
  });
});
