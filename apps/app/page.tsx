import Link from "next/link";
import { auth } from "@/auth";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();

  return (
    <div className="shell-main grid gap-6 py-8 lg:gap-10 lg:py-10 xl:gap-12 fx-fade-in">
      <section className="grid min-w-0 gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        <div className="min-w-0 space-y-4">
          <p className="font-display text-sm font-medium uppercase tracking-wide text-muted">
            Workspace
          </p>
          <h1 className="font-display text-balance text-[clamp(1.5rem,4cqi+1rem,2.35rem)] font-semibold tracking-tight">
            One place for household money today — more tools when you need them.
          </h1>
          <p className="max-w-prose text-pretty text-muted">
            Sign in with Pocket ID, pick a workspace, and use Money for accounts,
            categories, budgets, and analytics. The shell scales from phones to wide
            desktops with a compact rail on large screens.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={session ? "/money" : "/login"}
              className={buttonClassName({ variant: "primary", size: "lg" })}
            >
              {session ? "Open Money" : "Sign in"}
            </Link>
            <Link
              href="/money/analytics"
              className={buttonClassName({ variant: "secondary", size: "lg" })}
            >
              Analytics
            </Link>
          </div>
        </div>
        <Card className="p-5 lg:p-6">
          <h2 className="font-display text-lg font-medium">Roadmap</h2>
          <p className="mt-2 text-sm text-muted">
            Tasks, habits, inventory, and more will plug into the same workspace
            navigation.
          </p>
        </Card>
      </section>
    </div>
  );
}
