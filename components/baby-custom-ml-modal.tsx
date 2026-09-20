"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  babyHomeIsoToLocalInput,
  babyHomeLocalInputToIso,
} from "@/lib/baby-home-custom-time";
import { parseBabyCustomMl } from "@/lib/baby-quick-value-steppers";

export type BabyCustomMlConfirm = {
  ml: number;
  iso: string;
};

export type BabyCustomMlFormProps = {
  initialMl: number;
  /** Existing pending ISO, or null for “now” seed. */
  initialIso?: string | null;
  onCancel: () => void;
  onConfirm: (value: BabyCustomMlConfirm) => void;
  t: (key: string) => string;
  /** Seed error for markup tests (no RTL submit). */
  initialErrorKey?: string | null;
};

/** Modal body — unit-tested without Modal (portal returns null until mounted). */
export function BabyCustomMlForm({
  initialMl,
  initialIso = null,
  onCancel,
  onConfirm,
  t,
  initialErrorKey = null,
}: BabyCustomMlFormProps) {
  const [raw, setRaw] = useState(String(initialMl));
  const [timeRaw, setTimeRaw] = useState(() =>
    initialIso
      ? babyHomeIsoToLocalInput(initialIso)
      : babyHomeIsoToLocalInput(new Date().toISOString()),
  );
  const [errorKey, setErrorKey] = useState<string | null>(initialErrorKey);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmedTime = timeRaw.trim();
    if (!trimmedTime) {
      setErrorKey("home.customTimeInvalid");
      return;
    }
    const iso = babyHomeLocalInputToIso(trimmedTime);
    if (!Number.isFinite(Date.parse(iso))) {
      setErrorKey("home.customTimeInvalid");
      return;
    }
    const parsed = parseBabyCustomMl(raw);
    if (!parsed.ok) {
      setErrorKey(parsed.reasonKey);
      return;
    }
    setErrorKey(null);
    onConfirm({ ml: parsed.ml, iso });
  }

  const timeInvalid = errorKey === "home.customTimeInvalid";
  const mlInvalid = errorKey != null && !timeInvalid;

  return (
    <form
      data-testid="baby-custom-ml-form"
      onSubmit={submit}
      className="space-y-4"
    >
      <Field
        label={t("home.customTimeLabel")}
        hint={timeInvalid ? undefined : t("home.customTimeHint")}
        error={timeInvalid ? t(errorKey!) : undefined}
      >
        <Input
          type="datetime-local"
          value={timeRaw}
          aria-invalid={timeInvalid ? true : undefined}
          onChange={(e) => {
            setTimeRaw(e.target.value);
            setErrorKey(null);
          }}
          autoFocus
        />
      </Field>
      <Field
        label={t("home.customMlLabel")}
        hint={mlInvalid ? undefined : t("home.customMlHint")}
        error={mlInvalid ? t(errorKey!) : undefined}
      >
        <Input
          type="text"
          inputMode="numeric"
          value={raw}
          aria-invalid={mlInvalid ? true : undefined}
          onChange={(e) => {
            setRaw(e.target.value);
            setErrorKey(null);
          }}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="lg">
          {t("home.customMlUse")}
        </Button>
      </div>
    </form>
  );
}

export function BabyCustomMlModal({
  open,
  initialMl,
  initialIso = null,
  onClose,
  onConfirm,
  t,
}: {
  open: boolean;
  initialMl: number;
  initialIso?: string | null;
  onClose: () => void;
  onConfirm: (value: BabyCustomMlConfirm) => void;
  t: (key: string) => string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={t("home.customTitle")}>
      {open ? (
        <BabyCustomMlForm
          key={`${initialMl}-${initialIso ?? "empty"}`}
          initialMl={initialMl}
          initialIso={initialIso}
          onCancel={onClose}
          onConfirm={onConfirm}
          t={t}
        />
      ) : null}
    </Modal>
  );
}
