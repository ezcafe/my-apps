import type { Metadata } from "next";
import "./globals.css";
import { RootProviders } from "@/components/root-providers";

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Household workspace — Money, analytics, and more. Minimal themes with adjustable presets.",
};

const STORAGE_SCRIPT = `
(function () {
  try {
    var root = document.documentElement;
    var t = localStorage.getItem("workspace_theme");
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var resolved =
      t === "light" || t === "dark"
        ? t
        : mq.matches
          ? "dark"
          : "light";
    root.classList.toggle("dark", resolved === "dark");
    var s = localStorage.getItem("workspace_style");
    if (
      s === "linear" ||
      s === "apple" ||
      s === "swiss" ||
      s === "notion"
    ) {
      root.dataset.style = s;
    } else {
      root.dataset.style = "linear";
    }
  } catch (e) {}
})();
`;

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
        <script dangerouslySetInnerHTML={{ __html: STORAGE_SCRIPT }} />
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
