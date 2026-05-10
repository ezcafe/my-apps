import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/root-providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Money",
  description: "Household budgeting and analytics",
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
      className={`${geistSans.variable} h-full`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
