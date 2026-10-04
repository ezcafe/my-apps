# Light repo skim: app-improvement-discover-ship

**Result:** done  
**Updated:** 2026-10-04

## Project shape (1–3 sentences)

Next.js shell (`my-apps`) with Money, Investments, Loans, Baby Care plus Kiosk / Help / Settings. Features use workspace cookies + thin `app/api` routes; UI must follow `docs/DESIGN_GUIDE.md`. Many prior `.my-docs/workflow/*` runs sit at Gate C while large chunks of that work already landed on `main`.

## Related existing UI / screens

| Surface | Path / component |
|---------|------------------|
| Shell nav | `lib/features/registry.ts`, `components/app-shell.tsx`, `components/money-section-tabs.tsx` (grouped drawer + Other apps) |
| Money | `app/(shell)/money/**`, Insights → `AnalyticsDashboard` |
| Investments / Loans | `app/(shell)/investments/**`, `app/(shell)/loans/**` |
| Baby Care | `app/(shell)/baby/**` (home, feed/pump/sleep/diaper, insights, activities, growth) |
| Settings | `app/(shell)/settings/**`, shared `components/settings/settings-page-layout.tsx` (`activeCategory`) |
| Charts | `components/charts/chart-shell.tsx`, domain `*-chart.tsx` / `*-insights-dashboard.tsx` |

## Related APIs / data

| Need | Existing |
|------|----------|
| Money lists | `page` / `pageSize` + composite cursor (`lib/validators/money.ts`) |
| Inv / Savings / Loans lists | `limit` / `cursor` uuid |
| Baby lists | `limit` max 100 + optional cursor |
| API tokens | prefixes `mny_` / `sav_` / `inv_` (`lib/api-auth.ts`); Baby grant checks exist; no `bby_` prefix in `API_TOKEN_PREFIX_BY_APP` |
| Architecture follow-ups | Pagination unify; Idempotency-Key on three REST paths only (`docs/ARCHITECTURE.md`) |

## Hard constraints (do not fight)

- Shell vs feature layers; registry + `WorkspaceAppKey` for new apps (`docs/ADDING_A_FEATURE.md`).
- DESIGN_GUIDE tokens / skeleton parity / progressive disclosure (`docs/SPEC.md`).
- Do not casually rename pagination dialects without a dedicated approved task.
- Gate C / merge need explicit human yes — discovery must not auto-merge old runs.
- Prefer reuse of shipped patterns (Money Insights, grouped drawer, Settings single-pane) over rewrites.

## Risks if we ignore the repo

- Re-propose already-shipped work (drawer groups, Insights urgency, ChartShell on Baby) as “new”.
- Pick XXL “unify all APIs” without a one-PR slice.
- Treat every Gate C pause as unfinished product when code is already on `main`.

## Enough for UI concept / Analyze?

**yes** — Analyze should inventory remaining gaps vs `main`, rank by day-to-day jobs, and define ship-slice criteria (no UI concept / Gate A2).
