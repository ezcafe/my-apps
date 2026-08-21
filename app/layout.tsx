import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/root-providers";
import {
  DATE_FORMAT_COOKIE,
  dateFormatInitInlineScript,
  parseDateFormat,
} from "@/lib/date-format-preference";
import { themeInitInlineScript } from "@/lib/theme-init-script";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Household workspace — Money, analytics, and more. Clean minimal UI with teal accent and neutral dark mode.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const dateFormat = parseDateFormat(
    cookieStore.get(DATE_FORMAT_COOKIE)?.value,
  );

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-style="quiet"
      className={`h-full ${inter.variable} ${plexMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitInlineScript() }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: dateFormatInitInlineScript() }}
        />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <RootProviders dateFormat={dateFormat}>{children}</RootProviders>
      </body>
    </html>
  );
}
