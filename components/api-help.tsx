"use client";

import Link from "next/link";
import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useNotify } from "@/components/notification-provider";
import { SettingsSection } from "@/components/money-settings/money-settings-shared";
import { CoreShellPage } from "@/components/core-shell-page";
import {
  API_HELP_BASE_URL_PLACEHOLDER,
  apiHelpGraphqlMutationExamples,
  apiHelpGraphqlQueryExamples,
  apiHelpRestApiExamples,
  apiHelpSections,
  apiHelpWorkflowGuides,
  buildGraphqlCurlExample,
  resolveApiHelpSampleBody,
  type ApiHelpCodeSample,
  type ApiHelpGraphqlQueryExample,
  type ApiHelpRestExample,
  type ApiHelpSection,
  type ApiHelpWorkflowGuide,
} from "@/lib/api-help-content";
import { cn } from "@/lib/cn";

function subscribeOrigin() {
  return () => {};
}

function getClientOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return API_HELP_BASE_URL_PLACEHOLDER;
}

function useDocumentOrigin() {
  return useSyncExternalStore(subscribeOrigin, getClientOrigin, getServerOrigin);
}

function HelpCodeBlock({
  sample,
  baseUrl,
}: {
  sample: ApiHelpCodeSample;
  baseUrl: string;
}) {
  const notify = useNotify();
  const resolved = useMemo(
    () => resolveApiHelpSampleBody(sample.body, baseUrl),
    [sample.body, baseUrl],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(resolved);
      notify.success("Copied to clipboard");
    } catch {
      notify.error("Copy failed", "Select and copy the snippet manually.");
    }
  }, [resolved, notify]);

  return (
    <div className="mt-3">
      {sample.label ? (
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          {sample.label}
        </p>
      ) : null}
      <div className="relative">
        <pre
          className={cn(
            "max-h-64 overflow-auto rounded-[var(--radius-sm)] border border-border bg-muted-surface p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-all text-foreground select-all",
          )}
        >
          {resolved}
        </pre>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2 text-xs"
          onClick={() => void copy()}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}

function HelpDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-background p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function HelpQuickStartCard({
  section,
  baseUrl,
}: {
  section: ApiHelpSection;
  baseUrl: string;
}) {
  return (
    <Card className="flex flex-col justify-between p-4.5">
      <div>
        <h3 className="font-display text-base font-semibold text-foreground">
          {section.title}
        </h3>
        <p className="mt-1.5 text-sm leading-6 text-muted">{section.description}</p>

        {section.bullets?.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-5 text-muted">
            {section.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}

        {section.scopeTable?.length ? (
          <div className="mt-3 overflow-hidden rounded-[var(--radius-sm)] border border-border">
            <Table className="min-w-full text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1.5">Scope</TableHead>
                  <TableHead className="py-1.5">Allows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.scopeTable.map((row) => (
                  <TableRow key={row.scope}>
                    <TableCell className="py-1.5 font-mono text-foreground">
                      {row.scope}
                    </TableCell>
                    <TableCell className="py-1.5 text-muted">{row.allows}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {section.codeSamples?.map((sample) => (
          <HelpCodeBlock key={sample.id} sample={sample} baseUrl={baseUrl} />
        ))}
      </div>

      {section.id === "token" ? (
        <div className="mt-4 pt-2 border-t border-border">
          <Link
            href="/settings#settings-api-tokens"
            className="text-xs font-semibold text-accent underline-offset-4 hover:underline"
          >
            Create API token in Settings &rarr;
          </Link>
        </div>
      ) : null}
    </Card>
  );
}

function HelpWorkflowGuideView({
  guide,
  baseUrl,
}: {
  guide: ApiHelpWorkflowGuide;
  baseUrl: string;
}) {
  return (
    <div className="space-y-6">
      {/* Guide Header */}
      <div className="rounded-[var(--radius-sm)] border border-border bg-muted-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">
            {guide.title}
          </h3>
          <Badge tone={guide.badgeTone ?? "accent"}>{guide.badge}</Badge>
        </div>
        <p className="mt-1.5 text-sm leading-6 text-muted">{guide.description}</p>

        {guide.prerequisites.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted border-t border-border pt-2.5">
            <span className="font-semibold text-foreground">Prerequisites:</span>
            {guide.prerequisites.map((prereq, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {prereq}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Steps List */}
      <div className="space-y-6">
        {guide.steps.map((step) => (
          <Card key={step.stepNumber} className="relative p-4.5 pl-5">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                {step.stepNumber}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-foreground">
                  {step.title}
                </h4>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  {step.explanation}
                </p>

                {step.keyNotes?.length ? (
                  <ul className="mt-2.5 list-disc space-y-1 pl-4 text-xs text-muted">
                    {step.keyNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                ) : null}

                {step.codeSamples.map((sample) => (
                  <HelpCodeBlock key={sample.id} sample={sample} baseUrl={baseUrl} />
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Rules & Gotchas Callout */}
      {guide.rulesAndGotchas.length > 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-border bg-card p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Developer Rules & Common Gotchas
          </h4>
          <div
            className="mt-3 grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
            }}
          >
            {guide.rulesAndGotchas.map((rule, idx) => (
              <div
                key={idx}
                className="rounded-[var(--radius-sm)] border border-border bg-background p-3"
              >
                <dt className="text-xs font-semibold text-foreground">{rule.term}</dt>
                <dd className="mt-1 text-xs text-muted leading-relaxed">
                  {rule.explanation}
                </dd>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HelpCatalogPanel({
  title,
  summary,
  badges,
  details,
  inputNotes,
  usageNotes,
  sample,
  baseUrl,
}: {
  title: string;
  summary: string;
  badges: { label: string; tone?: "default" | "accent" | "muted" | "destructive" }[];
  details: { label: string; value: string }[];
  inputNotes?: string[];
  usageNotes?: string[];
  sample: ApiHelpCodeSample;
  baseUrl: string;
}) {
  return (
    <Card className="min-w-0 p-4.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm font-semibold text-foreground">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <Badge
              key={`${badge.tone ?? "default"}-${badge.label}`}
              tone={badge.tone ?? "default"}
            >
              {badge.label}
            </Badge>
          ))}
        </div>
      </div>

      <dl
        className="mt-3.5 grid gap-2.5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
        }}
      >
        {details.map((detail) => (
          <HelpDetail key={detail.label} label={detail.label} value={detail.value} />
        ))}
      </dl>

      {inputNotes?.length ? (
        <div className="mt-3.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Input parameters
          </h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-5 text-muted">
            {inputNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {usageNotes?.length ? (
        <div className="mt-3.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Usage notes
          </h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-5 text-muted">
            {usageNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <HelpCodeBlock sample={sample} baseUrl={baseUrl} />
    </Card>
  );
}

function HelpGraphqlExample({
  example,
  baseUrl,
}: {
  example: ApiHelpGraphqlQueryExample;
  baseUrl: string;
}) {
  const sample = useMemo(
    (): ApiHelpCodeSample => ({
      id: example.id,
      label: "cURL example",
      language: "bash",
      body: buildGraphqlCurlExample(example.query, example.variables),
    }),
    [example],
  );

  return (
    <HelpCatalogPanel
      title={example.field}
      summary={example.summary}
      badges={[
        { label: `GraphQL ${example.operationKind}`, tone: "accent" },
        {
          label: example.category ? example.category.toUpperCase() : "GENERAL",
          tone: "muted",
        },
        ...(example.badges ?? []),
      ]}
      details={[
        { label: "Purpose", value: example.purpose },
        { label: "When to use", value: example.whenToUse },
        { label: "Returns", value: example.returns },
      ]}
      inputNotes={example.inputNotes}
      usageNotes={example.usageNotes}
      sample={sample}
      baseUrl={baseUrl}
    />
  );
}

function HelpRestApiExample({
  example,
  baseUrl,
}: {
  example: ApiHelpRestExample;
  baseUrl: string;
}) {
  return (
    <HelpCatalogPanel
      title={`${example.method} ${example.path}`}
      summary={example.summary}
      badges={[
        { label: "REST API", tone: "accent" },
        { label: example.auth, tone: "muted" },
        ...(example.badges ?? []),
      ]}
      details={[
        { label: "Purpose", value: example.purpose },
        { label: "When to use", value: example.whenToUse },
        { label: "Returns", value: example.returns },
      ]}
      inputNotes={example.inputNotes}
      usageNotes={example.usageNotes}
      sample={example.codeSample}
      baseUrl={baseUrl}
    />
  );
}

export function ApiHelp() {
  const resolvedBase = useDocumentOrigin();

  // Workflow Guides state
  const [selectedGuideId, setSelectedGuideId] = useState(
    apiHelpWorkflowGuides[0]?.id ?? "guide-data-fetch",
  );
  const activeGuide =
    apiHelpWorkflowGuides.find((g) => g.id === selectedGuideId) ??
    apiHelpWorkflowGuides[0];

  // API Catalog section filter
  const [catalogCategory, setCatalogCategory] = useState<"queries" | "mutations" | "rest">("queries");

  // Sub-tab selection within catalog categories
  const [selectedQueryId, setSelectedQueryId] = useState(
    apiHelpGraphqlQueryExamples[0]?.id ?? "",
  );
  const [selectedMutationId, setSelectedMutationId] = useState(
    apiHelpGraphqlMutationExamples[0]?.id ?? "",
  );
  const [selectedRestId, setSelectedRestId] = useState(
    apiHelpRestApiExamples[0]?.id ?? "",
  );

  const activeQuery =
    apiHelpGraphqlQueryExamples.find((q) => q.id === selectedQueryId) ??
    apiHelpGraphqlQueryExamples[0];

  const activeMutation =
    apiHelpGraphqlMutationExamples.find((m) => m.id === selectedMutationId) ??
    apiHelpGraphqlMutationExamples[0];

  const activeRest =
    apiHelpRestApiExamples.find((r) => r.id === selectedRestId) ??
    apiHelpRestApiExamples[0];

  const sectionById = useMemo(
    () => new Map(apiHelpSections.map((section) => [section.id, section])),
    [],
  );

  const quickStartSections = [
    sectionById.get("overview"),
    sectionById.get("token"),
    sectionById.get("auth"),
  ].filter((section): section is ApiHelpSection => Boolean(section));

  const referenceSections = [
    sectionById.get("graphql-schema"),
    sectionById.get("errors"),
    sectionById.get("security"),
  ].filter((section): section is ApiHelpSection => Boolean(section));

  return (
    <CoreShellPage
      description="Interactive developer guides and complete API reference for Money, Loans, and Investment workspaces. Authenticate with Bearer tokens or browser sessions."
    >
      {/* Anchor Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted mr-1">
          Jump to:
        </span>
        <a
          href="#help-quick-start"
          className="rounded-[var(--radius-sm)] border border-border bg-muted-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-card transition-colors"
        >
          Quick Start
        </a>
        <a
          href="#help-workflow-guides"
          className="rounded-[var(--radius-sm)] border border-border bg-muted-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-card transition-colors"
        >
          Practical Guides
        </a>
        <a
          href="#help-api-catalog"
          className="rounded-[var(--radius-sm)] border border-border bg-muted-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-card transition-colors"
        >
          API Catalog
        </a>
        <a
          href="#help-reference"
          className="rounded-[var(--radius-sm)] border border-border bg-muted-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-card transition-colors"
        >
          Schema & Security
        </a>
      </div>

      {/* 1. Quick Start Section */}
      <SettingsSection
        id="help-quick-start"
        title="Quick Start"
        description="Authenticate every request with a workspace Bearer token or browser session."
      >
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(17rem, 1fr))",
          }}
        >
          {quickStartSections.map((section) => (
            <HelpQuickStartCard
              key={section.id}
              section={section}
              baseUrl={resolvedBase}
            />
          ))}
        </div>
      </SettingsSection>

      {/* 2. Step-by-Step Practical Guides */}
      <SettingsSection
        id="help-workflow-guides"
        title="Practical Workflow Guides"
        description="Follow step-by-step developer walkthroughs for querying reference data, adding transactions, managing loans, and recording investment activities."
      >
        <Tabs
          name="workflow-guides-tabs"
          items={apiHelpWorkflowGuides.map((guide) => ({
            id: guide.id,
            label: guide.shortTitle,
          }))}
          value={activeGuide?.id ?? ""}
          onChange={setSelectedGuideId}
        />

        <div className="mt-5">
          {activeGuide ? (
            <HelpWorkflowGuideView
              guide={activeGuide}
              baseUrl={resolvedBase}
            />
          ) : null}
        </div>
      </SettingsSection>

      {/* 3. Categorized Full API Catalog */}
      <SettingsSection
        id="help-api-catalog"
        title="API Reference Catalog"
        description="Searchable reference of all GraphQL queries, mutations, and REST endpoints across Money, Loans, and Investment domains."
      >
        <div className="space-y-4">
          <Tabs
            name="catalog-category-tabs"
            items={[
              { id: "queries", label: "GraphQL Queries" },
              { id: "mutations", label: "GraphQL Mutations" },
              { id: "rest", label: "REST Endpoints" },
            ]}
            value={catalogCategory}
            onChange={(val) => setCatalogCategory(val as "queries" | "mutations" | "rest")}
          />

          {catalogCategory === "queries" ? (
            <div className="space-y-4">
              <Tabs
                name="catalog-query-items"
                items={apiHelpGraphqlQueryExamples.map((q) => ({
                  id: q.id,
                  label: q.tabLabel ?? q.field,
                }))}
                value={activeQuery?.id ?? ""}
                onChange={setSelectedQueryId}
              />
              {activeQuery ? (
                <HelpGraphqlExample example={activeQuery} baseUrl={resolvedBase} />
              ) : null}
            </div>
          ) : null}

          {catalogCategory === "mutations" ? (
            <div className="space-y-4">
              <Tabs
                name="catalog-mutation-items"
                items={apiHelpGraphqlMutationExamples.map((m) => ({
                  id: m.id,
                  label: m.tabLabel ?? m.field,
                }))}
                value={activeMutation?.id ?? ""}
                onChange={setSelectedMutationId}
              />
              {activeMutation ? (
                <HelpGraphqlExample example={activeMutation} baseUrl={resolvedBase} />
              ) : null}
            </div>
          ) : null}

          {catalogCategory === "rest" ? (
            <div className="space-y-4">
              <Tabs
                name="catalog-rest-items"
                items={apiHelpRestApiExamples.map((r) => ({
                  id: r.id,
                  label: r.tabLabel,
                }))}
                value={activeRest?.id ?? ""}
                onChange={setSelectedRestId}
              />
              {activeRest ? (
                <HelpRestApiExample example={activeRest} baseUrl={resolvedBase} />
              ) : null}
            </div>
          ) : null}
        </div>
      </SettingsSection>

      {/* 4. Utilities, Errors & Security */}
      <SettingsSection
        id="help-reference"
        title="Schema, Error Envelopes & Security"
        description="Export tooling, HTTP error codes, and security requirements."
      >
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
          }}
        >
          {referenceSections.map((section) => (
            <Card key={section.id} className="p-4.5">
              <h3 className="font-display text-sm font-semibold text-foreground">
                {section.title}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-muted">{section.description}</p>

              {section.bullets?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-5 text-muted">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}

              {section.codeSamples?.map((sample) => (
                <HelpCodeBlock key={sample.id} sample={sample} baseUrl={baseUrlWithFallback(resolvedBase)} />
              ))}
            </Card>
          ))}
        </div>
      </SettingsSection>
    </CoreShellPage>
  );
}

function baseUrlWithFallback(base: string) {
  return base || API_HELP_BASE_URL_PLACEHOLDER;
}
