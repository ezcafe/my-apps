import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="shell-main grid grid-cols-2 gap-6 py-8 md:grid-cols-6 lg:grid-cols-12 lg:gap-10 lg:py-10 xl:gap-12">
      <section className="col-span-2 grid grid-cols-2 gap-4 md:col-span-6 md:grid-cols-6 md:gap-6 lg:col-span-12 lg:grid-cols-12 lg:gap-10">
        <div className="col-span-2 min-w-0 space-y-4 md:col-span-4 lg:col-span-8">
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            Household workspace
          </p>
          <h1 className="text-balance text-[clamp(1.5rem,4cqi+1rem,2.35rem)] font-semibold tracking-tight">
            Track shared accounts, categories, and budgets with Pocket ID sign-in.
          </h1>
          <p className="max-w-prose text-pretty text-muted">
            Full-viewport layout, automatic light and dark appearance, and Postgres-backed{" "}
            <code className="rounded bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] px-1 py-0.5 text-xs">
              money_*
            </code>{" "}
            tables — application shell inspired by{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/multi-column"
            >
              Tailwind Plus multi-column layouts
            </a>
            : header navigation on small screens, sticky narrow icon rail from large breakpoints up (Tailwind Plus full-width + narrow sidebar), and page grids that scale from 2 → 6 → 12 columns.
          </p>
          <div className="flex flex-wrap gap-3">
            {session ? (
              <Link
                href="/money"
                className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90"
              >
                Open Money
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/money/analytics"
              className="rounded-xl border border-border px-5 py-3 text-sm font-medium hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
            >
              Analytics
            </Link>
          </div>
        </div>
        <aside className="col-span-2 rounded-2xl border border-border bg-surface p-4 shadow-sm md:col-span-2 lg:col-span-4 lg:p-6">
          <h2 className="text-lg font-medium">More soon</h2>
          <p className="mt-2 text-sm text-muted">
            Navigation is ready for additional modules beyond Money and Analytics.
          </p>
        </aside>
      </section>
    </div>
  );
}
