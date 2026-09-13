"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import {
  BABY_DIAPER_AMOUNTS,
  BABY_DIAPER_COLORS,
  BABY_DIAPER_TEXTURES,
  babyDiaperColorIsRedFlag,
  babyDiaperDefaultAmount,
  babyDiaperTextureNeedsCaution,
  toggleOptionalDiaperChip,
  type BabyDiaperAmount,
  type BabyDiaperColor,
  type BabyDiaperTexture,
} from "@/lib/baby-diaper-detail";
import {
  babyDiaperSheetSaveMutation,
  type BabyDiaperSheetDraft,
} from "@/lib/baby-diaper-quick-plan";

/** False while Save mutation is in flight — Cancel / Escape / ✕ must not discard UI. */
export function babyDiaperSheetAllowDismiss(
  saving: boolean | undefined,
): boolean {
  return !saving;
}

export type BabyDiaperDetailSheetFormProps = {
  diaperKind: "dirty" | "mixed";
  initialDraft?: Partial<BabyDiaperSheetDraft>;
  onCancel: () => void;
  onSave: (
    mutation: ReturnType<typeof babyDiaperSheetSaveMutation>,
  ) => void;
  t: (key: string) => string;
  saving?: boolean;
};

const COLOR_KEY: Record<BabyDiaperColor, string> = {
  yellow: "diaper.colorYellow",
  brown: "diaper.colorBrown",
  green: "diaper.colorGreen",
  black: "diaper.colorBlack",
  white_pale: "diaper.colorWhitePale",
  red_bloody: "diaper.colorRedBloody",
};

const TEXTURE_KEY: Record<BabyDiaperTexture, string> = {
  soft: "diaper.textureSoft",
  seedy: "diaper.textureSeedy",
  mushy: "diaper.textureMushy",
  watery: "diaper.textureWatery",
  hard: "diaper.textureHard",
  formed: "diaper.textureFormed",
};

const AMOUNT_KEY: Record<BabyDiaperAmount, string> = {
  smear: "diaper.amountSmear",
  medium: "diaper.amountMedium",
  blowout: "diaper.amountBlowout",
};

/**
 * Step 2 sheet body — unit-tested without Modal (portal returns null until mounted).
 * Local draft only until Save (W1); Cancel never calls onSave.
 */
export function BabyDiaperDetailSheetForm({
  diaperKind,
  initialDraft,
  onCancel,
  onSave,
  t,
  saving,
}: BabyDiaperDetailSheetFormProps) {
  const [color, setColor] = useState<BabyDiaperColor | null>(
    initialDraft?.color ?? null,
  );
  const [texture, setTexture] = useState<BabyDiaperTexture | null>(
    initialDraft?.texture ?? null,
  );
  const [amount, setAmount] = useState<BabyDiaperAmount>(
    initialDraft?.amount ?? babyDiaperDefaultAmount(),
  );

  const showColorWarn = color != null && babyDiaperColorIsRedFlag(color);
  const showTextureCaution =
    texture != null && babyDiaperTextureNeedsCaution(texture);

  return (
    <div className="space-y-4" data-diaper-sheet-form="">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("diaper.colorLabel")}</legend>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 5.5rem), 1fr))",
          }}
        >
          {BABY_DIAPER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              data-diaper-color={c}
              aria-pressed={color === c}
              onClick={() => setColor((prev) => toggleOptionalDiaperChip(prev, c))}
              className={cn(
                "min-h-11 rounded-[var(--radius-sm)] border border-border px-2 text-sm transition-colors",
                color === c && "border-accent bg-accent/10",
              )}
            >
              {t(COLOR_KEY[c])}
            </button>
          ))}
        </div>
        {showColorWarn ? (
          <p
            role="status"
            data-diaper-warn="color-red-flag"
            className="text-sm text-destructive"
          >
            {t("diaper.colorRedFlagWarn")}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {t("diaper.textureLabel")}
        </legend>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 5.5rem), 1fr))",
          }}
        >
          {BABY_DIAPER_TEXTURES.map((tex) => (
            <button
              key={tex}
              type="button"
              data-diaper-texture={tex}
              aria-pressed={texture === tex}
              onClick={() =>
                setTexture((prev) => toggleOptionalDiaperChip(prev, tex))
              }
              className={cn(
                "min-h-11 rounded-[var(--radius-sm)] border border-border px-2 text-sm transition-colors",
                texture === tex && "border-accent bg-accent/10",
              )}
            >
              {t(TEXTURE_KEY[tex])}
            </button>
          ))}
        </div>
        {showTextureCaution ? (
          <p
            role="status"
            data-diaper-warn="texture-caution"
            className="text-sm text-destructive"
          >
            {t("diaper.textureCautionWarn")}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {t("diaper.amountLabel")}
        </legend>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 5.5rem), 1fr))",
          }}
        >
          {BABY_DIAPER_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              data-diaper-amount={a}
              aria-pressed={amount === a}
              onClick={() => setAmount(a)}
              className={cn(
                "min-h-11 rounded-[var(--radius-sm)] border border-border px-2 text-sm transition-colors",
                amount === a && "border-accent bg-accent/10",
              )}
            >
              {t(AMOUNT_KEY[a])}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={saving}
          onClick={onCancel}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={saving}
          onClick={() =>
            onSave(
              babyDiaperSheetSaveMutation(diaperKind, {
                color,
                texture,
                amount,
              }),
            )
          }
        >
          {t("home.diaperSheetSave")}
        </Button>
      </div>
    </div>
  );
}

export type BabyDiaperDetailSheetProps = {
  open: boolean;
  diaperKind: "dirty" | "mixed";
  initialDraft?: Partial<BabyDiaperSheetDraft>;
  onClose: () => void;
  onSave: (
    mutation: ReturnType<typeof babyDiaperSheetSaveMutation>,
  ) => void;
  t: (key: string) => string;
  saving?: boolean;
};

/** Step 2 sheet — local draft only until Save (W1). */
export function BabyDiaperDetailSheet({
  open,
  diaperKind,
  initialDraft,
  onClose,
  onSave,
  t,
  saving,
}: BabyDiaperDetailSheetProps) {
  const title =
    diaperKind === "dirty" ? t("diaper.dirty") : t("diaper.mixed");

  const dismiss = () => {
    if (!babyDiaperSheetAllowDismiss(saving)) return;
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={title}
      closeDisabled={!babyDiaperSheetAllowDismiss(saving)}
    >
      <BabyDiaperDetailSheetForm
        diaperKind={diaperKind}
        initialDraft={initialDraft}
        onCancel={dismiss}
        onSave={onSave}
        t={t}
        saving={saving}
      />
    </Modal>
  );
}
