"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { useNotify } from "@/components/notification-provider";
import {
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";
import {
  API_HELP_BASE_URL_PLACEHOLDER,
  apiHelpSections,
  buildGraphqlCurlExample,
  resolveApiHelpSampleBody,
  type ApiHelpCodeSample,
  type ApiHelpGraphqlQueryExample,
  type ApiHelpRestExample,
  type ApiHelpSection,
} from "@/lib/api-help-content";
import { cn } from "@/lib/cn";

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
        <p className="mb-1.5 text-xs font-medium text-muted">{sample.label}</p>
      ) : null}
      <div className="relative">
        <pre
          className={cn(
            "max-h-56 overflow-auto rounded-[var(--radius-md)] border border-border bg-muted-surface p-3 font-mono text-xs whitespace-pre-wrap break-all text-foreground",
          )}
        >
          {resolved}
        </pre>
        <button
          type="button"
          className={cn(secondaryBtnCls, "absolute top-2 right-2 px-2 py-1 text-xs")}
          onClick={() => void copy()}
        >
          Copy
        </button>
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
    <Card className="p-5">
      <h3 className="font-display text-base font-semibold text-foreground">
        {section.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">{section.description}</p>

      {section.bullets?.length ? (
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      {section.scopeTable?.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-medium text-foreground">Scope</th>
                <th className="py-2 font-medium text-foreground">Allows</th>
              </tr>
            </thead>
            <tbody>
              {section.scopeTable.map((row) => (
                <tr key={row.scope} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono text-xs text-foreground">
                    {row.scope}
                  </td>
                  <td className="py-2 text-muted">{row.allows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {section.codeSamples?.map((sample) => (
        <HelpCodeBlock key={sample.id} sample={sample} baseUrl={baseUrl} />
      ))}

      {section.id === "token" ? (
        <p className="mt-4">
          <Link
            href="/settings#settings-api-tokens"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Create API token in Settings
          </Link>
        </p>
      ) : null}
    </Card>
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
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm font-semibold text-foreground">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        className="mt-4 grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
        }}
      >
        {details.map((detail) => (
          <HelpDetail key={detail.label} label={detail.label} value={detail.value} />
        ))}
      </dl>

      {inputNotes?.length ? (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground">Inputs</h4>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted">
            {inputNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {usageNotes?.length ? (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground">Usage notes</h4>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted">
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
      label: "Example usage",
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
          label: example.variables ? "Has variables" : "No variables",
          tone: "muted",
        },
        ...(example.badges ?? []),
      ]}
      details={[
        { label: "Purpose", value: example.purpose },
        { label: "Use this when", value: example.whenToUse },
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
        { label: "Use this when", value: example.whenToUse },
        { label: "Returns", value: example.returns },
      ]}
      inputNotes={example.inputNotes}
      usageNotes={example.usageNotes}
      sample={example.codeSample}
      baseUrl={baseUrl}
    />
  );
}

function HelpTabbedCatalog<T extends { id: string; tabLabel?: string }>({
  name,
  items,
  getLabel,
  renderPanel,
}: {
  name: string;
  items: T[];
  getLabel: (item: T) => string;
  renderPanel: (item: T) => ReactNode;
}) {
  const [value, setValue] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) {
      if (value !== "") setValue("");
      return;
    }
    if (!items.some((item) => item.id === value)) {
      setValue(items[0]!.id);
    }
  }, [items, value]);

  const active = items.find((item) => item.id === value) ?? items[0];
  if (!active) return null;

  return (
    <>
      <Tabs
        name={name}
        items={items.map((item) => ({
          id: item.id,
          label: getLabel(item),
        }))}
        value={active.id}
        onChange={setValue}
      />
      <div className="mt-4">{renderPanel(active)}</div>
    </>
  );
}

function HelpSectionBody({
  section,
  baseUrl,
}: {
  section: ApiHelpSection;
  baseUrl: string;
}) {
  return (
    <>
      {section.bullets?.length ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted">
          {section.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}

      {section.scopeTable?.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-medium text-foreground">Scope</th>
                <th className="py-2 font-medium text-foreground">Allows</th>
              </tr>
            </thead>
            <tbody>
              {section.scopeTable.map((row) => (
                <tr key={row.scope} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono text-xs text-foreground">
                    {row.scope}
                  </td>
                  <td className="py-2 text-muted">{row.allows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {section.restTable?.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium text-foreground">Method</th>
                <th className="py-2 pr-3 font-medium text-foreground">Path</th>
                <th className="py-2 pr-3 font-medium text-foreground">Auth</th>
                <th className="py-2 font-medium text-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {section.restTable.map((row) => (
                <tr
                  key={`${row.method}-${row.path}`}
                  className="border-b border-border/60"
                >
                  <td className="py-2 pr-3 font-mono text-xs text-foreground">
                    {row.method}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-foreground">
                    {row.path}
                  </td>
                  <td className="py-2 pr-3 text-muted">{row.auth}</td>
                  <td className="py-2 text-muted">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {section.graphqlQueries?.map((example) => (
        <HelpGraphqlQueryExample
          key={example.id}
          example={example}
          baseUrl={baseUrl}
        />
      ))}

      {section.codeSamples?.map((sample) => (
        <HelpCodeBlock key={sample.id} sample={sample} baseUrl={baseUrl} />
      ))}

      {section.id === "token" ? (
        <p className="mt-4">
          <Link
            href="/settings#settings-api-tokens"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Create API token in Settings
          </Link>
        </p>
      ) : null}
    </>
  );
}

export function ApiHelp() {
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const resolvedBase =
    baseUrl || API_HELP_BASE_URL_PLACEHOLDER;

  const sectionById = useMemo(
    () => new Map(apiHelpSections.map((section) => [section.id, section])),
    [],
  );

  const quickStartSections = [
    sectionById.get("token"),
    sectionById.get("auth"),
    sectionById.get("graphql-schema"),
  ].filter((section): section is ApiHelpSection => Boolean(section));

  const querySection = sectionById.get("graphql-query");
  const mutationSection = sectionById.get("graphql-mutate");
  const restSection = sectionById.get("rest-import");

  const referenceSections = apiHelpSections.filter((section) =>
    ["errors", "security"].includes(section.id),
  );

  return (
    <div className="shell-main grid grid-cols-2 gap-x-2 gap-y-6 py-8 md:grid-cols-6 md:gap-x-4 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-8">
      <header className="col-span-2 md:col-span-6 lg:col-span-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Help
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          API reference for personal Bearer tokens, GraphQL queries, and import
          workflows. Each tab explains the purpose of an endpoint, when to use
          it, what inputs it expects, and shows a copy-ready example.
        </p>
      </header>

      <div className="col-span-2 min-w-0 space-y-6 md:col-span-6 lg:col-span-12">
        <SettingsSection
          id="help-quick-start"
          title="Quick start"
          description="Create a token, send it on every request, then choose the query you need."
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
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

        {querySection ? (
          <SettingsSection
            id={`help-${querySection.id}`}
            title="Query reference"
            description="Choose a query tab, review its purpose and inputs, then copy the example usage."
          >
            <HelpTabbedCatalog
              name="help-queries"
              items={querySection.graphqlQueries ?? []}
              getLabel={(example) => example.tabLabel ?? example.field}
              renderPanel={(example) => (
                <HelpGraphqlExample example={example} baseUrl={resolvedBase} />
              )}
            />
          </SettingsSection>
        ) : null}

        {mutationSection ? (
          <SettingsSection
            id={`help-${mutationSection.id}`}
            title="Mutation reference"
            description="Choose a mutation tab to see whether it works with API tokens or only browser sessions, then copy the example payload."
          >
            <HelpTabbedCatalog
              name="help-mutations"
              items={mutationSection.graphqlMutations ?? []}
              getLabel={(example) => example.tabLabel ?? example.field}
              renderPanel={(example) => (
                <HelpGraphqlExample example={example} baseUrl={resolvedBase} />
              )}
            />
          </SettingsSection>
        ) : null}

        {restSection ? (
          <SettingsSection
            id={`help-${restSection.id}`}
            title="REST API reference"
            description="Choose a REST endpoint tab to see its auth model, request shape, and example usage."
          >
            <HelpTabbedCatalog
              name="help-rest"
              items={restSection.restApis ?? []}
              getLabel={(example) => example.tabLabel}
              renderPanel={(example) => (
                <HelpRestApiExample example={example} baseUrl={resolvedBase} />
              )}
            />
          </SettingsSection>
        ) : null}

        {referenceSections.map((section) => (
          <SettingsSection
            key={section.id}
            id={`help-${section.id}`}
            title={section.title}
            description={section.description}
          >
            <HelpSectionBody section={section} baseUrl={resolvedBase} />
          </SettingsSection>
        ))}
      </div>
    </div>
  );
}
