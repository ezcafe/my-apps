import type { Metadata } from "next";
import { signInWithPocketId } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="shell-main grid min-h-dvh place-content-center fx-fade-in">
      <section className="mx-auto flex w-full max-w-md flex-col gap-8 text-center">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Workspace</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
        </header>

        <form action={signInWithPocketId}>
          <Button type="submit" variant="primary" className="w-full">
            Continue with Pocket ID
          </Button>
        </form>
      </section>
    </main>
  );
}
