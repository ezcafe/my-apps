"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_BOOTSTRAP_QUERY,
  MONEY_WORKSPACE_CLONE_MUTATION,
} from "@/lib/money-gql-documents";
import { cn } from "@/lib/cn";
import type { MoneyWorkspaceBootstrapData } from "@/lib/money-workspace-bootstrap-data";
import { MoneySettingsResetSection } from "@/components/money-settings/money-settings-reset";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";

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
    const res = await moneyGraphQLRequest<{ moneyBootstrap: MoneyWorkspaceBootstrapData }>(
      MONEY_BOOTSTRAP_QUERY,
    );
    const boot = res.moneyBootstrap;
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
          {/* Shared-border ledger grid: tokenized radii, container-sized layout */}
          <ul
            role="list"
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-md)] bg-border shadow-[var(--shadow-sm)] ring-1 ring-border"
            aria-label="Ledger and automation"
          >
            {LEDGER_MANAGEMENT_LINKS.map(({ href, label }) => (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className="relative flex items-center gap-x-3 bg-surface px-4 py-5 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted-surface focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground fx-press"
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
                      await fetch("/api/workspace", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          name: newSharedName.trim(),
                          defaultCurrency: newSharedCurrency,
                          ...(seedMoneyOnShared
                            ? { seedApp: "money" as const }
                            : {}),
                        }),
                      }).then(async (r) => {
                        const body = (await r.json().catch(() => null)) as {
                          error?: string;
                        } | null;
                        if (!r.ok) {
                          throw new Error(body?.error ?? r.statusText ?? "Request failed");
                        }
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
                  <Field label="Name" required>
                    <Input
                      placeholder="Family"
                      value={newSharedName}
                      onChange={(e) => setNewSharedName(e.target.value)}
                    />
                  </Field>
                  <Field label="Default currency">
                    <Select
                      value={newSharedCurrency}
                      onChange={(e) => setNewSharedCurrency(e.target.value)}
                    >
                      {["USD", "VND", "EUR", "GBP", "JPY"].map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted fx-press">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={seedMoneyOnShared}
                      onChange={(e) => setSeedMoneyOnShared(e.target.checked)}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background transition-colors duration-150",
                        seedMoneyOnShared && "border-foreground bg-foreground text-background",
                      )}
                    >
                      {seedMoneyOnShared ? (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="size-3">
                          <path
                            fillRule="evenodd"
                            d="M16.704 5.296a1 1 0 0 1 0 1.408l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L8.5 12.086l6.793-6.79a1 1 0 0 1 1.411 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : null}
                    </span>
                    Seed Money accounts &amp; categories
                  </label>
                  <Button type="submit" variant="secondary" size="md" className="w-fit">
                    Create workspace
                  </Button>
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
                        const dr = await fetch("/api/workspace/default", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            workspaceId: defaultWsPick,
                            app: "money",
                          }),
                        });
                        const dbody = (await dr.json().catch(() => null)) as {
                          error?: string;
                        } | null;
                        if (!dr.ok) {
                          throw new Error(dbody?.error ?? dr.statusText ?? "Request failed");
                        }
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
                    <Field label="Workspace">
                      <Select
                        value={defaultWsPick}
                        onChange={(e) => setDefaultWsPick(e.target.value)}
                      >
                        {workspaceList.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                            {w.kind === "shared" ? " (shared)" : ""}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Button
                      type="submit"
                      variant="secondary"
                      size="md"
                      className="w-fit"
                      disabled={!defaultWsPick}
                    >
                      Save
                    </Button>
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
                          err instanceof Error
                            ? err.message
                            : "Something went wrong",
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
                          .filter(
                            (w) =>
                              w.role === "owner" && w.id !== moneyWorkspaceId,
                          )
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <Button
                      type="submit"
                      variant="secondary"
                      size="md"
                      className="w-fit"
                      disabled={
                        !cloneTargetId ||
                        workspaceList.filter(
                          (w) =>
                            w.role === "owner" && w.id !== moneyWorkspaceId,
                        ).length === 0
                      }
                    >
                      Clone now
                    </Button>
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
