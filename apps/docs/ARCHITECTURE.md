# Workspace app architecture

This document describes how the Next.js app is layered so **features stay isolated**, **workspaces are consistent**, and new work can follow the same patterns.

## Layers

| Layer | Role | Examples |
|-------|------|----------|
| **Shell** | Auth session, global chrome, theme, nav from registry | [`components/shell-layout.tsx`](../components/shell-layout.tsx), [`components/app-shell.tsx`](../components/app-shell.tsx), [`lib/features/registry.ts`](../lib/features/registry.ts) |
| **Feature** | Product area with its own routes, API namespace, client bootstrap | Money: `app/(shell)/money/**`, `app/api/money/**`, [`components/money-workspace-provider.tsx`](../components/money-workspace-provider.tsx), [`features/money/`](../features/money/) |
| **Shared** | DB, validators, workspace resolution, UI tokens | [`db/`](../db/), [`lib/workspace-context.ts`](../lib/workspace-context.ts), [`lib/api-money.ts`](../lib/api-money.ts), [`app/globals.css`](../app/globals.css), [`components/ui/`](../components/ui/) |

## Workspace model (all product features)

Every first-class module (Money today; Tasks, Notes, etc. later) **must**:

1. Declare a **`WorkspaceAppKey`** in [`db/schema/workspace.ts`](../db/schema/workspace.ts) (`WORKSPACE_APP_KEYS`).
2. Use the shared cookie name [`workspaceCookieName(appKey)`](../lib/workspace-context.ts) so the active workspace is per user and per app.
3. Resolve membership + `workspaceId` in API handlers the same way Money does (see [`requireMoneyContext`](../lib/api-money.ts) and `/api/workspace/active`).
4. Register shell navigation in [`lib/features/registry.ts`](../lib/features/registry.ts) with `kind: "feature"` and **`workspaceAppKey` required`.

Finance domains (investments, loans, savings movements) are **modules under Money**, not separate `WorkspaceAppKey` entries. Investment activities live in `money_transaction` + `money_transaction_investment`; loan payments are `money_transaction` rows linked from installment status.

**Core** routes (Home, Settings) use `kind: "core"` and do not declare an app key; they must not depend on a feature’s bootstrap APIs.

## Money bootstrap (scoped)

Money-specific client bootstrap (init + default currency modal) runs only inside [`MoneyWorkspaceProvider`](../components/money-workspace-provider.tsx), mounted from [`money/layout.tsx`](../app/(shell)/money/layout.tsx) via [`MoneyRouteLayout`](../components/money-route-layout.tsx).

Other shell routes (e.g. `/settings`) **do not** call `/api/money/workspace/init` on load.

## Themes and providers

- Root layout: [`app/layout.tsx`](../app/layout.tsx) — fonts, metadata, [`RootProviders`](../components/root-providers.tsx) (theme, toasts).
- Authenticated chrome: [`app/(shell)/layout.tsx`](../app/(shell)/layout.tsx) → `ShellLayout` → `AppShell`.

## Analytics and Money

Money insights live under **`/money/analytics`**, so they inherit `MoneyWorkspaceProvider`. If you add top-level routes that need Money currency context, keep them under the `money` segment **or** refactor to a neutral API that does not require `useWorkspaceCurrency` without the provider.

## Feature registry

[`shellNavItems`](../lib/features/registry.ts) is the single place to add/remove **top-level nav** entries. `registeredWorkspaceFeatures()` returns only `kind: "feature"` rows for tooling or docs.

## Further reading

- [DESIGN_GUIDE.md](./DESIGN_GUIDE.md) — **mandatory** design system: tokens, primitives, microinteractions, style presets.
- [ADDING_A_FEATURE.md](./ADDING_A_FEATURE.md) — checklist for new modules.
- [PERFORMANCE.md](./PERFORMANCE.md) — performance notes.
