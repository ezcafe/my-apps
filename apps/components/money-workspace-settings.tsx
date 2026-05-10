"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { moneyApiJson } from "@/lib/money-fetch";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import { MoneySettingsResetSection } from "@/components/money-settings/money-settings-reset";
import {
  inputCls,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

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

  const [workspaceList, setWorkspaceList] = useState<WorkspaceRow[]>([]);
  const [moneyWorkspaceId, setMoneyWorkspaceId] = useState("");
  const [defaultWsPick, setDefaultWsPick] = useState("");
  const [newSharedName, setNewSharedName] = useState("");
  const [newSharedCurrency, setNewSharedCurrency] = useState("USD");
  const [seedMoneyOnShared, setSeedMoneyOnShared] = useState(true);
  const [cloneTargetId, setCloneTargetId] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const refreshMoneyWorkspaceContext = useCallback(async () => {
    const { data: boot } =
      await moneyApiJson<MoneyWorkspaceBootstrapData>(
        "/api/money/workspace/bootstrap",
      );
    setMoneyWorkspaceId(boot.workspaceId);
    setWorkspaceList(boot.workspaces);
    setDefaultWsPick(boot.defaultWorkspaceId ?? boot.workspaceId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await refreshMoneyWorkspaceContext();
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(e instanceof Error ? e.message : "Error");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshMoneyWorkspaceContext]);

  return (
    <div className="min-w-0 max-w-4xl">
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
          id="money-settings-ledger"
          title="Accounts & categories"
          description="Detailed editors open on each page below. Everything applies to your currently selected Money workspace."
        >
          {/* Tailwind Plus “Actions with shared borders” grid list pattern */}
          <ul
            role="list"
            className="grid grid-cols-1 gap-px overflow-hidden rounded-md bg-border shadow-sm ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)] sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Ledger and automation"
          >
            {LEDGER_MANAGEMENT_LINKS.map(({ href, label }) => (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className="relative flex items-center gap-x-3 bg-surface px-4 py-5 text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
                >
                  <span className="min-w-0 flex-1">{label}</span>
                  <LedgerLinkChevron />
                </Link>
              </li>
            ))}
          </ul>
        </SettingsSection>

        <SettingsSection
          id="money-settings-workspaces"
          title="Workspaces"
          description="Default applies when you open Money without an active workspace cookie. Creating a shared workspace lets multiple members share one ledger."
        >
          {/* Tailwind Plus stacked list: full-width rows, label stack then actions */}
          <ul
            role="list"
            className="divide-y divide-border border-t border-border"
          >
            <li className="py-6">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-6 text-foreground">
                    New shared workspace
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Create a workspace others can join; optionally seed Money
                    accounts and categories.
                  </p>
                </div>
                <form
                  className="grid w-full gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      if (!newSharedName.trim())
                        throw new Error("Name required");
                      await moneyApiJson("/api/workspace", {
                        method: "POST",
                        body: JSON.stringify({
                          name: newSharedName.trim(),
                          defaultCurrency: newSharedCurrency,
                          ...(seedMoneyOnShared
                            ? { seedApp: "money" as const }
                            : {}),
                        }),
                      });
                      setNewSharedName("");
                      setNewSharedCurrency("USD");
                      await refreshMoneyWorkspaceContext();
                      notify.success(
                        "Settings updated",
                        "Shared workspace created.",
                      );
                    } catch (err: unknown) {
                      notify.error(
                        "Couldn’t create workspace",
                        err instanceof Error
                          ? err.message
                          : "Something went wrong",
                      );
                    }
                  }}
                >
                  <label className="grid w-full gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Name</span>
                    <input
                      className={inputCls}
                      placeholder="Family"
                      value={newSharedName}
                      onChange={(e) => setNewSharedName(e.target.value)}
                    />
                  </label>
                  <label className="grid w-full gap-1.5 text-sm">
                    <span className="font-medium text-foreground">
                      Default currency
                    </span>
                    <select
                      className={inputCls}
                      value={newSharedCurrency}
                      onChange={(e) => setNewSharedCurrency(e.target.value)}
                    >
                      {["USD", "VND", "EUR", "GBP", "JPY"].map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      className="rounded border-border text-foreground"
                      checked={seedMoneyOnShared}
                      onChange={(e) => setSeedMoneyOnShared(e.target.checked)}
                    />
                    Seed Money accounts &amp; categories
                  </label>
                  <button type="submit" className={`${secondaryBtnCls} w-fit`}>
                    Create workspace
                  </button>
                </form>
              </div>
            </li>

            {workspaceList.length > 1 ? (
              <li className="py-6">
                <div className="flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-6 text-foreground">
                      Default workspace
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Choose which workspace loads when you open Money without
                      an active cookie.
                    </p>
                  </div>
                  <form
                    className="grid w-full gap-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await moneyApiJson("/api/workspace/default", {
                          method: "PATCH",
                          body: JSON.stringify({
                            workspaceId: defaultWsPick,
                            app: "money",
                          }),
                        });
                        await refreshMoneyWorkspaceContext();
                        notify.success(
                          "Settings updated",
                          "Default workspace saved.",
                        );
                      } catch (err: unknown) {
                        notify.error(
                          "Couldn’t save default workspace",
                          err instanceof Error
                            ? err.message
                            : "Something went wrong",
                        );
                      }
                    }}
                  >
                    <label className="grid w-full gap-1.5 text-sm">
                      <span className="font-medium text-foreground">
                        Workspace
                      </span>
                      <select
                        className={inputCls}
                        value={defaultWsPick}
                        onChange={(e) => setDefaultWsPick(e.target.value)}
                      >
                        {workspaceList.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                            {w.kind === "shared" ? " (shared)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className={`${secondaryBtnCls} w-fit`}
                      disabled={!defaultWsPick}
                    >
                      Save
                    </button>
                  </form>
                </div>
              </li>
            ) : null}

            {workspaceList.length > 1 &&
            workspaceList.find((w) => w.id === moneyWorkspaceId)?.role ===
              "owner" ? (
              <li className="py-6">
                <div className="flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-6 text-foreground">
                      Clone Money structure
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Copy accounts, categories, merchants, rules, recurrence,
                      and budgets into another workspace you own.
                    </p>
                  </div>
                  <form
                    className="grid w-full gap-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        if (!cloneTargetId)
                          throw new Error("Pick a target workspace");
                        await moneyApiJson("/api/money/workspace/clone", {
                          method: "POST",
                          body: JSON.stringify({
                            targetWorkspaceId: cloneTargetId,
                          }),
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
                          err instanceof Error
                            ? err.message
                            : "Something went wrong",
                        );
                      }
                    }}
                  >
                    <label className="grid w-full gap-1.5 text-sm">
                      <span className="font-medium text-foreground">
                        Target workspace
                      </span>
                      <select
                        className={inputCls}
                        value={cloneTargetId}
                        onChange={(e) => setCloneTargetId(e.target.value)}
                      >
                        <option value="">Select workspace…</option>
                        {workspaceList
                          .filter(
                            (w) =>
                              w.role === "owner" && w.id !== moneyWorkspaceId,
                          )
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className={`${secondaryBtnCls} w-fit`}
                      disabled={
                        !cloneTargetId ||
                        workspaceList.filter(
                          (w) =>
                            w.role === "owner" && w.id !== moneyWorkspaceId,
                        ).length === 0
                      }
                    >
                      Clone now
                    </button>
                  </form>
                </div>
              </li>
            ) : null}
          </ul>
        </SettingsSection>

        {workspaceList.find((w) => w.id === moneyWorkspaceId)?.role ===
        "owner" ? (
          <MoneySettingsResetSection
            onResetComplete={refreshMoneyWorkspaceContext}
          />
        ) : null}
      </div>
    </div>
  );
}
