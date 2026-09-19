import {
  BABY_CARE_AFTER_SAVE,
  runBabyCareSaveThenNavigate,
} from "@/lib/baby-care-save-navigate";
import {
  babyGrowthSaveInvalidateScope,
  babyGrowthSaveMutationTarget,
  type BabyGrowthPageChip,
} from "@/lib/baby-growth-page-chips";

type PushRouter = { push: (href: string) => void };

export type BabyGrowthPageSaveMutationTarget = "vaccine" | "growth";
export type BabyGrowthPageSaveInvalidateScope = "vaccines" | "growth";

/**
 * Growth + vaccine save on Growth: mutate → onSuccess → stay (never home).
 * Page and unit tests share this so afterSave / invalidate wiring cannot drift.
 */
export async function runBabyGrowthPageSaveThenStay(args: {
  kind: BabyGrowthPageChip;
  mutate: (target: BabyGrowthPageSaveMutationTarget) => Promise<void>;
  onSuccess: (ctx: {
    mutationTarget: BabyGrowthPageSaveMutationTarget;
    invalidateScope: BabyGrowthPageSaveInvalidateScope;
  }) => void | Promise<void>;
  onError: (error: unknown) => void;
  router: PushRouter;
}): Promise<void> {
  const mutationTarget = babyGrowthSaveMutationTarget(args.kind);
  const invalidateScope = babyGrowthSaveInvalidateScope(args.kind);
  await runBabyCareSaveThenNavigate({
    mutate: () => args.mutate(mutationTarget),
    onSuccess: () =>
      args.onSuccess({ mutationTarget, invalidateScope }),
    onError: args.onError,
    router: args.router,
    afterSave: BABY_CARE_AFTER_SAVE.growth,
  });
}
