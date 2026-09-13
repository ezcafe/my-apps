"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { parseBabyCustomMl } from "@/lib/baby-quick-value-steppers";

export type BabyCustomMlFormProps = {
  initialMl: number;
  onCancel: () => void;
  onConfirm: (ml: number) => void;
  t: (key: string) => string;
  /** Seed error for markup tests (no RTL submit). */
  initialErrorKey?: string | null;
};

/** Modal body — unit-tested without Modal (portal returns null until mounted). */
export function BabyCustomMlForm({
  initialMl,
  onCancel,
  onConfirm,
  t,
  initialErrorKey = null,
}: BabyCustomMlFormProps) {
  const [raw, setRaw] = useState(String(initialMl));
  const [errorKey, setErrorKey] = useState<string | null>(initialErrorKey);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseBabyCustomMl(raw);
    if (!parsed.ok) {
      setErrorKey(parsed.reasonKey);
      return;
    }
    setErrorKey(null);
    onConfirm(parsed.ml);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label={t("home.customMlLabel")}
        hint={errorKey ? undefined : t("home.customMlHint")}
        error={errorKey ? t(errorKey) : undefined}
      >
        <Input
          type="text"
          inputMode="numeric"
          value={raw}
          aria-invalid={errorKey ? true : undefined}
          onChange={(e) => {
            setRaw(e.target.value);
            setErrorKey(null);
          }}
          autoFocus
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
  onClose,
  onConfirm,
  t,
}: {
  open: boolean;
  initialMl: number;
  onClose: () => void;
  onConfirm: (ml: number) => void;
  t: (key: string) => string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={t("home.customMlTitle")}>
      <BabyCustomMlForm
        initialMl={initialMl}
        onCancel={onClose}
        onConfirm={onConfirm}
        t={t}
      />
    </Modal>
  );
}
