"use client";

import { Alert } from "@/components/ui/alert";
import { HomeContextStrip } from "@/components/home/home-context-strip";
import { HomeLoansCard } from "@/components/home/home-loans-card";
import { HomeNetCard, HomeNetUnavailable } from "@/components/home/home-net-card";
import { HomeSectionHeading } from "@/components/home/home-section-heading";
import { MONEY_DASHBOARD_STACK } from "@/lib/money-layout";
import { cn } from "@/lib/cn";
import type { HomePageData } from "@/lib/home-services/load-home-page";

export function HomeDashboard({ data }: { data: HomePageData }) {
  return (
    <div className={cn(MONEY_DASHBOARD_STACK, "fx-fade-in fx-stagger-children")}>
      {data.dbUnavailable ? (
        <Alert
          variant="warning"
          title="Database temporarily unavailable"
          description="Finance cards need PostgreSQL. Today's date and weather still work when configured."
        />
      ) : null}
      {data.noWorkspace ? (
        <Alert
          variant="warning"
          title="No Money workspace"
          description="Create or select a workspace in Settings to see net money and loan due dates."
        />
      ) : null}

      <section aria-label="Today and weather">
        <HomeContextStrip weather={data.weather} weatherCity={data.weatherCity} />
      </section>

      <section aria-labelledby="home-net-heading" className="space-y-3">
        <HomeSectionHeading
          id="home-net-heading"
          title="Money this month"
          description="Net cash flow for the current calendar month."
          action={{ href: "/money/insights", label: "Open insights" }}
        />
        {data.net ? (
          <HomeNetCard net={data.net} currency={data.currency} />
        ) : (
          <HomeNetUnavailable currency={data.currency} />
        )}
      </section>

      <section aria-labelledby="home-loans-heading" className="space-y-3">
        <HomeSectionHeading
          id="home-loans-heading"
          title="Loan payments"
          description="Overdue installments first, then the next due dates."
          action={{ href: "/loans", label: "All loans" }}
        />
        <HomeLoansCard loans={data.loans} />
      </section>
    </div>
  );
}
