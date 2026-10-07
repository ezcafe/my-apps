"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { SettingsSection } from "@/components/settings/settings-section";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  APPLE_WALLET_ISSUE_PATH,
  APPLE_WALLET_SETUP_GUIDE_HREF,
  type AppleWalletReasonCode,
} from "@/lib/apple-wallet/constants";
import type { WalletUiStatus } from "@/lib/apple-wallet/status";

export type AppleWalletSettingsProps = {
  appleEnabled: boolean;
  healthyForAdd: boolean;
  reasons: AppleWalletReasonCode[];
  signerValidTo: string | null;
  status: WalletUiStatus;
};

export type AppleWalletSettingsViewProps = AppleWalletSettingsProps & {
  pending?: boolean;
  error?: string | null;
  qrDataUrl?: string | null;
  qrExpires?: string | null;
  onAddSubmit?: () => void;
  onShowQr?: () => void;
  onUnlink?: () => void;
};

const STATUS_LABEL: Record<WalletUiStatus, string> = {
  not_linked: "Not linked",
  pending: "Pending — waiting for this iPhone to register the pass",
  active: "Active — lock-screen updates on",
  fail: "Could not add pass — try again",
};

const REASON_COPY: Record<Exclude<AppleWalletReasonCode, "ready">, string> = {
  public_url_https: "Public URL must use HTTPS",
  passkit_certs: "PassKit certificates missing on server",
  signer_unreadable:
    "Signer certificate cannot be read — check setup",
  signer_expired: "Signer certificate expired — renew",
  signer_expiring: "Signer certificate expires soon — renew",
};

