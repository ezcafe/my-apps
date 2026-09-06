"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { SettingsSection } from "@/components/settings/settings-section";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_LIST_ACCOUNTS_QUERY } from "@/lib/money-gql-documents";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { SettingsPageLayout } from "@/components/settings/settings-page-layout";
import {
  INVESTMENT_SETTINGS_CATEGORIES,
  type InvestmentSettingsCategoryId,
} from "@/components/settings/settings-types";

function ChevronRightIcon() {
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

const INSTRUMENT_MANAGEMENT_LINKS = [
  {
    href: "/investments/instruments",
    label: "All instruments & quotes",
    description: "View symbols, contract sizes, and Yahoo quote links",
  },
  {
    href: "/investments/instruments/new",
    label: "Create new instrument",
    description: "Add a new stock, crypto pair, commodity, or forex symbol",
  },
] as const;

export function InvestmentWorkspaceSettings() {
  const { defaultCurrency } = useWorkspaceCurrency();

  const [accounts, setAccounts] = useState<
    Array<{ id: string; name: string; type: string; currency: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await moneyGraphQLRequest<{
        moneyAccounts: Array<{
          id: string;
          name: string;
          type: string;
          currency: string;
        }>;
      }>(MONEY_LIST_ACCOUNTS_QUERY);
      setAccounts(res.moneyAccounts || []);
    } catch (e: unknown) {
      setError(toUserFacingMessage(e, "Failed to load investment settings"));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        if (!cancelled) {
          await loadAccounts();
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAccounts]);

  const investmentAccounts = accounts.filter((a) => a.type === "investment");

  return (
    <SettingsPageLayout<InvestmentSettingsCategoryId>
      categories={INVESTMENT_SETTINGS_CATEGORIES}
      idPrefix="investment-settings"
      searchPlaceholder="Search Investment settings (e.g. instruments, symbols, accounts)…"
      topAlert={
        error ? (
          <Alert
            variant="error"
            title="Unable to load"
            description={error}
          />
        ) : null
      }
      sections={{
        instruments: (
          <SettingsSection
            id="investment-settings-instruments"
            title="Instruments & symbols"
            description="Manage symbols, contract sizes, profit/loss categories, and Yahoo quote links."
          >
            <ul
              role="list"
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-sm)] bg-border"
              aria-label="Instruments management"
            >
              {INSTRUMENT_MANAGEMENT_LINKS.map(({ href, label, description }) => (
                <li key={href} className="min-w-0">
                  <Link
                    href={href}
                    className="relative flex items-center justify-between gap-x-3 bg-background px-4 py-4 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted-surface focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground fx-press"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground">{label}</div>
                      <div className="text-xs font-normal text-muted">{description}</div>
                    </div>
                    <ChevronRightIcon />
                  </Link>
                </li>
              ))}
            </ul>
          </SettingsSection>
        ),
        ledger: (
          <SettingsSection
            id="investment-settings-ledger"
            title="Cash & ledger accounts"
            description="Realized gains and losses post into Money investment accounts."
          >
            <div className="rounded-[var(--radius-md)] border border-border bg-background p-5">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Default currency
                  </span>
                  <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">
                    {defaultCurrency || "USD"}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Active investment accounts ({investmentAccounts.length})
                  </span>
                  {investmentAccounts.length > 0 ? (
                    <ul className="mt-2 divide-y divide-border rounded-[var(--radius-sm)] border border-border bg-muted/10">
                      {investmentAccounts.map((acc) => (
                        <li
                          key={acc.id}
                          className="flex items-center justify-between px-3 py-2 text-xs"
                        >
                          <span className="font-medium text-foreground">{acc.name}</span>
                          <span className="text-muted tabular-nums">{acc.currency}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      No specialized investment accounts found. You can add one in{" "}
                      <Link
                        href="/money/settings/accounts"
                        className="text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        Money Accounts settings
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>
            </div>
          </SettingsSection>
        ),
      }}
    />
  );
}
