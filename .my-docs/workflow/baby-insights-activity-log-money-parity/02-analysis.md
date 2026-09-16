# Analysis: Baby Insights Activity log Money interaction parity

## What exists today

Baby Insights Activity log (`components/baby-insights-dashboard.tsx`) already merges care + growth into a shared sharp `Table` + `@md` mobile cards (Event + Recorded). Rows are **view-browse with whole-row click → `BabyInsightsEditModal`**. There is **no** checkbox column, no `TableRow` `selected`, no `TableRowActions`, and no bottom selection bar. Skeleton list chrome (`BabyInsightsListSkeleton`) is still view-only (no checkbox / actions placeholders). Money Transactions (`analytics-transactions-table.tsx` + `transaction-selection-bar.tsx`) is the interaction reference: visible-page select-all, selected chrome, row Edit (desktop), multi-delete via per-id client loop, selection-bar Edit → single modal or Money bulk-edit.

Draft keep-and-finish pieces already in tree: `BabyInsightsEditModal` (update/delete care or growth + invalidate), `lib/baby-insights-activity-log.ts` (`ActivityLogRow` + `editTarget`), `lib/baby-insights-activity-edit.ts` (mutation routing / care validation), and e2e coverage for row edit save paths. Selection / Money-parity chrome is **not** shipped yet.

## Dependencies

What else must change or stay compatible?

- **Must change:** Activity log table + mobile cards in `baby-insights-dashboard.tsx`; `BabyInsightsPageSkeleton` / list skeleton for selectable columns; Baby EN/VI strings for selection bar + aria labels; e2e for checkbox / Edit / selection bar (extend `e2e/baby-care.spec.ts`).
- **Must stay compatible:** Insights filters, charts, expand panel, show-more (`babyInsightsVisibleListRows`) + load-more pagination, merged newest-first rows, existing single-row GraphQL mutations (`updateBabyEvent` / `deleteBabyEvent` / `updateBabyGrowth` / `deleteBabyGrowth`).
- **Do not change:** Money Transactions UI/APIs; other Baby lists; Money columns (amount/category/account).
- **Likely new small surface:** Baby-labeled selection bar (fork or thin generic of `TransactionSelectionBar` — Money copy is hard-coded English today).

## Reference files (for Build)

| Path | Why it matters |
|------|----------------|
| `components/baby-insights-dashboard.tsx` | Primary surface: drop whole-row open-edit; add select + Edit + bar |
| `components/baby-insights-edit-modal.tsx` | Single-row edit/delete; keep-and-finish |
| `lib/baby-insights-activity-log.ts` | Row DTO; selection keys should use `source`+`id` (composite), not bare `id` |
| `lib/baby-insights-activity-edit.ts` | Care vs growth mutation routing |
| `lib/baby-insights-list-visible.ts` | Visible window = select-all scope |
| `components/baby-page-skeleton.tsx` | Skeleton parity for checkbox + actions |
| `components/analytics-transactions-table.tsx` | Interaction pattern source (do not change) |
| `components/transaction-selection-bar.tsx` | Portal fixed-bottom bar shape (Baby copy needed) |
| `components/ui/table.tsx` / `components/ui/checkbox.tsx` | Mandatory primitives (`selected`, `freeze`, `TableRowActions`) |
| `components/money-analytics-skeleton.tsx` | Selectable skeleton column pattern |
| `messages/baby/en.ts` / `vi.ts` | i18n for bar + select aria |
| `e2e/baby-care.spec.ts` | Extend Activity log interaction tests |
| `docs/DESIGN_GUIDE.md` (§ Tables) | Flat sharp table; bulk bar only after selection |
| `01b-ui-concept.md` + `ui-refs/` | Settled layout/IA — do not reinvent |

## Reusable patterns (prefer in Design)

