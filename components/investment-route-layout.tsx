"use client";

import type { ReactNode, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoneyAppMenu } from "@/components/money-section-tabs";
import { AppHeaderOverrideProvider, useAppHeaderOverride } from "@/components/app-header-override";
import { GraphQLMoneyProvider } from "@/components/graphql-money-provider";
import { PageHeading } from "@/components/page-heading";
import { buttonClassName } from "@/components/ui/button";
import { resolveInvestmentAppHeader } from "@/lib/investment-app-header";
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

function InvestmentSectionHeading() {
  const pathname = usePathname();
  const override = useAppHeaderOverride();
  const resolved = resolveInvestmentAppHeader(pathname);

  const title = override?.title ?? resolved.title;
  const breadcrumbs = override?.breadcrumbs ?? resolved.breadcrumbs;
  const description = override?.description;
  const meta = override?.meta ?? resolved.meta;
  const cta =
    override != null && "cta" in override
      ? override.cta ?? null
      : resolved.cta;

  return (
    <PageHeading
      className={SHELL_FULL_SPAN}
      leading={<MoneyAppMenu />}
      title={title}
      description={description}
      meta={meta}
      breadcrumbs={breadcrumbs}
      actions={
        cta ? (
          <Link
            href={cta.href}
            aria-label={cta.label}
            title={cta.label}
            className={buttonClassName({
              variant: "primary",
              responsiveIconOnly: true,
              hasLeading: true,
              className: "shrink-0",
            })}
          >
            <IconPlus className="size-5 shrink-0" />
            <span className="hidden sm:inline">{cta.label}</span>
          </Link>
        ) : null
      }
    />
  );
}

/** Query client + Investments heading. Bootstrap hydrates inside MoneyHydratedWorkspace. */
export function InvestmentRouteChrome({ children }: { children: ReactNode }) {
  return (
    <GraphQLMoneyProvider>
      <AppHeaderOverrideProvider>
        <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-6">
          <InvestmentSectionHeading />
          {children}
        </div>
      </AppHeaderOverrideProvider>
    </GraphQLMoneyProvider>
  );
}
