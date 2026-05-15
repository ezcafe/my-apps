# Money feature module

Domain code for the **Money** workspace app (`WorkspaceAppKey` `"money"`). Routes live under `app/(shell)/money/**`; HTTP handlers under `app/api/money/**`.

## Client fetch

Import the shared JSON helper from this barrel:

```ts
import { moneyApiJson } from "@/features/money";
```

Implementation lives in [`lib/money-fetch.ts`](../../lib/money-fetch.ts) (credentials + JSON envelope).

## Thin API route pattern

Next.js must keep route entrypoints in `app/api/money/*/route.ts`. Keep each file **thin**: parse request, call a function under `features/money/server/` (or `lib/` today), return `NextResponse.json`.

Example shape:

```ts
// app/api/money/example/route.ts
import { NextResponse } from "next/server";
import { handleExample } from "@/features/money/server/example";

export async function GET() {
  return handleExample();
}
```

```ts
// features/money/server/example.ts
import { NextResponse } from "next/server";
import { requireMoneyContext } from "@/lib/api-money";

export async function handleExample() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;
  return NextResponse.json({ data: { workspaceId: ctx.workspaceId } });
}
```

Always resolve the active workspace with the same helpers as existing Money routes ([`requireMoneyContext`](../../lib/api-money.ts), cookies per `workspaceCookieName("money")` from [`lib/workspace-context.ts`](../../lib/workspace-context.ts)).

## Workspace bootstrap (client)

[`MoneyWorkspaceProvider`](../../components/money-workspace-provider.tsx) runs only inside [`money/layout.tsx`](../../app/(shell)/money/layout.tsx). New features should add their own layout-level provider, not the global shell.