function formatValidTo(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function reasonMessage(
  code: Exclude<AppleWalletReasonCode, "ready">,
  signerValidTo: string | null,
): string {
  const base = REASON_COPY[code];
  if (code === "signer_expired" || code === "signer_expiring") {
    const dateLabel = formatValidTo(signerValidTo);
    return dateLabel ? `${base} (${dateLabel})` : base;
  }
  return base;
}

function showSetupGuideLink(
  reasons: AppleWalletReasonCode[],
  status: WalletUiStatus,
): boolean {
  if (status === "pending") return true;
  if (reasons.includes("ready")) return false;
  return reasons.length > 0;
}

/** Presentational Settings body — exported for markup tests. */
export function AppleWalletSettingsView({
  appleEnabled,
  healthyForAdd,
  reasons,
  signerValidTo,
  status,
  pending = false,
  error = null,
  qrDataUrl = null,
  qrExpires = null,
  onAddSubmit,
  onShowQr,
  onUnlink,
}: AppleWalletSettingsViewProps) {
  const isReady = reasons.length === 1 && reasons[0] === "ready";
  const blockerReasons = reasons.filter(
    (r): r is Exclude<AppleWalletReasonCode, "ready"> => r !== "ready",
  );
  const hasCertWarn =
    reasons.includes("signer_expired") || reasons.includes("signer_expiring");
  const setupLinkVisible = showSetupGuideLink(reasons, status);

  return (
    <SettingsSection
      id="settings-apple-wallet"
      title="Apple Wallet"
      description="Baby Care lock-screen updates on your iPhone. Telegram stays under Baby settings."
    >
      <div className="space-y-6">
        <div className="space-y-3" data-testid="apple-wallet-readiness">
          {isReady ? (
            <p className="text-sm text-foreground">Channel ready for Add</p>
          ) : null}

          {hasCertWarn
            ? blockerReasons
                .filter(
                  (r) => r === "signer_expired" || r === "signer_expiring",
                )
                .map((code) => (
                  <Alert
                    key={code}
                    variant="warning"
                    title="Signer certificate"
                    description={reasonMessage(code, signerValidTo)}
                  />
                ))
            : null}

          {!isReady && !hasCertWarn && blockerReasons.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-sm text-muted">
              {blockerReasons.map((code) => (
                <li key={code}>{reasonMessage(code, signerValidTo)}</li>
              ))}
            </ul>
          ) : null}

          {!isReady && hasCertWarn
            ? blockerReasons
                .filter(
                  (r) => r !== "signer_expired" && r !== "signer_expiring",
                )
                .map((code) => (
                  <p key={code} className="text-sm text-muted">
                    {reasonMessage(code, signerValidTo)}
                  </p>
                ))
            : null}

          {setupLinkVisible ? (
            <p className="text-sm">
              <Link
                href={APPLE_WALLET_SETUP_GUIDE_HREF}
                className="font-medium text-accent underline-offset-4 hover:underline"
              >
                Apple Wallet setup guide
              </Link>
            </p>
          ) : null}
        </div>

        {healthyForAdd ? (
          <div className="space-y-3">
            {/*
              Navigational GET (not fetch→blob→download): Safari/Wallet needs a
              top-level navigation to application/vnd.apple.pkpass.
            */}
            <form
              method="GET"
              action={APPLE_WALLET_ISSUE_PATH}
              onSubmit={onAddSubmit}
            >
              <Button type="submit" variant="primary" disabled={pending}>
                Add to Apple Wallet
              </Button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {appleEnabled
              ? "Fix server setup or renew the signer certificate before adding a pass."
              : "Fix server setup before adding a pass."}
          </p>
        )}

        {appleEnabled || healthyForAdd || status !== "not_linked" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted" data-testid="apple-wallet-status">
              Status: {STATUS_LABEL[status]}
            </p>

            {status === "pending" ? (
              <ul
                className="list-inside list-disc space-y-1 text-sm text-muted"
                data-testid="apple-wallet-pending-checklist"
              >
                <li>Confirm the public URL uses HTTPS for the PassKit web service</li>
                <li>Allow Wallet notifications on this iPhone</li>
                <li>Open the pass once in Wallet so the device can register</li>
              </ul>
            ) : null}

            {status === "fail" ? (
              <Alert
                variant="error"
                title="Could not add pass"
                description="Try again with Add to Apple Wallet, or check that the public URL uses HTTPS."
              />
            ) : null}
          </div>
        ) : null}

        {healthyForAdd ? (
          <details className="rounded-[var(--radius-sm)] bg-background">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-200 hover:text-foreground [&::-webkit-details-marker]:hidden">
              Scan from another device
            </summary>
            <div className="space-y-3 border-t border-border px-3 py-3">
              <p className="text-sm text-muted">
                Mint a short-lived link and show a QR code for another iPhone.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={onShowQr}
              >
                Show QR
              </Button>
              {qrDataUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Apple Wallet issue QR code"
                    className="h-[200px] w-[200px] rounded-[var(--radius-sm)] bg-background"
                  />
                  {qrExpires ? (
                    <p className="text-sm text-muted">
                      Expires {new Date(qrExpires).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        {status !== "not_linked" ? (
          <div className="space-y-2 border-t border-border pt-6">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={onUnlink}
            >
              Unlink Apple Wallet
            </Button>
            <p className="text-sm text-muted">
              Also delete the pass in the Wallet app on your iPhone so it stops
              updating.
            </p>
          </div>
        ) : null}

        {error ? (
          <Alert variant="warning" title="Apple Wallet" description={error} />
        ) : null}
      </div>
    </SettingsSection>
  );
}

export function AppleWalletSettings({
  appleEnabled,
  healthyForAdd,
  reasons,
  signerValidTo,
  status: initialStatus,
}: AppleWalletSettingsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrExpires, setQrExpires] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  function onAddSubmit() {
    setError(null);
    // Optimistic pending before navigational .pkpass delivery (Safari/Wallet).
    setStatus((prev) => (prev === "active" ? "active" : "pending"));
    router.refresh();
  }

  function onShowQr() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/apple-wallet/issue-token", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(body?.error ?? "Could not create QR link");
          return;
        }
        const json = (await res.json()) as {
          data: { url: string; expiresAt: string };
        };
        const dataUrl = await QRCode.toDataURL(json.data.url, {
          margin: 1,
          width: 200,
        });
        setQrDataUrl(dataUrl);
        setQrExpires(json.data.expiresAt);
      } catch {
        setError("Could not create QR link");
      }
    });
  }

  function onUnlink() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/apple-wallet/subscription", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!res.ok && res.status !== 204) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(body?.error ?? "Could not unlink");
          return;
        }
        setStatus("not_linked");
        setQrDataUrl(null);
        setQrExpires(null);
        router.refresh();
      } catch {
        setError("Could not unlink");
      }
    });
  }

  return (
    <AppleWalletSettingsView
      appleEnabled={appleEnabled}
      healthyForAdd={healthyForAdd}
      reasons={reasons}
      signerValidTo={signerValidTo}
      status={status}
      pending={pending}
      error={error}
      qrDataUrl={qrDataUrl}
      qrExpires={qrExpires}
      onAddSubmit={onAddSubmit}
      onShowQr={onShowQr}
      onUnlink={onUnlink}
    />
  );
}
