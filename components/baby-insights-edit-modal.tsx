"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  activityLogRowTitleKey,
  type ActivityLogRow,
} from "@/lib/baby-insights-activity-log";
import {
  activityEditMutationFor,
  buildActivityCareUpdatePayload,
  buildActivityGrowthUpdateInput,
  validateActivityCareEdit,
} from "@/lib/baby-insights-activity-edit";
import { BABY_DIAPER_KINDS } from "@/lib/baby-diaper-detail";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import { invalidateBabyQueries } from "@/lib/baby-query-options";

const UPDATE_EVENT = /* GraphQL */ `
  mutation UpdateBabyEvent($input: UpdateBabyEventInput!) {
    updateBabyEvent(input: $input) {
      id
    }
  }
`;

const DELETE_EVENT = /* GraphQL */ `
  mutation DeleteBabyEvent($id: ID!) {
    deleteBabyEvent(id: $id) {
      id
    }
  }
`;

const UPDATE_GROWTH = /* GraphQL */ `
  mutation UpdateBabyGrowth($input: UpdateBabyGrowthInput!) {
    updateBabyGrowth(input: $input) {
      id
    }
  }
`;

const DELETE_GROWTH = /* GraphQL */ `
  mutation DeleteBabyGrowth($id: ID!) {
    deleteBabyGrowth(id: $id) {
      id
    }
  }
`;

const UPDATE_VACCINE = /* GraphQL */ `
  mutation UpdateBabyVaccine($input: UpdateBabyVaccineInput!) {
    updateBabyVaccine(input: $input) {
      id
    }
  }
`;

const DELETE_VACCINE = /* GraphQL */ `
  mutation DeleteBabyVaccine($id: ID!) {
    deleteBabyVaccine(id: $id) {
      id
    }
  }
`;

