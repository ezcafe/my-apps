import { signInWithPocketId } from "@/actions/auth";

export default function LoginPage() {
  return (
    <div className="shell-main grid min-h-[70dvh] grid-cols-2 place-content-center gap-6 py-16 md:grid-cols-6 lg:grid-cols-12 lg:gap-8 xl:gap-10">
      <div className="col-span-2 grid grid-cols-2 gap-4 md:col-span-6 md:grid-cols-6 lg:col-span-12 lg:grid-cols-12 lg:gap-8 lg:place-items-center">
        <div className="col-span-2 max-w-md space-y-2 md:col-span-4 md:max-w-none lg:col-span-6 lg:justify-self-end lg:text-right">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted">
            Continue with your Pocket ID server using OIDC (passkeys). Configure{" "}
            <code className="rounded bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] px-1 py-0.5 text-xs">
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
          className="col-span-2 flex items-center md:col-span-2 lg:col-span-6 lg:justify-self-start"
        >
          <button
            type="submit"
            className="rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90"
          >
            Continue with Pocket ID
          </button>
        </form>
      </div>
    </div>
  );
}
