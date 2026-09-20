import { babyBirthDateErrorKey } from "@/lib/baby-birth-date-errors";
import {
  markBabyBirthDatePromptVisitDismissed,
  type BabyBirthDatePromptStorage,
} from "@/lib/baby-birth-date-prompt";

const UPDATE_BABY_PROFILE = /* GraphQL */ `
  mutation UpdateBabyProfile($input: UpdateBabyProfileInput!) {
    updateBabyProfile(input: $input) {
      id
      birthDate
    }
  }
`;

export type BabyBirthDateModalRequest = (
  query: string,
  variables: { input: { birthDate: string } },
) => Promise<unknown>;

export type BabyBirthDateModalSaveResult =
  | { ok: true }
  | { ok: false; errorKey: string };

export type BabyBirthDateModalVisitStorage = BabyBirthDatePromptStorage & {
  setItem: (key: string, value: string) => void;
};

/**
 * Home birthday modal Save — profile update + status/profile invalidate.
 * Pure of React; BabyHomeContent maps result onto modal state.
 *
 * On mutation success: marks visit dismiss (durable across remount while
 * status still shows birthDate null) and soft-fails invalidate so caregivers
 * never see a birth-field error for a commit that already landed.
 */
export async function saveBabyBirthDateFromModal(input: {
  birthDate: string;
  request: BabyBirthDateModalRequest;
  onInvalidateProfile?: () => Promise<void>;
  visitStorage?: BabyBirthDateModalVisitStorage;
}): Promise<BabyBirthDateModalSaveResult> {
  const trimmed = input.birthDate.trim();
  if (!trimmed) {
    return { ok: false, errorKey: "settings.birthDateRequired" };
  }
  try {
    await input.request(UPDATE_BABY_PROFILE, {
      input: { birthDate: trimmed },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errorKey: babyBirthDateErrorKey(msg) };
  }

  if (input.visitStorage) {
    markBabyBirthDatePromptVisitDismissed(input.visitStorage);
  }

  try {
    await input.onInvalidateProfile?.();
  } catch {
    /* soft-fail: birth already committed; UI treats as success */
  }
  return { ok: true };
}

/** Not now — visit dismiss so modal stays closed this session. */
export function dismissBabyBirthDateModalVisit(
  sessionStorage: BabyBirthDateModalVisitStorage,
): void {
  markBabyBirthDatePromptVisitDismissed(sessionStorage);
}
