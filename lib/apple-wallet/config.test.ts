import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { describe, it } from "node:test";
import forge from "node-forge";
import {
  diagnoseAppleWallet,
  getAppleWalletBaseUrl,
  isAppleWalletEnabled,
  type AppleWalletReasonCode,
} from "@/lib/apple-wallet/config";

function makeSignerPem(opts: {
  notAfterMsFromNow: number;
  notBeforeMsFromNow?: number;
}): string {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  const now = Date.now();
  cert.validity.notBefore = new Date(
    now + (opts.notBeforeMsFromNow ?? -60_000),
  );
  cert.validity.notAfter = new Date(now + opts.notAfterMsFromNow);
  const attrs = [{ name: "commonName", value: "pass.dev.myapps.test" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return forge.pki.certificateToPem(cert);
}

const DAY_MS = 24 * 60 * 60 * 1000;

const healthySignerPem = makeSignerPem({ notAfterMsFromNow: 90 * DAY_MS });
const expiringSignerPem = makeSignerPem({ notAfterMsFromNow: 15 * DAY_MS });
const expiredSignerPem = makeSignerPem({
  notAfterMsFromNow: -DAY_MS,
  notBeforeMsFromNow: -30 * DAY_MS,
});

const completeApple = {
  APPLE_PASS_TYPE_ID: "pass.dev.myapps.test",
  APPLE_TEAM_ID: "TEAMID1234",
  APPLE_SIGNER_CERT: healthySignerPem,
  APPLE_SIGNER_KEY: "-----BEGIN PRIVATE KEY-----\nB\n-----END PRIVATE KEY-----",
  APPLE_WWDR_CERT: "-----BEGIN CERTIFICATE-----\nC\n-----END CERTIFICATE-----",
  BASE_URL: "https://app.example.com",
} as NodeJS.ProcessEnv;

function assertNoReady(reasons: AppleWalletReasonCode[]) {
  assert.ok(reasons.length > 0, "reasons must not be empty");
  assert.ok(!reasons.includes("ready"), "blocker/warn must not include ready");
}

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

describe("diagnoseAppleWallet", () => {
  it("matches isAppleWalletEnabled for the same env fixtures", () => {
    const fixtures: NodeJS.ProcessEnv[] = [
      completeApple,
      { ...completeApple, BASE_URL: "http://localhost:3000" },
      (() => {
        const e = { ...completeApple };
        delete e.APPLE_TEAM_ID;
        return e;
      })(),
      {
        ...completeApple,
        APPLE_SIGNER_CERT: expiredSignerPem,
      },
    ];
    for (const env of fixtures) {
      assert.equal(
        diagnoseAppleWallet(env).enabled,
        isAppleWalletEnabled(env),
      );
    }
  });

  it("missing HTTPS → public_url_https; no ready", () => {
    const env = {
      ...completeApple,
      BASE_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: undefined,
    } as NodeJS.ProcessEnv;
    const d = diagnoseAppleWallet(env);
    assert.ok(d.reasons.includes("public_url_https"));
    assertNoReady(d.reasons);
    assert.equal(d.enabled, false);
    assert.equal(d.healthyForAdd, false);
  });

  it("missing base URL → public_url_https; no ready", () => {
    const env = {
      ...completeApple,
      BASE_URL: undefined,
      NEXT_PUBLIC_APP_URL: undefined,
    } as NodeJS.ProcessEnv;
    const d = diagnoseAppleWallet(env);
    assert.ok(d.reasons.includes("public_url_https"));
    assertNoReady(d.reasons);
  });

  it("missing each required cert class → passkit_certs; no ready", () => {
    for (const key of [
      "APPLE_PASS_TYPE_ID",
      "APPLE_TEAM_ID",
      "APPLE_SIGNER_CERT",
      "APPLE_SIGNER_KEY",
      "APPLE_WWDR_CERT",
    ] as const) {
      const env = { ...completeApple };
      delete env[key];
      const d = diagnoseAppleWallet(env);
      assert.ok(
        d.reasons.includes("passkit_certs"),
        `expected passkit_certs when missing ${key}`,
      );
      assertNoReady(d.reasons);
      assert.equal(d.healthyForAdd, false);
    }
  });

  it("complete valid env (not expiring) → reasons exactly [ready] + healthyForAdd", () => {
    const d = diagnoseAppleWallet(completeApple);
    assert.deepEqual(d.reasons, ["ready"]);
    assert.equal(d.healthyForAdd, true);
    assert.equal(d.enabled, true);
    assert.ok(d.signerValidTo);
    assert.ok(new Date(d.signerValidTo!).getTime() > Date.now());
  });

  it("expired signer → signer_expired, healthyForAdd false, no ready", () => {
    const env = {
      ...completeApple,
      APPLE_SIGNER_CERT: expiredSignerPem,
    } as NodeJS.ProcessEnv;
    const d = diagnoseAppleWallet(env);
    assert.ok(d.reasons.includes("signer_expired"));
    assertNoReady(d.reasons);
    assert.equal(d.enabled, true);
    assert.equal(d.healthyForAdd, false);
    assert.ok(d.signerValidTo);
    assert.ok(new Date(d.signerValidTo!).getTime() < Date.now());
  });

  it("expiring ≤30d → signer_expiring, healthyForAdd true, no ready", () => {
    const env = {
      ...completeApple,
      APPLE_SIGNER_CERT: expiringSignerPem,
    } as NodeJS.ProcessEnv;
    const d = diagnoseAppleWallet(env);
    assert.ok(d.reasons.includes("signer_expiring"));
    assertNoReady(d.reasons);
    assert.equal(d.enabled, true);
    assert.equal(d.healthyForAdd, true);
    assert.ok(d.signerValidTo);
  });

  it("unreadable signer PEM → signer_unreadable, healthyForAdd false, null validTo, no ready", () => {
    const env = {
      ...completeApple,
      APPLE_SIGNER_CERT:
        "-----BEGIN CERTIFICATE-----\nnot-a-real-cert\n-----END CERTIFICATE-----",
    } as NodeJS.ProcessEnv;
    const d = diagnoseAppleWallet(env);
    assert.ok(d.reasons.includes("signer_unreadable"));
    assertNoReady(d.reasons);
    assert.equal(d.healthyForAdd, false);
    assert.equal(d.signerValidTo, null);
    assert.equal(d.enabled, isAppleWalletEnabled(env));
  });

  it("fixture PEMs parse with Node X509Certificate", () => {
    for (const pem of [healthySignerPem, expiringSignerPem, expiredSignerPem]) {
      assert.doesNotThrow(() => new X509Certificate(pem));
    }
  });
});
