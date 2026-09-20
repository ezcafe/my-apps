"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import type { BabyDiaperKind } from "@/lib/baby-diaper-detail";
import { BABY_DIAPER_KIND_TILES } from "@/lib/baby-diaper-quick-plan";
import {
  babyHomeIsoToLocalInput,
  babyHomeLocalInputToIso,
  parseBabyHomeNapDurationMinutes,
} from "@/lib/baby-home-custom-time";

export type BabyCustomTimeFields =
  | "time"
  | "time+duration"
  | "time+diaperKind";

export type BabyCustomTimeConfirm = {
  iso: string;
  durationMinutes?: number | null;
  diaperKind?: BabyDiaperKind;
};

export type BabyCustomTimeFormProps = {
  /** Diaper = time + kind; Nap = time + duration; legacy = time only. */
  fields?: BabyCustomTimeFields;
  /** Existing pending ISO, or null for “now” seed. */
  initialIso: string | null;
  initialDurationMinutes?: number | null;
  initialDiaperKind?: BabyDiaperKind | null;
  onCancel: () => void;
  onConfirm: (value: BabyCustomTimeConfirm) => void;
  onClear?: () => void;
  t: (key: string) => string;
  initialErrorKey?: string | null;
};

const DIAPER_KIND_LABEL_KEY: Record<BabyDiaperKind, string> = {
  wet: "home.diaperTileWet",
  dirty: "home.diaperTilePoop",
  mixed: "home.diaperTileMixed",
  dry: "home.diaperTileDry",
};

/** Modal body — unit-tested without Modal portal. */
export function BabyCustomTimeForm({
  fields = "time",
  initialIso,
  initialDurationMinutes = null,
  initialDiaperKind = null,
  onCancel,
  onConfirm,
  onClear,
  t,
  initialErrorKey = null,
}: BabyCustomTimeFormProps) {
  const withDuration = fields === "time+duration";
  const withDiaperKind = fields === "time+diaperKind";
  const [raw, setRaw] = useState(() =>
    initialIso
      ? babyHomeIsoToLocalInput(initialIso)
      : babyHomeIsoToLocalInput(new Date().toISOString()),
  );
  const [durationRaw, setDurationRaw] = useState(() =>
    initialDurationMinutes != null && initialDurationMinutes > 0
      ? String(initialDurationMinutes)
      : "",
  );
  const [diaperKind, setDiaperKind] = useState<BabyDiaperKind | null>(
    initialDiaperKind,
  );
  const [errorKey, setErrorKey] = useState<string | null>(initialErrorKey);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = raw.trim();
    if (!trimmed) {
      setErrorKey("home.customTimeInvalid");
      return;
    }
    const iso = babyHomeLocalInputToIso(trimmed);
    if (!Number.isFinite(Date.parse(iso))) {
      setErrorKey("home.customTimeInvalid");
      return;
    }
    let durationMinutes: number | null = null;
    if (withDuration) {
      const trimmedDuration = durationRaw.trim();
      if (trimmedDuration) {
        const parsed = parseBabyHomeNapDurationMinutes(trimmedDuration);
        if (!parsed.ok) {
          setErrorKey(parsed.reasonKey);
          return;
        }
        durationMinutes = parsed.minutes;
      }
    }
    if (withDiaperKind) {
      if (diaperKind == null) {
        setErrorKey("home.customDiaperKindRequired");
        return;
      }
      setErrorKey(null);
      onConfirm({ iso, durationMinutes: null, diaperKind });
      return;
    }
    setErrorKey(null);
    onConfirm(
      withDuration ? { iso, durationMinutes } : { iso, durationMinutes: null },
    );
  }

  return (
    <form
      data-testid="baby-custom-time-form"
      onSubmit={submit}
      className="space-y-4"
    >
      <Field
        label={t("home.customTimeLabel")}
        hint={errorKey === "home.customTimeInvalid" ? undefined : t("home.customTimeHint")}
        error={
          errorKey === "home.customTimeInvalid" ? t(errorKey) : undefined
        }
      >
        <Input
          type="datetime-local"
          value={raw}
          aria-invalid={
            errorKey === "home.customTimeInvalid" ? true : undefined
          }
          onChange={(e) => {
            setRaw(e.target.value);
            setErrorKey(null);
          }}
          autoFocus
        />
      </Field>
      {withDuration ? (
        <Field
          label={t("home.customDurationLabel")}
          hint={
            errorKey === "home.customDurationInvalid"
              ? undefined
              : t("home.customDurationHint")
          }
          error={
            errorKey === "home.customDurationInvalid" ? t(errorKey) : undefined
          }
        >
          <Input
            data-testid="baby-custom-duration"
            type="text"
            inputMode="numeric"
            value={durationRaw}
            aria-invalid={
              errorKey === "home.customDurationInvalid" ? true : undefined
            }
            onChange={(e) => {
              setDurationRaw(e.target.value);
              setErrorKey(null);
            }}
          />
        </Field>
      ) : null}
      {withDiaperKind ? (
        <Field
          label={t("home.customDiaperWhatLabel")}
          error={
            errorKey === "home.customDiaperKindRequired"
              ? t(errorKey)
              : undefined
          }
        >
          <div
            role="group"
            data-testid="baby-custom-diaper-kind"
            className="grid grid-cols-2 gap-2"
          >
            {BABY_DIAPER_KIND_TILES.map((kind) => {
              const selected = diaperKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  data-diaper-kind={kind}
                  data-selected={selected || undefined}
                  aria-pressed={selected || undefined}
                  onClick={() => {
                    setDiaperKind(kind);
                    setErrorKey(null);
                  }}
                  className={cn(
                    "rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm font-medium fx-press transition-colors",
                    selected
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-border bg-surface text-foreground hover:bg-secondary-hover",
                  )}
                >
                  {t(DIAPER_KIND_LABEL_KEY[kind])}
                </button>
              );
            })}
          </div>
        </Field>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        {onClear && initialIso ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="mr-auto"
            onClick={onClear}
          >
            {t("home.customTimeClear")}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="lg">
          {t("home.customTimeUse")}
        </Button>
      </div>
    </form>
  );
}

export function BabyCustomTimeModal({
  open,
  fields = "time",
  initialIso,
  initialDurationMinutes = null,
  initialDiaperKind = null,
  onClose,
  onConfirm,
  onClear,
  t,
}: {
  open: boolean;
  fields?: BabyCustomTimeFields;
  initialIso: string | null;
  initialDurationMinutes?: number | null;
  initialDiaperKind?: BabyDiaperKind | null;
  onClose: () => void;
  onConfirm: (value: BabyCustomTimeConfirm) => void;
  onClear?: () => void;
  t: (key: string) => string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={t("home.customTitle")}>
      {open ? (
        <BabyCustomTimeForm
          key={`${initialIso ?? "empty"}-${initialDurationMinutes ?? ""}-${initialDiaperKind ?? ""}-${fields}`}
          fields={fields}
          initialIso={initialIso}
          initialDurationMinutes={initialDurationMinutes}
          initialDiaperKind={initialDiaperKind}
          onCancel={onClose}
          onConfirm={onConfirm}
          onClear={
            onClear
              ? () => {
                  onClear();
                  onClose();
                }
              : undefined
          }
          t={t}
        />
      ) : null}
    </Modal>
  );
}
