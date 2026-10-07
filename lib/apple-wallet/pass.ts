import { PKPass } from "passkit-generator";
import type { AppleWalletConfig } from "@/lib/apple-wallet/config";

export const APPLE_WEB_SERVICE_PATH = "/api/apple";
export const LATEST_FIELD_KEY = "latest";

/** Default empty-state copy before the first care event. */
export const EMPTY_LATEST_MESSAGE =
  "Care updates will appear here.";

export function latestMessageText(latestMessage: string | null | undefined): string {
  const trimmed = latestMessage?.trim() ?? "";
  return trimmed || EMPTY_LATEST_MESSAGE;
}

/** PassKit field that triggers lock-screen notifications via changeMessage. */
export function buildLatestField(latestMessage: string | null | undefined) {
  return {
    key: LATEST_FIELD_KEY,
    label: "LATEST",
    value: latestMessageText(latestMessage),
    changeMessage: "%@" as const,
  };
}

/** Minimal 1×1 PNG so passkit-generator has required icon assets. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export type BuildApplePassArgs = {
  config: AppleWalletConfig;
  serialNumber: string;
  authToken: string;
  latestMessage: string;
  organizationName?: string;
  description?: string;
};

/** Build and sign a .pkpass for one subscriber. */
export async function buildApplePass(args: BuildApplePassArgs): Promise<Buffer> {
  const {
    config,
    serialNumber,
    authToken,
    latestMessage,
    organizationName = "My Apps",
    description = "Baby Care updates",
  } = args;

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeId,
    teamIdentifier: config.teamId,
    serialNumber,
    authenticationToken: authToken,
    webServiceURL: `${config.baseUrl}${APPLE_WEB_SERVICE_PATH}`,
    organizationName,
    description,
    logoText: organizationName,
    backgroundColor: "rgb(15, 118, 110)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(204, 251, 241)",
    sharingProhibited: true,
    generic: {},
  };

  const pass = new PKPass(
    {
      "pass.json": Buffer.from(JSON.stringify(passJson)),
      "icon.png": TINY_PNG,
      "icon@2x.png": TINY_PNG,
      "icon@3x.png": TINY_PNG,
    },
    {
      wwdr: config.wwdr,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      signerKeyPassphrase: config.signerKeyPassphrase,
    },
  );

  pass.primaryFields.push({
    key: "title",
    label: "BABY CARE",
    value: organizationName,
  });
  const latest = buildLatestField(latestMessage);
  pass.secondaryFields.push(latest);
  pass.backFields.push({
    key: "latest_back",
    label: "Latest update",
    value: latest.value,
  });

  return pass.getAsBuffer();
}
