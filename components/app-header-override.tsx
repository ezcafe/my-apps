"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import type { MoneySectionPrimaryCta } from "@/lib/money-section-primary-cta";

export type AppHeaderOverride = {
  title?: string;
  description?: ReactNode;
  /** One-line scope under the title row. */
  meta?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** When set, replaces pathname-derived CTA; `null` hides CTA. */
  cta?: MoneySectionPrimaryCta | null;
};

type AppHeaderOverrideContextValue = {
  override: AppHeaderOverride | null;
  setOverride: (next: AppHeaderOverride | null) => void;
};

const AppHeaderOverrideContext =
  createContext<AppHeaderOverrideContextValue | null>(null);

export function AppHeaderOverrideProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [override, setOverride] = useState<AppHeaderOverride | null>(null);
  const value = useMemo(
    () => ({ override, setOverride }),
    [override],
  );

  return (
    <AppHeaderOverrideContext.Provider value={value}>
      {children}
    </AppHeaderOverrideContext.Provider>
  );
}

export function useAppHeaderOverride(): AppHeaderOverride | null {
  return useContext(AppHeaderOverrideContext)?.override ?? null;
}

/**
 * Sets header override while mounted; clears on unmount.
 * Primitive/serialized deps avoid thrashing from inline objects.
 */
export function useSetAppHeader(next: AppHeaderOverride | null): void {
  const ctx = useContext(AppHeaderOverrideContext);
  const setOverride = ctx?.setOverride;

  const title = next?.title;
  const description = next?.description;
  const meta = next?.meta;
  const hasCtaKey = next != null && "cta" in next;
  const ctaHref = next?.cta?.href;
  const ctaLabel = next?.cta?.label;
  const ctaExplicitNull = hasCtaKey && next?.cta == null;
  const crumbsKey = (next?.breadcrumbs ?? [])
    .map((b) => `${b.label}\0${b.href ?? ""}`)
    .join("\n");

  useEffect(() => {
    if (!setOverride) return;

    if (
      title == null &&
      description == null &&
      meta == null &&
      !crumbsKey &&
      !hasCtaKey
    ) {
      setOverride(null);
      return () => setOverride(null);
    }

    const breadcrumbs: BreadcrumbItem[] = crumbsKey
      ? crumbsKey.split("\n").map((row) => {
          const [label, href = ""] = row.split("\0");
          return href ? { label, href } : { label };
        })
      : [];

    const cta: MoneySectionPrimaryCta | null | undefined = !hasCtaKey
      ? undefined
      : ctaExplicitNull
        ? null
        : ctaHref != null && ctaLabel != null
          ? { href: ctaHref, label: ctaLabel }
          : undefined;

    setOverride({
      ...(title != null ? { title } : {}),
      ...(description != null ? { description } : {}),
      ...(meta != null ? { meta } : {}),
      ...(breadcrumbs.length > 0 ? { breadcrumbs } : {}),
      ...(cta !== undefined ? { cta } : {}),
    });

    return () => setOverride(null);
  }, [
    setOverride,
    title,
    description,
    meta,
    crumbsKey,
    hasCtaKey,
    ctaHref,
    ctaLabel,
    ctaExplicitNull,
  ]);
}
