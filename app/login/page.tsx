import { signInWithPocketId } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="shell-main grid min-h-[50dvh] place-content-center gap-5 py-8 fx-fade-in">
      <div className="grid items-center gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
        <div className="max-w-md space-y-2 lg:justify-self-end lg:text-right">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
            Workspace
          </p>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Sign in
          </h1>
          <p className="text-sm text-muted">
            Continue with your Pocket ID server using OIDC (passkeys). Configure{" "}
            <code className="rounded-[var(--radius-sm)] bg-muted-surface px-1 py-0.5 font-mono text-xs">
              AUTH_POCKET_ID_*
            </code>{" "}
            and redirect URIs per{" "}
            <a
              className="underline underline-offset-2"
              href="https://pocket-id.org/docs/guides/oidc-client-authentication"
            >
              Pocket ID OIDC docs
            </a>
            .
          </p>
        </div>
        <form
          action={signInWithPocketId}
          className="flex items-center lg:justify-self-start"
        >
          <Button type="submit" variant="primary">
            Continue with Pocket ID
          </Button>
        </form>
      </div>
    </div>
  );
}
