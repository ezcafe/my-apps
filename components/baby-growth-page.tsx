"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { useNotify } from "@/components/notification-provider";
import { MoneyAmountField } from "@/components/money-amount-field";
import {
  MoneyCategoryField,
  MoneyMultiCategoryField,
} from "@/components/money-category-field";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  BABY_GROWTH_CAPTURE_HREF,
  BABY_GROWTH_PAGE_CHIPS,
  BABY_GROWTH_PAGE_DEFAULT_CHIP,
  babyGrowthChipWhenKindParamChanges,
  defaultUnitForGrowthChip,
  isBabyGrowthPageDbKind,
  resolveBabyGrowthPageChipFromKindParam,
  selectBabyGrowthPageChip,
  type BabyGrowthPageChip,
  type BabyGrowthPageDbKind,
} from "@/lib/baby-growth-page-chips";
import { runBabyGrowthPageSaveThenStay } from "@/lib/baby-growth-page-save";
import {
  growthMedNameSaveBlocked,
  growthVaccineCreateInput,
  growthVaccineSaveBlocked,
} from "@/lib/baby-growth-recent";
import {
  BABY_TEMP_SYMPTOM_IDS,
  babyTempNotesForSave,
  type BabyTempSymptomId,
} from "@/lib/baby-growth-symptoms";
import { babyGrowthUnitQuickItems } from "@/lib/baby-growth-unit-chips";
import { invalidateBabyQueries } from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import type { BabyMessageKey } from "@/messages/baby/en";
import {
  quickPickChipCls,
  quickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const CREATE_GROWTH = /* GraphQL */ `
  mutation CreateBabyGrowth($input: CreateBabyGrowthInput!) {
    createBabyGrowth(input: $input) {
      id
    }
  }
`;

const CREATE_VACCINE = /* GraphQL */ `
  mutation CreateBabyVaccine($input: CreateBabyVaccineInput!) {
    createBabyVaccine(input: $input) {
      id
    }
  }
`;

function kindLabelKey(kind: string): BabyMessageKey {
  if (kind === "weight") return "growth.weight";
  if (kind === "height") return "growth.height";
  if (kind === "head") return "growth.head";
  if (kind === "temperature") return "growth.temperature";
  if (kind === "medication") return "growth.medication";
  if (kind === "vitamin") return "growth.vitamin";
  if (kind === "vaccine") return "growth.vaccine";
  return "growth.kind";
}

function symptomLabelKey(id: BabyTempSymptomId): BabyMessageKey {
  if (id === "cough") return "growth.symptom.cough";
  if (id === "vomiting") return "growth.symptom.vomiting";
  if (id === "rash") return "growth.symptom.rash";
  if (id === "breathing") return "growth.symptom.breathing";
  return "growth.symptom.sleepiness";
}

/** Create-only Growth log form (growth kinds + vaccine). Past entries live on Activities. */
export function BabyGrowthPage() {
  const { t } = useBabyLocale();
  const notify = useNotify();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<BabyGrowthPageChip>(
    BABY_GROWTH_PAGE_DEFAULT_CHIP,
  );
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [name, setName] = useState("");
  const [dose, setDose] = useState<"first" | "second" | null>("first");
  const [symptoms, setSymptoms] = useState<BabyTempSymptomId[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const kindParam = searchParams.get("kind");
  const appliedKindParamRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const next = babyGrowthChipWhenKindParamChanges(
      appliedKindParamRef.current,
      kindParam,
    );
    appliedKindParamRef.current = kindParam;
    if (next == null) return;
    setKind(next);
    setUnit(defaultUnitForGrowthChip(next));
    if (next === "vaccine") {
      setDose("first");
    }
  }, [kindParam]);

  function resetForm() {
    setKind(BABY_GROWTH_PAGE_DEFAULT_CHIP);
    setValue("");
    setUnit("kg");
    setName("");
    setDose("first");
    setSymptoms([]);
    setFieldError(null);
  }

  function selectKind(next: BabyGrowthPageChip) {
    setKind(selectBabyGrowthPageChip(kind, next));
    setUnit(defaultUnitForGrowthChip(next));
    setFieldError(null);
    if (next !== "temperature") {
      setSymptoms([]);
    }
    if (next !== "medication" && next !== "vitamin" && next !== "vaccine") {
      setName("");
    }
    if (next === "vaccine") {
      setDose("first");
    }
    // Sticky ?kind= must not fight a manual chip pick (e.g. Weight after deep link).
    if (
      kindParam != null &&
      resolveBabyGrowthPageChipFromKindParam(kindParam) !== next
    ) {
      appliedKindParamRef.current = null;
      router.replace(BABY_GROWTH_CAPTURE_HREF);
    }
  }

  function setSymptomsFromIds(ids: string[]) {
    setSymptoms(
      ids.filter((id): id is BabyTempSymptomId =>
        (BABY_TEMP_SYMPTOM_IDS as readonly string[]).includes(id),
      ),
    );
  }

  function temperatureOk() {
    const hasTemp = value.trim() !== "" && Number.isFinite(Number(value));
    return hasTemp || symptoms.length > 0;
  }

  function saveBlockedReason(): string | null {
    if (kind === "vaccine") {
      const blocked = growthVaccineSaveBlocked({ name, dose });
      if (blocked === "name") return t("vaccine.nameRequired");
      if (blocked === "dose") return t("growth.doseRequired");
      return null;
    }
    if (kind === "medication" || kind === "vitamin") {
      if (growthMedNameSaveBlocked(name)) return t("growth.nameRequired");
    }
    if (kind === "weight" || kind === "height" || kind === "head") {
      if (!value.trim() || !Number.isFinite(Number(value))) {
        return t("growth.valueRequired");
      }
    }
    if (kind === "temperature") {
      if (!temperatureOk()) return t("growth.tempOrSymptomsRequired");
      const notesResult = babyTempNotesForSave({
        previousNotes: null,
        symptoms,
        symptomsTouched: true,
      });
      if (!notesResult.ok) return t("growth.symptomsLoadError");
    }
    return null;
  }

  function save() {
    const blocked = saveBlockedReason();
    if (blocked) {
      setFieldError(blocked);
      notify.error(blocked);
      return;
    }
    setFieldError(null);

    startTransition(async () => {
      await runBabyGrowthPageSaveThenStay({
        kind,
        mutate: async (mutationTarget) => {
          if (mutationTarget === "vaccine") {
            const mapped = growthVaccineCreateInput({ name, dose });
            if (!mapped.ok) {
              throw new Error(
                mapped.reason === "name"
                  ? t("vaccine.nameRequired")
                  : t("growth.doseRequired"),
              );
            }
            await babyGraphQLRequest(CREATE_VACCINE, {
              input: mapped.input,
            });
            return;
          }

          if (!isBabyGrowthPageDbKind(kind)) return;
          const dbKind: BabyGrowthPageDbKind = kind;

          let notes: string | null | undefined;
          let valueText: string | null | undefined;
          let valueNum: number | null | undefined;
          let unitVal: string | null | undefined = unit.trim() || null;

          if (dbKind === "medication" || dbKind === "vitamin") {
            valueText = name.trim();
            valueNum = value.trim() ? Number(value) : null;
          } else if (dbKind === "temperature") {
            valueNum = value.trim() ? Number(value) : null;
            unitVal = valueNum != null ? unit.trim() || "°C" : null;
            const notesResult = babyTempNotesForSave({
              previousNotes: null,
              symptoms,
              symptomsTouched: true,
            });
            if (!notesResult.ok) {
              throw new Error(t("growth.symptomsLoadError"));
            }
            notes = notesResult.notes;
          } else {
            valueNum = value.trim() ? Number(value) : null;
          }

          await babyGraphQLRequest(CREATE_GROWTH, {
            input: {
              kind: dbKind,
              ...(valueNum != null ? { valueNum } : {}),
              ...(valueText ? { valueText } : {}),
              ...(unitVal ? { unit: unitVal } : {}),
              ...(notes ? { notes } : {}),
            },
          });
        },
        onSuccess: async ({ mutationTarget, invalidateScope }) => {
          resetForm();
          // Drop sticky ?kind= so Weight reset is not undone by the kind effect.
          appliedKindParamRef.current = null;
          router.replace(BABY_GROWTH_CAPTURE_HREF);
          await invalidateBabyQueries(queryClient, invalidateScope);
          notify.success(
            mutationTarget === "vaccine"
              ? t("vaccine.saved")
              : t("growth.saved"),
          );
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
      });
    });
  }

  const saveDisabled = pending || Boolean(saveBlockedReason());
  const isMedOrVit = kind === "medication" || kind === "vitamin";
  const isVaccine = kind === "vaccine";

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      data-testid="baby-growth-page"
    >
      <div
        className={quickPickGroupCls}
        role="radiogroup"
        aria-label={t("growth.kind")}
        data-testid="baby-growth-kind-chips"
      >
        {BABY_GROWTH_PAGE_CHIPS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            className={cn(quickPickChipCls(kind === k), "fx-hit-40 min-h-11")}
            onClick={() => selectKind(k)}
          >
            {t(kindLabelKey(k))}
          </button>
        ))}
      </div>

      <section
        className="flex flex-col gap-3"
        data-testid="baby-growth-form"
      >
        {isVaccine || isMedOrVit ? (
          <Field
            label={isVaccine ? t("vaccine.name") : t("growth.name")}
            required
            error={
              fieldError === t("vaccine.nameRequired") ||
              fieldError === t("growth.nameRequired")
                ? fieldError
                : undefined
            }
          >
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError(null);
              }}
              autoComplete="off"
              data-testid={isVaccine ? "baby-vaccine-name" : "baby-growth-name"}
            />
          </Field>
        ) : null}

        {isVaccine ? (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              <span className="text-destructive" aria-hidden>
                *
              </span>{" "}
              {t("vaccine.dose")}
            </p>
            <div
              className={quickPickGroupCls}
              role="radiogroup"
              aria-label={t("vaccine.dose")}
              data-testid="baby-vaccine-dose"
            >
              {(["first", "second"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={dose === d}
                  className={cn(
                    quickPickChipCls(dose === d),
                    "fx-hit-40 min-h-11",
                  )}
                  onClick={() => {
                    setDose(d);
                    setFieldError(null);
                  }}
                >
                  {t(d === "first" ? "vaccine.doseFirst" : "vaccine.doseSecond")}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!isVaccine && !isMedOrVit ? (
          <MoneyAmountField
            label={t("growth.value")}
            required={
              kind === "weight" || kind === "height" || kind === "head"
            }
            value={value}
            onChange={(next) => {
              setValue(next);
              setFieldError(null);
            }}
            trailingAddon={unit.trim() || undefined}
            data-testid="baby-growth-value"
          />
        ) : null}

        {isMedOrVit ? (
          <MoneyAmountField
            label={t("growth.amount")}
            hint={t("growth.amountOptional")}
            value={value}
            onChange={setValue}
            data-testid="baby-growth-amount"
          />
        ) : null}

        {!isVaccine && !isMedOrVit ? (
          <MoneyCategoryField
            legend={t("growth.unit")}
            ariaLabel={t("growth.unit")}
            items={babyGrowthUnitQuickItems(kind)}
            selectedId={unit}
            onSelect={(id) => {
              setUnit(id);
              setFieldError(null);
            }}
            otherLabel={t("growth.unitOther")}
            allowEmpty={false}
            emptyMessage={t("growth.unit")}
          />
        ) : null}

        {kind === "temperature" ? (
          <div data-testid="baby-growth-symptoms">
            <MoneyMultiCategoryField
              legend={t("growth.symptoms")}
              ariaLabel={t("growth.symptoms")}
              items={BABY_TEMP_SYMPTOM_IDS.map((id) => ({
                id,
                label: t(symptomLabelKey(id)),
                usageCount: 1,
              }))}
              selectedIds={symptoms}
              onChange={setSymptomsFromIds}
              otherLabel={t("growth.symptomsOther")}
            />
          </div>
        ) : null}

        {fieldError ? (
          <p className="text-sm text-destructive" role="alert">
            {fieldError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            size="lg"
            disabled={saveDisabled}
            onClick={save}
            data-testid={isVaccine ? "baby-vaccine-save" : "baby-growth-save"}
          >
            {isVaccine ? t("vaccine.add") : t("growth.add")}
          </Button>
        </div>
      </section>
    </div>
  );
}

/** @deprecated Prefer BabyGrowthPage */
export const BabyMeasurePage = BabyGrowthPage;
