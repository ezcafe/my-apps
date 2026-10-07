import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppleWalletSettingsView,
  type AppleWalletSettingsProps,
} from "@/components/apple-wallet-settings";
import {
  APPLE_WALLET_ISSUE_PATH,
  APPLE_WALLET_SETUP_GUIDE_HREF,
} from "@/lib/apple-wallet/constants";

const settingsSrc = readFileSync(
  join(process.cwd(), "components/apple-wallet-settings.tsx"),
  "utf8",
);

const helpSrc = readFileSync(
  join(process.cwd(), "components/api-help.tsx"),
  "utf8",
);

function renderView(props: AppleWalletSettingsProps): string {
  return renderToStaticMarkup(createElement(AppleWalletSettingsView, props));
}

describe("AppleWalletSettings Add delivery", () => {
  it("uses navigational form GET to issue path (not fetch→blob→download)", () => {
    assert.match(settingsSrc, /method=["']GET["']/i);
    assert.ok(
      settingsSrc.includes("APPLE_WALLET_ISSUE_PATH") ||
        settingsSrc.includes(APPLE_WALLET_ISSUE_PATH),
    );
    assert.doesNotMatch(settingsSrc, /createObjectURL/);
    assert.doesNotMatch(settingsSrc, /\.download\s*=/);
    assert.doesNotMatch(
      settingsSrc,
      /fetch\(\s*["']\/api\/apple-wallet\/issue["']/,
    );
  });
});

describe("AppleWalletSettings readiness UI", () => {
  it("maps public_url_https to HTTPS copy and gates Add on healthyForAdd", () => {
    const html = renderView({
      appleEnabled: false,
      healthyForAdd: false,
      reasons: ["public_url_https"],
      signerValidTo: null,
      status: "not_linked",
    });
    assert.match(html, /Public URL must use HTTPS/);
    assert.doesNotMatch(html, /Add to Apple Wallet/);
    assert.match(html, /href="\/help#apple-wallet"/);
    assert.doesNotMatch(html, /APPLE_SIGNER/);
    assert.doesNotMatch(html, /BEGIN CERTIFICATE/);
  });

  it("uses setup guide href /help#apple-wallet", () => {
    const html = renderView({
      appleEnabled: false,
      healthyForAdd: false,
      reasons: ["passkit_certs"],
      signerValidTo: null,
      status: "not_linked",
    });
    assert.match(html, /href="\/help#apple-wallet"/);
    assert.equal(APPLE_WALLET_SETUP_GUIDE_HREF, "/help#apple-wallet");
  });

  it("expired warn hides Add; ready shows ready copy + Add", () => {
    const expired = renderView({
      appleEnabled: true,
      healthyForAdd: false,
      reasons: ["signer_expired"],
      signerValidTo: "2020-01-01T00:00:00.000Z",
      status: "not_linked",
    });
    assert.match(expired, /Signer certificate/);
    assert.match(expired, /expired|renew/i);
    assert.match(expired, /role="status"/);
    assert.doesNotMatch(expired, /Add to Apple Wallet/);

    const ready = renderView({
      appleEnabled: true,
      healthyForAdd: true,
      reasons: ["ready"],
      signerValidTo: "2030-01-01T00:00:00.000Z",
      status: "not_linked",
    });
    assert.match(ready, /Channel ready for Add/);
    assert.match(ready, /Add to Apple Wallet/);
    assert.doesNotMatch(ready, /Signer certificate/);
  });

  it("signer_expiring shows warning Alert and still allows Add", () => {
    const html = renderView({
      appleEnabled: true,
      healthyForAdd: true,
      reasons: ["signer_expiring"],
      signerValidTo: "2026-10-20T00:00:00.000Z",
      status: "not_linked",
    });
    assert.match(html, /Signer certificate/);
    assert.match(html, /expires soon|renew/i);
    assert.match(html, /role="status"/);
    assert.match(html, /Add to Apple Wallet/);
    assert.match(html, new RegExp(`action="${APPLE_WALLET_ISSUE_PATH}"`));
  });

  it("pending status shows HTTPS WS + Wallet notifications checklist", () => {
    const html = renderView({
      appleEnabled: true,
      healthyForAdd: true,
      reasons: ["ready"],
      signerValidTo: "2030-01-01T00:00:00.000Z",
      status: "pending",
    });
    assert.match(html, /data-testid="apple-wallet-pending-checklist"/);
    assert.match(html, /HTTPS.*web service/i);
    assert.match(html, /Wallet notifications/i);
    assert.match(html, /href="\/help#apple-wallet"/);
  });

  it("fail status shows error Alert + retry hint", () => {
    const html = renderView({
      appleEnabled: true,
      healthyForAdd: true,
      reasons: ["ready"],
      signerValidTo: "2030-01-01T00:00:00.000Z",
      status: "fail",
    });
    assert.match(html, /role="alert"/);
    assert.match(html, /Could not add pass/);
    assert.match(html, /try again|Add to Apple Wallet/i);
  });

  it("live stack order: readiness → Add → status → details", () => {
    const html = renderView({
      appleEnabled: true,
      healthyForAdd: true,
      reasons: ["ready"],
      signerValidTo: "2030-01-01T00:00:00.000Z",
      status: "not_linked",
    });
    const readinessIdx = html.search(/data-testid="apple-wallet-readiness"/);
    const addIdx = html.search(/Add to Apple Wallet/);
    const statusIdx = html.search(/data-testid="apple-wallet-status"/);
    const detailsIdx = html.search(/Scan from another device/);
    assert.ok(readinessIdx >= 0, "readiness block");
    assert.ok(addIdx > readinessIdx, "Add after readiness");
    assert.ok(statusIdx > addIdx, "status after Add");
    assert.ok(detailsIdx > statusIdx, "details after status");
  });
});

describe("Help Apple Wallet section", () => {
  it("exposes id=apple-wallet for setup guide hash", () => {
    assert.match(helpSrc, /id=["']apple-wallet["']/);
    assert.match(helpSrc, /Apple Wallet/i);
    assert.match(helpSrc, /setup-apple-wallet\.md|PassKit|HTTPS/i);
  });
});
