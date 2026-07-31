import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/root-providers";
import { themeInitInlineScript } from "@/lib/theme-init-script";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Household workspace — Money, analytics, and more. Quiet Ink UI with Catppuccin Latte (light) and Mocha (dark).",
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
      data-style="quiet"
      className={`h-full ${plexSans.variable} ${plexMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitInlineScript() }}
        />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
