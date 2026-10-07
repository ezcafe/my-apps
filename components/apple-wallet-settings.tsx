"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { SettingsSection } from "@/components/settings/settings-section";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { APPLE_WALLET_ISSUE_PATH } from "@/lib/apple-wallet/constants";
import type { WalletUiStatus } from "@/lib/apple-wallet/status";

export type AppleWalletSettingsProps = {
  appleEnabled: boolean;
  status: WalletUiStatus;
};

const STATUS_LABEL: Record<WalletUiStatus, string> = {
  not_linked: "Not linked",
  pending: "Pending — waiting for this iPhone to register the pass",
  active: "Active — lock-screen updates on",
  fail: "Could not add pass — try again",
};

export function AppleWalletSettings({
  appleEnabled,
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
    <SettingsSection
      id="settings-apple-wallet"
      title="Apple Wallet"
      description="Baby Care lock-screen updates on your iPhone. Telegram stays under Baby settings."
    >
      <div className="space-y-6">
        {!appleEnabled ? (
          <p className="text-sm text-muted">
            Apple Wallet is unavailable until PassKit certificates and an HTTPS
            public URL are configured on the server.
          </p>
        ) : (
          <>
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
              <p className="text-sm text-muted" data-testid="apple-wallet-status">
                Status: {STATUS_LABEL[status]}
              </p>
            </div>

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
                  Also delete the pass in the Wallet app on your iPhone so it
                  stops updating.
                </p>
              </div>
            ) : null}
          </>
        )}

        {error ? (
          <Alert variant="warning" title="Apple Wallet" description={error} />
        ) : null}
      </div>
    </SettingsSection>
  );
}
