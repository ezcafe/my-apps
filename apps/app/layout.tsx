import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { RootProviders } from "@/components/root-providers";

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Household workspace — Money, analytics, and more. Minimal themes with adjustable presets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-style="linear"
      className="h-full"
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
