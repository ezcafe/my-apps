# Light repo skim: baby-insights-activity-log-money-parity

**Result:** done
**Updated:** 2026-09-16
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js shell app with Baby and Money workspaces. Baby Insights (`/baby/insights`) is a client dashboard with filters, charts, and an expandable **Activity log** that already merges care + growth into a shared `Table` + `@md` mobile cards (view-only browse from `baby-insights-table-style`). Money Transactions is the reference ledger: checkbox select, selected/hover row chrome, per-row Edit, and a fixed bottom selection bar.

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `/Users/ptquang86/ws/my-apps/app/(shell)/baby/insights/page.tsx` | Thin route → `BabyInsightsDashboard` | yes — entry |
| `/Users/ptquang86/ws/my-apps/components/baby-insights-dashboard.tsx` | Activity log expand panel; merged rows; whole-row click → edit; show-more / load-more | yes — primary surface to change |
| `/Users/ptquang86/ws/my-apps/components/baby-insights-edit-modal.tsx` | Single-row edit/delete modal; GraphQL update/delete care or growth | yes — draft keep-and-finish for Edit |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-activity-log.ts` | `mergeActivityLogRows`, `ActivityLogRow` + `editTarget` | yes — row DTO / merge |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-activity-edit.ts` | Mutation routing + care validation / patch helpers | yes — pure helpers |
| `/Users/ptquang86/ws/my-apps/lib/baby-insights-list-visible.ts` | Visible window cap + show-more step (`BABY_INSIGHTS_LIST_VISIBLE_CAP`) | yes — “select visible window” = this slice |
| `/Users/ptquang86/ws/my-apps/components/baby-page-skeleton.tsx` | `BabyInsightsPageSkeleton` + view-only `BabyInsightsListSkeleton` (no checkbox/actions cols) | yes — must gain selectable chrome for CLS |
| `/Users/ptquang86/ws/my-apps/components/money-transactions-page.tsx` | Money Transactions page; wires selectable table + selectable skeleton | reference only — do not change |
| `/Users/ptquang86/ws/my-apps/components/analytics-transactions-table.tsx` | Checkbox column, header select-all **on current page**, `TableRow` `selected`, `TableRowActions` Edit, mobile cards, selection bar, single + bulk edit modals, multi-delete loop | **pattern source** — copy interaction shape, not Money columns |
| `/Users/ptquang86/ws/my-apps/components/transaction-selection-bar.tsx` | Portal fixed bottom toolbar: Edit / Delete / Clear; Money copy (“transactions”) | pattern — reuse shape; Baby needs Baby-labeled bar (shared generic or Baby fork) |
| `/Users/ptquang86/ws/my-apps/components/transaction-edit-modal.tsx` / `transaction-bulk-edit-modal.tsx` | Money single + multi edit | reference only |
| `/Users/ptquang86/ws/my-apps/components/ui/table.tsx` | `TableRow` `selected` / hover; `freeze="afterCheckbox"`; `TableRowActions` | yes — mandatory primitive |
| `/Users/ptquang86/ws/my-apps/components/ui/checkbox.tsx` | Shared checkbox (ariaLabel, indeterminate) | yes — no Baby-only checkbox |
| `/Users/ptquang86/ws/my-apps/components/money-analytics-skeleton.tsx` | `MoneyAnalyticsTransactionsTableSkeleton` with `selectable` | reuse pattern for Activity log skeleton columns |
| `/Users/ptquang86/ws/my-apps/docs/DESIGN_GUIDE.md` (§ Tables) | Flat table (no Card); sharp shell; freeze + checkbox; row actions; bulk bar only after selection; mobile `@md` cards | hard UI rules |
| `/Users/ptquang86/ws/my-apps/e2e/baby-care.spec.ts` | Activity log open/panel tests; edit/delete GraphQL awareness | extend for checkbox / Edit / selection bar |
| `/Users/ptquang86/ws/my-apps/.my-docs/workflow/baby-insights-table-style/` | Prior pass: Table chrome **without** checkbox/edit/bulk | context — this run adds what that pass excluded |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| GraphQL `updateBabyEvent` / `deleteBabyEvent` | `lib/graphql/baby-typeDefs.ts` + resolvers → `features/baby/server/care-events.ts` (`deleteBabyEvent`, update path). Input: `UpdateBabyEventInput` (`id`, `occurredAt`, `endedAt`, `payload`). |
| GraphQL `updateBabyGrowth` / `deleteBabyGrowth` | Same typeDefs/resolvers → `features/baby/server/growth.ts`. Input: `UpdateBabyGrowthInput`. |
| Client wiring | `baby-insights-edit-modal.tsx` already calls those four mutations via `babyGraphQLRequest` + `invalidateBabyQueries`. |
| `activityEditMutationFor` | Routes care vs growth update/delete — unit-tested in `lib/baby-insights-activity-edit.test.ts`. |
| No Baby bulk-delete mutation | Money multi-delete loops per-id client-side; Baby can do the same (care vs growth per row) — no new batch API required for parity shape. |
| Timeline / growth reads | Existing Insights queries feed Activity log merge; keep show-more (DOM window) + load-more (pagination). |
| Money delete / bulk edit APIs | Stay on Money side only — out of scope. |

## Hard constraints (do not fight)

1. **Activity log only** — do not restyle other Baby lists or change Money Transactions / Money defaults.
2. **Shared primitives** — `Table` / `Checkbox` / design tokens; tables stay sharp, flat (no Card around table); concentric `--radius-md` / `--radius-sm` on cards/chrome.
3. **Money parity = controls + chrome + interaction**, not Money Date / Category / Amount columns or analytics tags.
4. **Visible-window select-all** — Activity log “page” = `babyInsightsVisibleListRows` window (plus whatever is currently shown), not silent all-history across unloaded pages.
5. **Drop whole-row-open-edit** conflict — today desktop `TableRow clickable` + mobile card `button` open edit; Money separates checkbox vs Edit (`TableRowActions`).
6. **Skeleton parity mandatory** — checkbox + actions column (and mobile card controls) must land in `BabyInsightsPageSkeleton` / list skeleton in the same change (zero CLS).
7. **No hardcoded breakpoints** — keep `@container` / `@md:` like current Activity log and Money ledgers.
8. **Reuse existing single-row mutations** — prefer finish `BabyInsightsEditModal` + helpers; mixed multi-Edit is an open product pick (no Baby bulk-edit API today).
9. **i18n** — Baby EN/VI keys; do not hard-code Money English on Baby chrome.
10. **Prior non-goal flipped on purpose** — `baby-insights-table-style` excluded checkbox/edit/bulk; this run adds them on Activity log only.

## Risks if we ignore the repo

- Rebuilding a custom checkbox / selection bar that fights `TableRow` `data-selected` and DESIGN_GUIDE freeze/`TableRowActions` rules.
- Leaving whole-row click → double actions and broken checkbox UX.
- Skeleton without new columns → CLS on Insights load / expand.
- Assuming a Baby bulk-edit API exists (it does not) or cloning Money bulk-edit for mixed care+growth without a safe rule.
- Selecting across unloaded timeline/growth pages → surprise deletes.
- Touching Money files or other Baby lists and expanding scope past Gate A.

## Enough for UI concept / Analyze?

**yes** — Gate A ok; reference Money selectable table + Baby Activity log / edit modal / mutations / skeleton paths are concrete enough for lean UI concept and Analyze.

Open questions stay for Design (multi-select Edit rule; confirm multi-delete of mixed care+growth; treat draft modal as keep-and-finish vs replace) — not skim blockers.
