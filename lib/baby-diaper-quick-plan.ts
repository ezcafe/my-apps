import {
  babyDiaperDefaultAmount,
  type BabyDiaperAmount,
  type BabyDiaperColor,
  type BabyDiaperKind,
  type BabyDiaperTexture,
} from "@/lib/baby-diaper-detail";

export type BabyDiaperQuickPlan =
  | {
      kind: "instantSave";
      diaperKind: "wet" | "dry";
      /** W1: no sheet mutation — save immediately with kind only. */
      mutation: { diaperKind: "wet" | "dry" };
    }
  | {
      kind: "openSheet";
      diaperKind: "dirty" | "mixed";
      /** Draft stays local until Save (W1). */
      draftDefaults: {
        color: BabyDiaperColor | null;
        texture: BabyDiaperTexture | null;
        amount: BabyDiaperAmount;
      };
    };

/** Kind tile order for the 2×2 grid: Wet | Poop / Mixed | Dry. */
export const BABY_DIAPER_KIND_TILES: readonly BabyDiaperKind[] = [
  "wet",
  "dirty",
  "mixed",
  "dry",
] as const;

/** S1: Wet/Dry → instant; Poop/Mixed → open sheet. */
export function planBabyDiaperKindTap(
  diaperKind: BabyDiaperKind,
): BabyDiaperQuickPlan {
  if (diaperKind === "wet" || diaperKind === "dry") {
    return {
      kind: "instantSave",
      diaperKind,
      mutation: { diaperKind },
    };
  }
  return {
    kind: "openSheet",
    diaperKind,
    draftDefaults: {
      color: null,
      texture: null,
      amount: babyDiaperDefaultAmount(),
    },
  };
}

export type BabyDiaperSheetDraft = {
  color: BabyDiaperColor | null;
  texture: BabyDiaperTexture | null;
  amount: BabyDiaperAmount;
};

/** Home save plan: always include amount (default medium). */
export function babyDiaperSheetSaveMutation(
  diaperKind: "dirty" | "mixed",
  draft: BabyDiaperSheetDraft,
): {
  diaperKind: "dirty" | "mixed";
  diaperColor?: BabyDiaperColor;
  diaperTexture?: BabyDiaperTexture;
  diaperAmount: BabyDiaperAmount;
} {
  return {
    diaperKind,
    ...(draft.color ? { diaperColor: draft.color } : {}),
    ...(draft.texture ? { diaperTexture: draft.texture } : {}),
    diaperAmount: draft.amount ?? babyDiaperDefaultAmount(),
  };
}
