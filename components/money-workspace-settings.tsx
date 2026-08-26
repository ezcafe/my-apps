"use client";

import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_BOOTSTRAP_QUERY,
  MONEY_WORKSPACE_CLONE_MUTATION,
} from "@/lib/money-gql-documents";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import {
  MONEY_OPTIONAL_SECTION_TAB_KEYS,
  MONEY_OPTIONAL_SECTION_TAB_LABELS,
  useMoneySectionTabVisibility,
} from "@/lib/money-section-tab-visibility";
import { MoneySettingsResetSection } from "@/components/money-settings/money-settings-reset";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

type WorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  ownedByUserSub: string | null;
  defaultCurrency: string | null;
  role: "owner" | "member";
  isDefault: boolean;
};

const LEDGER_MANAGEMENT_LINKS = [
  { href: "/money/settings/accounts", label: "Accounts" },
  { href: "/money/settings/categories", label: "Categories" },
  { href: "/money/settings/recurrence", label: "Recurrence" },
  { href: "/money/settings/budgets", label: "Budgets" },
  { href: "/money/settings/rules", label: "Rules" },
  { href: "/money/settings/merchants", label: "Merchants" },
  { href: "/money/settings/tags", label: "Tags" },
] as const;

function LedgerLinkChevron() {
  return (
    <svg
      className="size-5 flex-none text-muted"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function MoneyWorkspaceSettings() {
  const notify = useNotify();
  const { refreshWorkspaceCurrency } = useWorkspaceCurrency();
  const { visibility, setVisible } = useMoneySectionTabVisibility();

  const [workspaceList, setWorkspaceList] = useState<WorkspaceRow[]>([]);
  const [moneyWorkspaceId, setMoneyWorkspaceId] = useState("");
  const [cloneTargetId, setCloneTargetId] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const refreshMoneyWorkspaceContext = useCallback(async () => {
    await refreshWorkspaceCurrency();
    const res = await moneyGraphQLRequest<{ moneyBootstrap: MoneyWorkspaceBootstrapData }>(
      MONEY_BOOTSTRAP_QUERY,
    );
    const boot = res.moneyBootstrap;
    setMoneyWorkspaceId(boot.workspaceId);
    setWorkspaceList(boot.workspaces);
  }, [refreshWorkspaceCurrency]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await refreshMoneyWorkspaceContext();
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(presentClientError("money-workspace-settings", e));
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshMoneyWorkspaceContext]);

  return (
    <div className={MONEY_FULL_SPAN}>
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}

      <div className="space-y-6">
        <SettingsSection
          id="money-settings-section-tabs"
          title="Section menu"
          description="Choose which optional sections appear under Money in the navigation menu. Insights, Add transaction, Spending, and Money settings always stay visible. Investments is a separate app in the same menu."
        >
          <ul
            role="list"
            className="divide-y divide-border rounded-[var(--radius-sm)] bg-background"
            aria-label="Optional Money menu sections"
          >
            {MONEY_OPTIONAL_SECTION_TAB_KEYS.map((key) => {
              const label = MONEY_OPTIONAL_SECTION_TAB_LABELS[key];
              const checked = visibility[key];
              return (
                <li key={key} className="min-w-0">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Checkbox
                      checked={checked}
                      onChange={() => setVisible(key, !checked)}
                      ariaLabel={`Show ${label} in Money menu`}
                    />
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                      {label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </SettingsSection>

        <SettingsSection
          id="money-settings-ledger"
          title="Accounts & categories"
          description="Detailed editors open on each page below. Everything applies to your currently selected Money workspace."
        >
          <ul
            role="list"
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-sm)] bg-border"
            aria-label="Ledger and automation"
          >
            {LEDGER_MANAGEMENT_LINKS.map(({ href, label }) => (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className="relative flex items-center gap-x-3 bg-background px-4 py-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted-surface focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground fx-press"
                >
                  <span className="min-w-0 flex-1">{label}</span>
                  <LedgerLinkChevron />
                </Link>
              </li>
            ))}
          </ul>
        </SettingsSection>

        {workspaceList.length > 1 &&
        workspaceList.find((w) => w.id === moneyWorkspaceId)?.role === "owner" ? (
          <SettingsSection
            id="money-settings-clone"
            title="Clone Money structure"
            description="Copy accounts, categories, merchants, rules, recurrence, and budgets into another workspace you own. Workspace defaults and sharing are managed in global Settings."
          >
            <form
              className="grid w-full gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (!cloneTargetId) throw new Error("Pick a target workspace");
                  await moneyGraphQLRequest(MONEY_WORKSPACE_CLONE_MUTATION, {
                    targetWorkspaceId: cloneTargetId,
                  });
                  setCloneTargetId("");
                  await refreshMoneyWorkspaceContext();
                  notify.success(
                    "Settings updated",
                    "Money structure cloned into the target workspace.",
                  );
                } catch (err: unknown) {
                  notify.error(
                    "Couldn’t clone workspace",
                    toUserFacingMessage(err, "Something went wrong"),
                  );
                }
              }}
            >
              <Field label="Target workspace">
                <Select
                  value={cloneTargetId}
                  onChange={(e) => setCloneTargetId(e.target.value)}
                >
                  <option value="">Select workspace…</option>
                  {workspaceList
                    .filter((w) => w.role === "owner" && w.id !== moneyWorkspaceId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Button
                type="submit"
                variant="primary"
                className="w-fit"
                disabled={
                  !cloneTargetId ||
                  workspaceList.filter(
                    (w) => w.role === "owner" && w.id !== moneyWorkspaceId,
                  ).length === 0
                }
              >
                Clone now
              </Button>
            </form>
          </SettingsSection>
        ) : null}

        {workspaceList.find((w) => w.id === moneyWorkspaceId)?.role === "owner" ? (
          <MoneySettingsResetSection onResetComplete={refreshMoneyWorkspaceContext} />
        ) : null}
      </div>
    </div>
  );
}
