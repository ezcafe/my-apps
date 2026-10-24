# Skim

**Result:** done

## Findings

- **Feature checklist:** `docs/ADDING_A_FEATURE.md` — add `WORKSPACE_APP_KEYS`, registry + icon, `app/(shell)/foods/**` + provider, thin `app/api/foods/**`, DESIGN_GUIDE.
- **Workspace keys today:** `money` | `notes` | `tasks` | `baby` in `db/schema/workspace.ts` — no `foods` yet.
- **Nav pattern:** `lib/features/registry.ts` + `ShellNavIconId` in `components/app-shell.tsx`. Closest product twin: **Baby Care** (`app/(shell)/baby/layout.tsx` → workspace provider + route chrome).
- **Logging / calendar:** No shared calendar component found. Baby uses event timelines/insights — Foods calendar will be new UI, must match design tokens + skeleton parity.
- **AI:** No OpenAI / Anthropic / AI SDK usage in app TS today — Foods analysis needs a **new** server helper + env (name TBD in Design; never commit secrets).
- **Auth/workspace:** Reuse existing workspace membership helpers (`lib/workspace-context.ts` / Money/Baby require-* patterns).
