"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoneyAppMenu } from "@/components/money-section-tabs";
import { AppHeaderOverrideProvider, useAppHeaderOverride } from "@/components/app-header-override";
import { GraphQLMoneyProvider } from "@/components/graphql-money-provider";
import { PageHeading } from "@/components/page-heading";
import { buttonClassName } from "@/components/ui/button";
import { resolveLoanAppHeader } from "@/lib/loan-app-header";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

function LoanSectionHeading() {
  const pathname = usePathname();
  const override = useAppHeaderOverride();
  const resolved = resolveLoanAppHeader(pathname);

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
      className={MONEY_FULL_SPAN}
      leading={<MoneyAppMenu />}
      title={title}
      description={description}
      meta={meta}
      breadcrumbs={breadcrumbs}
      actions={
        cta ? (
          <Link
            href={cta.href}
            className={buttonClassName({
              variant: "primary",
              className: "shrink-0",
            })}
          >
            {cta.label}
          </Link>
        ) : null
      }
    />
  );
}

/** Query client + Loans heading. Bootstrap hydrates inside MoneyHydratedWorkspace. */
export function LoanRouteChrome({ children }: { children: ReactNode }) {
  return (
    <GraphQLMoneyProvider>
      <AppHeaderOverrideProvider>
        <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-6">
          <LoanSectionHeading />
          {children}
        </div>
      </AppHeaderOverrideProvider>
    </GraphQLMoneyProvider>
  );
}
