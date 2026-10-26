"use client";

import { useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type PreviewResponse = {
  previewId: string;
  warnings?: string[];
  presentKinds?: string[];
  counts?: Record<string, number>;
};

type CommitResponse = {
  committedKinds?: string[];
  failedKind?: string | null;
  error?: string | null;
};

export function FeatureImportAllWizard({
  title,
  description,
  previewPath,
  commitPath,
  exportAllHref,
}: {
  title: string;
  description: string;
  previewPath: string;
  commitPath: string;
  exportAllHref: string;
}) {
  const notify = useNotify();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function runPreview() {
    if (!file) {
      notify.error("Choose a ZIP file first");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(previewPath, { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as PreviewResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Preview failed");
      }
      setPreview(body);
      notify.success("Preview ready", "Review kinds then confirm import.");
    } catch (err: unknown) {
      notify.error("Preview failed", toUserFacingMessage(err, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (!preview?.previewId) return;
    setBusy(true);
    try {
      const res = await fetch(commitPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId: preview.previewId }),
      });
      const body = (await res.json().catch(() => ({}))) as CommitResponse & {
        error?: string;
      };
      if (!res.ok && !body.committedKinds?.length) {
        throw new Error(body.error ?? "Commit failed");
      }
      if (body.failedKind) {
        notify.error(
          `Stopped at ${body.failedKind}`,
          body.error ??
            `Committed: ${(body.committedKinds ?? []).join(", ") || "none"}`,
        );
      } else {
        notify.success(
          "Import all complete",
          `Kinds: ${(body.committedKinds ?? []).join(", ") || "none"}`,
        );
      }
      setPreview(null);
      setFile(null);
    } catch (err: unknown) {
      notify.error("Commit failed", toUserFacingMessage(err, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 fx-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <p className="text-sm text-muted">
        Need a template?{" "}
        <a
          href={exportAllHref}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Download Export all ZIP
        </a>
      </p>
      <Field label="ZIP file">
        <input
          type="file"
          accept=".zip,application/zip"
          className="block w-full text-sm text-foreground"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !file}
          onClick={() => void runPreview()}
        >
          Preview
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={busy || !preview?.previewId}
          onClick={() => void runCommit()}
        >
          Confirm import
        </Button>
      </div>
      {preview ? (
        <div className="rounded-[var(--radius-md)] border border-border bg-background p-3 text-sm">
          <p className="font-medium text-foreground">Kinds in ZIP</p>
          <ul className="mt-2 list-inside list-disc text-muted">
            {(preview.presentKinds ?? []).map((k) => (
              <li key={k}>
                {k}
                {preview.counts?.[k] != null ? ` (${preview.counts[k]} rows)` : ""}
              </li>
            ))}
          </ul>
          {(preview.warnings ?? []).length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-muted">
              {preview.warnings!.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