export function BabyInsightsEditModal({
  open,
  row,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: ActivityLogRow | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t } = useBabyLocale();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const labelledBy = "baby-insights-edit-modal-title";

  if (!row) {
    return (
      <Modal open={false} onClose={onClose} labelledBy={labelledBy}>
        {null}
      </Modal>
    );
  }

  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  const titleKey = activityLogRowTitleKey(row);
  const displayTitle = titleKey ? t(titleKey) : row.title;

  async function saveCare(form: FormData) {
    const occurredAtLocal = String(form.get("occurredAt") ?? "");
    const endedAtRaw = form.get("endedAt");
    const endedAtLocal =
      endedAtRaw != null && String(endedAtRaw).length > 0
        ? String(endedAtRaw)
        : null;
    const occurredAt = localInputToIso(occurredAtLocal);
    const endedAt = endedAtLocal ? localInputToIso(endedAtLocal) : null;
    const amountMlRaw = form.get("amountMl");
    const kind = form.get("diaperKind");

    const clientErr = validateActivityCareEdit({
      occurredAt,
      endedAt,
      careType: row!.careType,
    });
    if (clientErr) {
      setError(t(clientErr));
      return;
    }

    const mutation = activityEditMutationFor(row!.editTarget, "update");
    if (mutation !== "updateBabyEvent") {
      setError(t("insights.editWrongRoute"));
      return;
    }

    let amountMl: number | null = null;
    if (row!.careType === "feed" && amountMlRaw != null && String(amountMlRaw)) {
      const ml = Number(amountMlRaw);
      if (!Number.isFinite(ml) || ml < 0) {
        setError(t("insights.editInvalidPayload"));
        return;
      }
      amountMl = ml;
    }
    const nextPayload = buildActivityCareUpdatePayload({
      careType: row!.careType,
      amountMl,
      diaperKind: kind != null && String(kind) ? String(kind) : null,
    });

    await babyGraphQLRequest(UPDATE_EVENT, {
      input: {
        id: row!.id,
        occurredAt,
        ...(row!.careType === "sleep" ? { endedAt } : {}),
        ...(nextPayload !== undefined ? { payload: nextPayload } : {}),
      },
    });
    await invalidateBabyQueries(queryClient, "care");
    onSaved?.();
    onClose();
  }

  async function saveGrowth(form: FormData) {
    const mutation = activityEditMutationFor(row!.editTarget, "update");
    if (mutation !== "updateBabyGrowth") {
      setError(t("insights.editWrongRoute"));
      return;
    }
    const valueNumRaw = form.get("valueNum");
    const valueNum =
      valueNumRaw != null && String(valueNumRaw).length > 0
        ? Number(valueNumRaw)
        : null;
    if (valueNum != null && !Number.isFinite(valueNum)) {
      setError(t("insights.editInvalidPayload"));
      return;
    }
    const existingNotes =
      typeof payload.notes === "string" ? payload.notes : null;
    const existingValueText =
      typeof payload.valueText === "string" ? payload.valueText : null;
    await babyGraphQLRequest(UPDATE_GROWTH, {
      input: buildActivityGrowthUpdateInput({
        id: row!.id,
        kind: row!.growthKind,
        valueNum,
        unit: String(form.get("unit") ?? "") || null,
        notesFromForm: String(form.get("notes") ?? "") || null,
        recordedAt: localInputToIso(
          String(form.get("recordedAt") ?? toLocalInputValue(row!.at)),
        ),
        existingNotes,
        existingValueText,
      }),
    });
    await invalidateBabyQueries(queryClient, "growth");
    onSaved?.();
    onClose();
  }

  async function saveVaccine(form: FormData) {
    const mutation = activityEditMutationFor(row!.editTarget, "update");
    if (mutation !== "updateBabyVaccine") {
      setError(t("insights.editWrongRoute"));
      return;
    }
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setError(t("vaccine.nameRequired"));
      return;
    }
    const doseRaw = String(form.get("dose") ?? "");
    const dose = doseRaw === "second" ? "second" : "first";
    await babyGraphQLRequest(UPDATE_VACCINE, {
      input: {
        id: row!.id,
        name,
        dose,
        administeredAt: localInputToIso(
          String(form.get("administeredAt") ?? toLocalInputValue(row!.at)),
        ),
      },
    });
    await invalidateBabyQueries(queryClient, "vaccines");
    onSaved?.();
    onClose();
  }

  async function remove() {
    const mutation = activityEditMutationFor(row!.editTarget, "delete");
    if (mutation === "deleteBabyEvent") {
      await babyGraphQLRequest(DELETE_EVENT, { id: row!.id });
      await invalidateBabyQueries(queryClient, "care");
    } else if (mutation === "deleteBabyVaccine") {
      await babyGraphQLRequest(DELETE_VACCINE, { id: row!.id });
      await invalidateBabyQueries(queryClient, "vaccines");
    } else {
      await babyGraphQLRequest(DELETE_GROWTH, { id: row!.id });
      await invalidateBabyQueries(queryClient, "growth");
    }
    onSaved?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={labelledBy}
      className="w-[min(100vw-2rem,28rem)]"
    >
      <form
        className="space-y-4 p-1"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const form = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              if (row.source === "care") await saveCare(form);
              else if (row.source === "vaccine") await saveVaccine(form);
              else await saveGrowth(form);
            } catch {
              setError(t("insights.editFailed"));
            }
          });
        }}
      >
        <h2 id={labelledBy} className="text-lg font-semibold text-foreground">
          {t("insights.editTitle")} — {displayTitle}
        </h2>
        <p className="text-sm text-muted">{row.summary}</p>

        {row.source === "care" ? (
          <>
            <Field label={t("insights.editOccurredAt")}>
              <Input
                name="occurredAt"
                type="datetime-local"
                defaultValue={toLocalInputValue(row.at)}
                required
              />
            </Field>
            {row.careType === "sleep" ? (
              <Field label={t("insights.editEndedAt")}>
                <Input
                  name="endedAt"
                  type="datetime-local"
                  defaultValue={
                    row.endedAt ? toLocalInputValue(row.endedAt) : ""
                  }
                />
              </Field>
            ) : null}
            {row.careType === "feed" ? (
              <Field label={t("insights.editAmountMl")}>
                <Input
                  name="amountMl"
                  type="number"
                  inputMode="decimal"
                  defaultValue={
                    typeof payload.amountMl === "number"
                      ? String(payload.amountMl)
                      : ""
                  }
                />
              </Field>
            ) : null}
            {row.careType === "diaper" ? (
              <Field label={t("insights.editDiaperKind")}>
                <Select
                  name="diaperKind"
                  defaultValue={
                    typeof payload.kind === "string" &&
                    (BABY_DIAPER_KINDS as readonly string[]).includes(
                      payload.kind,
                    )
                      ? payload.kind
                      : "wet"
                  }
                >
                  {BABY_DIAPER_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`diaper.${kind}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </>
        ) : row.source === "vaccine" ? (
          <>
            <Field label={t("insights.editRecordedAt")}>
              <Input
                name="administeredAt"
                type="datetime-local"
                defaultValue={toLocalInputValue(row.at)}
                required
              />
            </Field>
            <Field label={t("vaccine.name")} required>
              <Input
                name="name"
                defaultValue={
                  typeof payload.name === "string" ? payload.name : ""
                }
                autoComplete="off"
              />
            </Field>
            <Field label={t("vaccine.dose")} required>
              <Select
                name="dose"
                defaultValue={
                  row.vaccineDose === "second" ? "second" : "first"
                }
              >
                <option value="first">{t("vaccine.doseFirst")}</option>
                <option value="second">{t("vaccine.doseSecond")}</option>
              </Select>
            </Field>
          </>
        ) : (
          <>
            <Field label={t("insights.editRecordedAt")}>
              <Input
                name="recordedAt"
                type="datetime-local"
                defaultValue={toLocalInputValue(row.at)}
                required
              />
            </Field>
            <Field label={t("insights.editValue")}>
              <Input
                name="valueNum"
                type="number"
                inputMode="decimal"
                step="any"
                defaultValue={
                  typeof payload.valueNum === "number"
                    ? String(payload.valueNum)
                    : ""
                }
              />
            </Field>
            <Field label={t("insights.editUnit")}>
              <Input
                name="unit"
                defaultValue={
                  typeof payload.unit === "string" ? payload.unit : ""
                }
              />
            </Field>
            {row.growthKind !== "temperature" ? (
              <Field label={t("insights.editNotes")}>
                <Input
                  name="notes"
                  defaultValue={
                    typeof payload.notes === "string" ? payload.notes : ""
                  }
                />
              </Field>
            ) : null}
          </>
        )}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={pending}>
            {t("insights.editSave")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            {t("insights.editCancel")}
          </Button>
          {!confirmDelete ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              {t("insights.editDelete")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await remove();
                  } catch {
                    setError(t("insights.editFailed"));
                  }
                })
              }
            >
              {t("insights.editDeleteConfirm")}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function toLocalInputValue(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local → ISO with offset for GraphQL validators. */
function localInputToIso(value: string): string {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  return new Date(ms).toISOString();
}
