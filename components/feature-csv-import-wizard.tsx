"use client";

import Link from "next/link";
import { useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { ImportWizardStepProgress } from "@/components/import-wizard-step-progress";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { jsonWithIdempotencyHeaders } from "@/lib/idempotency-client";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type WizardStep = "upload" | "preview" | "done";

const STEP_ORDER: WizardStep[] = ["upload", "preview", "done"];

const STEP_META: Record<WizardStep, { title: string; hint: string }> = {
  upload: {
    title: "Upload",
    hint: "CSV with a header row matching export column names.",
  },
  preview: {
    title: "Confirm",
    hint: "Review row count, then commit. Nothing is written until you confirm.",
  },
  done: {
    title: "Done",
    hint: "Import finished.",
  },
};

export function FeatureCsvImportWizard({
  appLabel,
  kind,
  kindLabel,
  settingsHref,
  previewPath,
  commitPath,
  exportHref,
  fieldKeys,
}: {
  appLabel: string;
  kind: string;
  kindLabel: string;
  settingsHref: string;
  previewPath: string;
  commitPath: string;
  exportHref: string;
  fieldKeys: string[];
}) {
  const notify = useNotify();
  const [step, setStep] = useState<WizardStep>("upload");
  const [busy, setBusy] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [imported, setImported] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("upload");
    setBusy(null);
    setFileName("");
    setPreviewId(null);
    setRowCount(0);
    setImported(0);
    setError(null);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setFileName(file.name);
    setBusy("preview");
    try {
      const csv = await file.text();
      const res = await fetch(previewPath, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: kind, csv }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        data?: { previewId?: string; rowCount?: number };
      };
      if (!res.ok) {
        throw new Error(body.error ?? `Preview failed (${res.status})`);
      }
      const id = body.data?.previewId;
      if (!id) throw new Error("Preview did not return an id");
      setPreviewId(id);
      setRowCount(body.data?.rowCount ?? 0);
      setStep("preview");
      notify.success(`Ready to import ${body.data?.rowCount ?? 0} row(s).`);
    } catch (e: unknown) {
      setError(toUserFacingMessage(e, "Preview failed"));
      notify.error(toUserFacingMessage(e, "Preview failed"));
    } finally {
      setBusy(null);
    }
  };

  const handleCommit = async () => {
    if (!previewId) return;
    setBusy("commit");
    setError(null);
    try {
      const res = await fetch(commitPath, {
        method: "POST",
        credentials: "same-origin",
        headers: jsonWithIdempotencyHeaders(),
        body: JSON.stringify({ type: kind, previewId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        data?: { imported?: number };
      };
      if (!res.ok) {
        throw new Error(body.error ?? `Commit failed (${res.status})`);
      }
      setImported(body.data?.imported ?? rowCount);
      setStep("done");
      notify.success(`Imported ${body.data?.imported ?? rowCount} row(s).`);
    } catch (e: unknown) {
      setError(toUserFacingMessage(e, "Import failed"));
      notify.error(toUserFacingMessage(e, "Import failed"));
    } finally {
      setBusy(null);
    }
  };

  const goToStep = (s: WizardStep) => {
    const cur = STEP_ORDER.indexOf(step);
    const tgt = STEP_ORDER.indexOf(s);
    if (tgt >= cur) return;
    if (s === "upload") reset();
    else setStep(s);
  };

  return (
    <div className={cn(SHELL_FULL_SPAN, "min-w-0 space-y-6")}>
      <div className="space-y-1">
        <p className="text-sm text-muted">
          <Link
            href={settingsHref}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {appLabel} settings
          </Link>
          {" / "}
          Import {kindLabel}
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Import {kindLabel}
        </h1>
        <p className="text-sm text-muted">
          Use a CSV exported from this app, or one with these headers:{" "}
          {fieldKeys.join(", ")}.{" "}
          <a
            href={exportHref}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Download current CSV
          </a>
        </p>
      </div>

      <ImportWizardStepProgress
        steps={STEP_ORDER}
        stepMeta={STEP_META}
        current={step}
        onStepClick={goToStep}
        ariaLabel={`${kindLabel} import steps`}
      />

      {error ? (
        <Alert variant="error" title="Import error" description={error} />
      ) : null}

      {step === "upload" ? (
        <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <Field label="CSV file">
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={busy !== null}
              onChange={(e) => {
                void handleFile(e.target.files?.[0] ?? null);
              }}
            />
          </Field>
          {fileName ? (
            <p className="text-sm text-muted">Selected: {fileName}</p>
          ) : null}
          {busy === "preview" ? (
            <p className="text-sm text-muted">Validating preview…</p>
          ) : null}
        </div>
      ) : null}

      {step === "preview" ? (
        <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <p className="text-sm text-foreground">
            Preview ready for <strong>{rowCount}</strong> row(s)
            {fileName ? ` from ${fileName}` : ""}.
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldKeys.map((k) => (
                  <TableRow key={k}>
                    <TableCell>{k}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => void handleCommit()}
            >
              {busy === "commit" ? "Importing…" : "Confirm import"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy !== null}
              onClick={reset}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <p className="text-sm text-foreground">
            Imported <strong>{imported}</strong> row(s).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              Import another file
            </Button>
            <Link
              href={settingsHref}
              className={buttonClassName({ variant: "ghost" })}
            >
              Back to settings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
