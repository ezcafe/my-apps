"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { useNotify } from "@/components/notification-provider";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { babyBirthDateErrorKey } from "@/lib/baby-birth-date-errors";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  babyKeys,
  babyProfileQueryOptions,
  invalidateBabyQueries,
} from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import {
  quickPickChipCls,
  quickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const LINK_Q = /* GraphQL */ `
  query BabyTelegramLink {
    babyTelegramLink {
      chatId
      linkedAt
      confirmedAt
    }
  }
`;

const LINK_M = /* GraphQL */ `
  mutation LinkBabyTelegram($input: LinkBabyTelegramInput!) {
    linkBabyTelegramChat(input: $input) {
      chatId
      confirmedAt
    }
  }
`;

const UNLINK_M = /* GraphQL */ `
  mutation UnlinkBabyTelegram {
    unlinkBabyTelegramChat
  }
`;

export function BabySettingsPage({
  telegramEnabled,
}: {
  telegramEnabled: boolean;
}) {
  const { t, locale, setLocale } = useBabyLocale();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState("");
  const [birthDraft, setBirthDraft] = useState<string | null>(null);
  const [birthError, setBirthError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const profileQuery = useQuery({
    ...babyProfileQueryOptions(),
  });
  const profileBirth = profileQuery.data?.babyProfile?.birthDate ?? "";
  const birthDate = birthDraft ?? profileBirth;

  const linkQuery = useQuery({
    queryKey: babyKeys.telegram(),
    queryFn: () =>
      babyGraphQLRequest<{
        babyTelegramLink: {
          chatId: string;
          linkedAt: string;
          confirmedAt: string | null;
        } | null;
      }>(LINK_Q),
    enabled: telegramEnabled,
  });

  const linked = linkQuery.data?.babyTelegramLink;

  function link() {
    startTransition(async () => {
      try {
        await babyGraphQLRequest(LINK_M, { input: { chatId } });
        await queryClient.invalidateQueries({ queryKey: babyKeys.telegram() });
        notify.success(t("settings.pendingConfirm"));
        setChatId("");
      } catch (e) {
        notify.error(e instanceof Error ? e.message : t("common.failed"));
      }
    });
  }

  function unlink() {
    startTransition(async () => {
      try {
        await babyGraphQLRequest(UNLINK_M);
        await queryClient.invalidateQueries({ queryKey: babyKeys.telegram() });
        notify.success(t("settings.unlinked"));
      } catch (e) {
        notify.error(e instanceof Error ? e.message : t("common.failed"));
      }
    });
  }

  function saveBirthDate() {
    setBirthError(null);
    const trimmed = birthDate.trim();
    startTransition(async () => {
      try {
        await babyGraphQLRequest(
          /* GraphQL */ `
            mutation UpdateBabyProfile($input: UpdateBabyProfileInput!) {
              updateBabyProfile(input: $input) {
                id
                birthDate
              }
            }
          `,
          {
            input: {
              birthDate: trimmed === "" ? null : trimmed,
            },
          },
        );
        await invalidateBabyQueries(queryClient, "profile");
        setBirthDraft(null);
        notify.success(t("settings.birthDateSaved"));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const key = babyBirthDateErrorKey(msg);
        setBirthError(t(key as never));
        notify.error(t(key as never));
      }
    });
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
    >
      <SettingsSection id="baby-profile" title={t("settings.babyProfile")}>
        <Field
          label={t("settings.birthDate")}
          hint={birthError ? undefined : t("settings.birthDateHint")}
          error={birthError ?? undefined}
        >
          <Input
            type="date"
            max={todayIso}
            value={birthDate}
            onChange={(e) => {
              setBirthDraft(e.target.value);
              setBirthError(null);
            }}
          />
        </Field>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={saveBirthDate}
        >
          {t("common.save")}
        </Button>
      </SettingsSection>
      <SettingsSection id="baby-language" title={t("settings.language")}>
        <div
          role="radiogroup"
          aria-label={t("settings.language")}
          className={quickPickGroupCls}
        >
          <button
            type="button"
            role="radio"
            aria-checked={locale === "en"}
            onClick={() => setLocale("en")}
            className={quickPickChipCls(locale === "en")}
          >
            {t("settings.langEn")}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={locale === "vi"}
            onClick={() => setLocale("vi")}
            className={quickPickChipCls(locale === "vi")}
          >
            {t("settings.langVi")}
          </button>
        </div>
      </SettingsSection>

      {!telegramEnabled ? (
        <p className="text-muted">{t("telegram.off")}</p>
      ) : (
        <SettingsSection
          id="baby-telegram"
          title={t("telegram.link")}
          description={t("settings.modelB")}
        >
          {linked ? (
            <div className="space-y-3">
              <p className="text-foreground">
                {t("settings.linkedChat")}{" "}
                <span className="font-medium">{linked.chatId}</span>
              </p>
              <p className="text-sm text-muted">
                {linked.confirmedAt
                  ? t("settings.confirmed")
                  : t("settings.pendingConfirmHint")}
              </p>
              <Button
                type="button"
                variant="danger"
                size="lg"
                disabled={pending}
                onClick={unlink}
              >
                {t("telegram.unlink")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <Field label={t("settings.chatId")} className="w-56">
                <Input
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                />
              </Field>
              <Button
                type="button"
                size="lg"
                disabled={pending || !chatId.trim()}
                onClick={link}
              >
                {t("telegram.link")}
              </Button>
            </div>
          )}
        </SettingsSection>
      )}
    </div>
  );
}
