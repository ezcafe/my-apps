"use client";

import type { ReactNode, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoneyAppMenu } from "@/components/money-section-tabs";
import {
  AppHeaderOverrideProvider,
  useAppHeaderActions,
  useAppHeaderOverride,
} from "@/components/app-header-override";
import { GraphQLMoneyProvider } from "@/components/graphql-money-provider";
import { PageHeading } from "@/components/page-heading";
import { buttonClassName } from "@/components/ui/button";
import {
  mergeMoneyFamilyHeadingViewModel,
  type MoneyFamilyResolvedHeader,
} from "@/lib/money-family-heading-merge";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DefaultCtaLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={buttonClassName({
        variant: "primary",
        responsiveIconOnly: true,
        hasLeading: true,
        className: "shrink-0",
      })}
    >
      <IconPlus className="size-5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function MoneyFamilySectionHeading({
  resolveHeader,
}: {
  resolveHeader: (pathname: string) => MoneyFamilyResolvedHeader;
}) {
  const pathname = usePathname();
  const override = useAppHeaderOverride();
  /** Shared override-context actions (Loans More menu). Investment never sets these. */
  const headerActions = useAppHeaderActions();
  const resolved = resolveHeader(pathname);
  const vm = mergeMoneyFamilyHeadingViewModel({
    resolved,
    override,
    headerActions,
  });

  const actions =
    vm.customActions != null
      ? vm.customActions
      : vm.ctaLink != null
        ? (
            <DefaultCtaLink
              href={vm.ctaLink.href}
              label={vm.ctaLink.label}
            />
          )
        : null;

  return (
    <PageHeading
      className={SHELL_FULL_SPAN}
      leading={<MoneyAppMenu />}
      title={vm.title}
      description={vm.description}
      meta={vm.meta}
      breadcrumbs={vm.breadcrumbs}
      actions={actions}
    />
  );
}

/**
 * Shared Investments / Loans (Money-family) route chrome:
 * GraphQL Money provider, header override, shell grid, section heading.
 */
export function MoneyFamilyRouteChrome({
  resolveHeader,
  children,
}: {
  resolveHeader: (pathname: string) => MoneyFamilyResolvedHeader;
  children: ReactNode;
}) {
  return (
    <GraphQLMoneyProvider>
      <AppHeaderOverrideProvider>
        <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-6">
          <MoneyFamilySectionHeading resolveHeader={resolveHeader} />
          {children}
        </div>
      </AppHeaderOverrideProvider>
    </GraphQLMoneyProvider>
  );
}
