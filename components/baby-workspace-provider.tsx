"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { BabyLocaleProvider } from "@/components/baby-locale-provider";
import type { BabyLocale } from "@/lib/baby-i18n";

export function BabyWorkspaceProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: BabyLocale;
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BabyLocaleProvider initialLocale={initialLocale}>
        {children}
      </BabyLocaleProvider>
    </QueryClientProvider>
  );
}