| Pattern / name | Where it lives | Why Design should reuse it |
|----------------|----------------|----------------------------|
| Selectable ledger table | `analytics-transactions-table.tsx` | Checkbox + header select-all on current page + `TableRow selected` + `TableRowActions` Edit |
| Visible-window select-all | Money `pageIds` / Baby `activityListWindow.visible` | Matches Gate A; avoids all-history select |
| Selection bar portal | `transaction-selection-bar.tsx` | Fixed bottom + safe-area; appears only when `selectedCount > 0` |
| Multi-delete client loop | Money `Promise.allSettled` per id | No Baby bulk-delete API; route care vs growth per row via `editTarget` |
| Single-row edit modal | `baby-insights-edit-modal.tsx` | Already wired to Insights mutations + invalidate |
| Selectable skeleton | `MoneyAnalyticsTransactionsTableSkeleton` `selectable` | Checkbox + actions column placeholders without Money amount cols |
| Clear selection on filter change | Money clears on `filterQuery` / page change | Activity log should clear when Insights filters change or panel closes; keep ids still on screen when show-more grows the window |

## Constraints and risks

Hard constraints from skim (do not fight):

1. Activity log only; Money unchanged.
2. Shared `Table` / `Checkbox` / tokens; sharp flat table (no Card shell).
3. Parity = controls + chrome + interaction — not Money columns.
4. Select-all = visible Activity log window only.
5. Drop whole-row-open-edit (today’s `clickable` / card `button`).
6. Skeleton parity in the same change.
7. No hardcoded breakpoints (`@container` / `@md:`).
8. Prefer existing single-row mutations; no Baby bulk-edit API.
9. Baby EN/VI i18n (not Money “transactions” strings).
10. Prior `baby-insights-table-style` non-goal (no checkbox/edit) is intentionally flipped here.

**Risks:**

- **Selection key collision:** care and growth use separate id spaces; selection `Set` must key by composite (`source` + `id`), not bare UUID.
- **Multi-Edit trap:** Money opens bulk-edit for 2+; Baby has no bulk-edit API and mixed care+growth fields differ. Building a fake Money bulk-edit would overscope or mislead.
- **Money mobile gap vs 01b:** Money selectable **mobile cards have checkbox but no per-row Edit** (Edit via selection bar). Gate A2 / `01b` require **checkbox + Edit on Baby cards** — follow Baby concept, not Money’s mobile omission.
- **Checkbox vs row click:** leaving `clickable` + card-as-button will fight new controls.
- **CLS:** skeleton without new columns jumps on expand/load.
- **Bulk delete stakes:** need confirm + busy disable; partial failure messaging like Money.
- **Selection bar reuse:** `TransactionSelectionBar` hard-codes Money English — cannot drop onto Baby as-is without i18n/labels work.

## Settled decisions (do not relitigate)

From Gate A / skim / Gate A2 UI concept:

- Scope = **Activity log only**; Money is reference only.
- Layout/IA from `01b` + `ui-refs`: Event + Recorded (+ checkbox + actions); bottom bar when selected; Baby labels.
- Drop whole-row-open-edit; separate checkbox vs Edit.
- Select-all = **visible window** (`babyInsightsVisibleListRows` slice), not unloaded history.
- Keep-and-finish `BabyInsightsEditModal` + activity-log/edit helpers (not a new edit language).
- Empty = quiet, no fake checkboxes; selection bar only when `selectedCount > 0`.
- Skeleton gains checkbox + actions in the same change.
- **Concept preference for multi-Edit:** selection-bar Edit only when **exactly one** row selected (2+ → Delete / Clear). Design must lock this formally (see blocking / Design pick below).

## Blocking questions

**Clarity check:** Are the instructions and reference files clear enough to design?

**Verdict: yes — clear enough to design**, with Design locking the product picks below (defaults already pointed by `01b`). No Analyze blockers.

| # | Question | Suggested Design lock (default) | Blocks Analyze? |
|---|----------|----------------------------------|-----------------|
| 1 | Multi-select **Edit** when 2+ rows (mixed care+growth)? | **Edit only when exactly 1 selected**; hide/disable Edit for 2+ (matches `01b`; no Baby bulk-edit API) | no |
| 2 | Multi-select **Delete** of mixed care + growth? | **Yes** — confirm, then per-row delete loop (care vs growth via `editTarget`), busy + partial-fail message | no |
| 3 | Selection bar implementation? | Design Option: Baby-specific bar (copy `TransactionSelectionBar` shape + i18n) vs extract shared generic — prefer smallest change that keeps Money untouched | no |
| 4 | Mobile card Edit when Money omits it? | **Follow 01b** — always-visible Edit on Baby cards | no |

If the human rejects defaults #1–#2, Design must stop and re-ask before contracts/tasks.
