import type { Metadata } from "next";
import "./globals.css";
import { RootProviders } from "@/components/root-providers";
import { themeInitInlineScript } from "@/lib/theme-init-script";

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
      data-style="apple"
      className="h-full"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitInlineScript() }}
        />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
