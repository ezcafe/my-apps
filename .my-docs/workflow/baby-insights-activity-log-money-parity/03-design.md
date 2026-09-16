# Design: Baby Insights Activity log Money interaction parity

**Has UI:** yes  
**ADR:** N/A — UI interaction parity on one surface; reuses existing GraphQL mutations; no new schema, framework, or public API architecture.

## Locked product picks (from Analyze + parent)

Do not reopen unless Gate B rejects them:

1. **Multi-Edit:** Selection-bar **Edit** only when **exactly 1** row is selected; with `selectedCount !== 1`, bar Edit stays **visible but disabled** (matches Gate A2 `ui-refs/02`) — Delete + Clear remain when count ≥ 1.
2. **Multi-Delete:** **Yes** for mixed care + growth — `window.confirm` with Baby EN/VI copy, then per-row client delete loop (`deleteBabyEvent` / `deleteBabyGrowth` via `editTarget`), busy disable. After `Promise.allSettled`: drop succeeded keys; **keep failed keys** if still on screen; show one failure via **`Alert`** in the Activity log panel (intentional vs Money’s clear-all-then-`Alert`).
3. Scope = **Activity log only**; Money Transactions is reference only (do not change Money).
4. Layout/IA from Gate A2 / `01b` + `ui-refs/` — Event + Recorded (+ checkbox + actions); bottom bar when selected; Baby labels.
5. Drop whole-row-open-edit; separate checkbox vs Edit.
6. Select-all = **visible window** only (`babyInsightsVisibleListRows` slice), not unloaded history.
7. Keep-and-finish `BabyInsightsEditModal` + activity-log / activity-edit helpers.
8. Selection keys = composite `source` + `id` (care and growth id spaces collide if bare UUID).
9. Mobile cards: checkbox + selected feel + **always-visible Edit** (follow `01b`, not Money’s mobile Edit omission).
10. Skeleton gains checkbox + actions in the **same** change as live selectable chrome; empty = quiet (no fake checkboxes); bar only when `selectedCount > 0`.
11. Baby EN/VI i18n for bar + aria — not Money “transactions” hard-coded English.
12. **Selection retention:** Select-all = visible window only. **Keep** selection when show-more / load-more grows the list. **Clear** only on Insights filter apply, panel close, bar Clear, or after deletes as in pick #2 (drop succeeded; keep failed if still present).

---

## Decision 1 — How we ship selection chrome + selection bar

### Option 1 — In-dashboard selectable wiring + Baby selection bar fork

**What it is:**  
Keep selection state and table/card chrome inside `BabyInsightsDashboard` (same ownership as today’s Activity log). Copy Money’s interaction shape from `analytics-transactions-table.tsx` (checkbox column, header select-all on visible window, `TableRow` `selected`, `TableRowActions` Edit, mobile cards). Add a **Baby-labeled** selection bar that mirrors `TransactionSelectionBar` (portal, fixed bottom, safe-area) but takes i18n labels / count copy — **do not** change Money’s bar. Wire Edit → existing `BabyInsightsEditModal` when exactly one row is selected (bar Edit **disabled**, still visible, when count ≠ 1). Delete (any `selectedCount >= 1`) → `window.confirm` then per-row mutation loop; partial fail keeps failed keys + panel `Alert`.

**Example:**  
Caregiver opens Activity log → checks two rows (care + growth) → bar shows “2 activities selected” with Edit **disabled** (visible), Delete + Clear enabled → `window.confirm` Delete → client runs `deleteBabyEvent` / `deleteBabyGrowth` per `editTarget` with `Promise.allSettled` → invalidate Insights queries → drop succeeded keys; keep failed keys if still visible + show panel `Alert` if any rejected. One selected row → Edit opens the same modal as the row Edit button; Delete also works for a single selection.

**Pros:**

- Smallest ship path; Money files stay untouched.
- Matches how Money keeps selection in the table page component.
- Easy to keep skeleton parity next to the live Activity log markup.

**Cons:**

- `baby-insights-dashboard.tsx` grows with selection + delete loop.
- Two selection-bar components (Money + Baby) until a later extract.

### Option 2 — Shared generic selection bar (+ optional Activity log table extract)

**What it is:**  
First extract a shared `SelectionBar` (or prop-driven generic) used by Money and Baby, then optionally extract `BabyInsightsActivityLogTable` so the dashboard only passes rows + callbacks. Same product locks (#1–#12). Refactor Money to consume the shared bar in the same pass or immediately after.

**Example:**  
`components/selection-bar.tsx` accepts `selectedCount`, `busy`, `labels`, `editDisabled`, `onEdit` / `onDelete` / `onClear`. Money’s `TransactionSelectionBar` becomes a thin wrapper or is deleted; Baby imports the generic with Baby message keys. Dashboard or a new `baby-insights-activity-log-table.tsx` owns checkboxes.

**Pros:**

- One bar primitive; Money English hard-code goes away.
- Cleaner dashboard if the table is extracted; easier unit tests on presentational pieces.

**Cons:**

- Touches Money Transactions UI (out of Gate A non-goals / skim “do not change Money”).
- More files, prop contracts, and regression risk for a Baby-only outcome.
- Longer Build for the same caregiver result.

## Tradeoffs

| Factor | Option 1 | Option 2 |
|--------|----------|----------|
| Cost / time | Lower — Baby-only files + helpers | Higher — shared extract + Money touch |
| Complexity | Selection lives in dashboard | Shared API + optional table extract |
| Usability | Same caregiver outcome | Same caregiver outcome |
| Failure cases | Duplicate bar markup drift later | Money regression; scope creep past Activity log |

## Recommendation

**Pick Option 1.**

Gates and analysis lock Activity log only and “Money unchanged.” A Baby bar fork + in-dashboard wiring delivers Money **interaction** parity without a Money refactor. Extract a shared bar later if a third surface needs it.

## Chosen design (user-approved)

**Option 1** — In-dashboard selectable Activity log + Baby selection bar fork; Money files untouched. Locked: Edit only when exactly 1 row selected (bar Edit disabled but visible otherwise); mixed multi-Delete via `window.confirm` + per-row client loop; partial fail keeps failed keys + panel `Alert`; skeleton same slice as selectable chrome.

---

## Patterns to reuse

| Pattern | Why it fits | Reference |
|---------|-------------|-----------|
| Selectable ledger table | Checkbox + visible-page select-all + `TableRow selected` + `TableRowActions` | `components/analytics-transactions-table.tsx` |
| Shared table / checkbox primitives | DESIGN_GUIDE; freeze after checkbox; no Baby-only checkbox | `components/ui/table.tsx`, `components/ui/checkbox.tsx` |
| Visible-window select-all | Avoids all-history surprise select | Money `pageIds`; Baby `activityListWindow.visible` / `babyInsightsVisibleListRows` |
| Selection bar portal | Fixed bottom + safe-area; only when `selectedCount > 0` | `components/transaction-selection-bar.tsx` (shape only) |
| Multi-delete client loop | No Baby bulk-delete API | Money `Promise.allSettled` per id; route via `activityEditMutationFor` / `editTarget` |
| Single-row edit modal | Keep-and-finish; already invalidates | `components/baby-insights-edit-modal.tsx` |
| Mutation routing helpers | Pure care vs growth routing | `lib/baby-insights-activity-edit.ts` |
| Activity log row DTO | Composite `editTarget`; merge newest-first | `lib/baby-insights-activity-log.ts` |
| Selectable skeleton columns | Zero CLS | `MoneyAnalyticsTransactionsTableSkeleton` `selectable` pattern → `baby-page-skeleton.tsx` |
| Clear selection on filter / panel / Clear | Avoid stale acts after context change | Money clears on filter/page; Baby **keeps** selection on show-more / load-more; **clears** on Insights filter apply, panel close, bar Clear; after delete drop succeeded / keep failed |
| Destructive confirm | High-stakes delete without new ConfirmDialog UI | Money / repo: `window.confirm` + i18n strings (`analytics-transactions-table.tsx`) |
| Partial-fail message | One clear failure after multi-delete | Existing `Alert` in Activity log panel (`components/ui/alert`); keep failed selection keys (intentional vs Money clear-all) |

---

## Sequence diagram (recommended Option 1)

Select → Edit (exactly 1) or Delete (`selectedCount >= 1`) → existing GraphQL → workspace-scoped DB → refresh. Clear leaves selection empty with no server call.

```mermaid
sequenceDiagram
  participant User as Caregiver
  participant UI as BabyInsightsDashboard
  participant Bar as BabyActivitySelectionBar
  participant Modal as BabyInsightsEditModal
  participant GQL as BabyGraphQL
  participant Auth as requireBabyWorkspace
  participant Svc as careEventsOrGrowth
  participant DB as Postgres

  User->>UI: open Activity log expand
  UI->>UI: render visible window rows
  User->>UI: checkbox select row(s)
  UI->>Bar: selectedCount > 0
  alt Clear
    User->>Bar: Clear
    Bar->>UI: empty selection Set
  else exactly 1 selected — Edit
    User->>Bar: Edit (or row Edit)
    Bar->>Modal: open editTarget
    User->>Modal: Save
    Modal->>GQL: updateBabyEvent or updateBabyGrowth
    GQL->>Auth: workspace + session
    alt auth / NOT_FOUND / validation fail
      Auth-->>Modal: error
      Modal->>UI: message + busy off
    else ok
      Auth->>Svc: update by id + workspaceId
      Svc->>DB: UPDATE ... WHERE id AND workspaceId
      DB-->>Svc: row
      Svc-->>Modal: ok
      Modal->>UI: invalidateBabyQueries + clear selection
    end
  else selectedCount >= 1 — Delete
    User->>Bar: Delete
    UI->>UI: window.confirm (Baby i18n)
    alt user cancels confirm
      UI->>UI: no-op (busy stays off)
    else user confirms
      UI->>UI: busy on
      loop each selected editTarget
        UI->>GQL: deleteBabyEvent or deleteBabyGrowth
        GQL->>Auth: workspace + session
        alt auth / NOT_FOUND fail
          Auth-->>UI: rejected settle
        else ok
          Auth->>Svc: delete by id + workspaceId
          Svc->>DB: DELETE/RETURNING WHERE id AND workspaceId
          DB-->>Svc: row
          Svc-->>UI: fulfilled settle
        end
      end
      alt any rejected
        UI->>UI: drop succeeded keys; keep failed keys if still visible
        UI->>UI: Alert in Activity log panel + busy off
        UI->>UI: invalidateBabyQueries
      else all fulfilled
        UI->>UI: clear removed keys + busy off
        UI->>UI: invalidateBabyQueries
      end
    end
  end
```

**Failure notes:** Auth/workspace miss or NOT_FOUND → GraphQL reject (no new error codes); UI shows message, busy cleared. Partial multi-delete: drop succeeded selection keys; **keep failed keys** if still on screen; one failure via **`Alert`** in the Activity log panel (`components/ui/alert`) — intentional vs Money’s clear-all-then-error. Cancelled `window.confirm` = no mutations.

---

## Contracts

### API contracts

**No new GraphQL operations.** Reuse existing mutations. Client must pick the right one per row.

| Item | Detail |
|------|--------|
| Method + path (or name) | GraphQL `updateBabyEvent` / `deleteBabyEvent` / `updateBabyGrowth` / `deleteBabyGrowth` (unchanged) |
| Auth / who can call | Session + `requireBabyWorkspace` (existing); every write scoped to workspace |
| Request fields | Care update: `UpdateBabyEventInput` (`id`, `occurredAt?`, `endedAt?`, `payload?`). Care delete: `id`. Growth update: `UpdateBabyGrowthInput`. Growth delete: `id`. |
| Success response | Existing `BabyCareEvent!` / `BabyGrowthEntry!` |
| Errors | Existing validation / NOT_FOUND / auth — no new public error shape this pass |
| Downstream calls | Resolvers → `features/baby/server/care-events.ts` / `growth.ts` → Drizzle |

**Client-only contracts (new pure helpers — recommended):**

| Helper | Input | Output | Notes |
|--------|-------|--------|-------|
| `activityLogSelectionKey(row)` | `{ source, id }` | string e.g. `care:<uuid>` / `growth:<uuid>` | Stable Set key; unit-tested |
| `parseActivityLogSelectionKey(key)` | string | `ActivityEditTarget` or null | For delete loop |
| `activitySelectionBarEditEnabled(count)` | number | boolean | `count === 1` |
| Multi-delete runner (UI or thin helper) | list of `ActivityEditTarget` | `PromiseSettledResult[]` | Calls existing mutations; no batch API; UI maps settle → drop succeeded keys, keep failed if still visible, one panel `Alert` |

**Events / other module APIs:** none.

### Database contracts

**No schema changes.**

| Table / collection | Purpose | Key fields | Indexes / uniques | Write owner | Read owners |
|--------------------|---------|------------|-------------------|-------------|-------------|
| `baby_care_event` (existing) | Care rows deleted/updated via Activity log | `id`, `workspace_id`, … | existing | care-events service | Insights timeline / Activity log |
| `baby_growth_entry` (existing) | Growth rows deleted/updated via Activity log | `id`, `workspace_id`, … | existing | growth service | Insights growth / Activity log |

**Data ownership notes:**

- Deletes/updates always filter by **workspace id** (existing). Client composite keys do not replace server authz.
- No new indexes for this pass.

### Example queries

Happy-path writes (same as today; placeholders).

```sql
-- Example 1: delete one care event in workspace
-- DELETE FROM baby_care_event
-- WHERE id = $eventId::uuid AND workspace_id = $workspaceId::uuid
-- RETURNING *;
```

```sql
-- Example 2: delete one growth entry in workspace
-- DELETE FROM baby_growth_entry
-- WHERE id = $entryId::uuid AND workspace_id = $workspaceId::uuid
-- RETURNING *;
```

```sql
-- Example 3: update care occurred_at (illustrative; real path uses service + validated patch)
-- UPDATE baby_care_event
-- SET occurred_at = $occurredAt, updated_at = now(), updated_by_user_sub = $userSub
-- WHERE id = $eventId::uuid AND workspace_id = $workspaceId::uuid
-- RETURNING *;
```

---

## UI / UX / mobile

- **UI concept (01b):** Follow `01b-ui-concept.md` + Gate A2 `ui-refs/` — do not invent a conflicting layout. Baby columns stay Event + Recorded (+ checkbox + actions). Bar Edit **disabled** (visible) when 2+ selected matches `ui-refs/02`.
- **80/20 (aligned, not re-argued):**
  - **#1 always visible:** Activity log rows (what + when) once panel is open.
  - **#2 always visible:** Leading checkbox + per-row Edit (desktop + mobile cards).
  - Secondary: full fields in edit modal; multi-select Edit (**disabled**, still visible, when count ≠ 1); filters; Clear; panel expand.
- **Layout / hierarchy:** Expand panel → table/cards → show-more / load-more → selection bar (portal) when selected.
- **Selection retention:** Select-all = visible window only. **Keep** selection when show-more / load-more grows the list. **Clear** only on Insights filter apply, panel close, bar Clear, or after deletes (drop succeeded; keep failed if still present).
- **Delete confirm:** **`window.confirm`** with Baby EN/VI strings (Money / `analytics-transactions-table.tsx` shape). Do **not** add a new ConfirmDialog this pass.
- **Partial-delete UX:** After `Promise.allSettled`, drop succeeded keys; keep failed keys if still on screen; show one failure with existing **`Alert`** in the Activity log panel (`components/ui/alert`). This **differs from Money** (Money clears all selection then shows `Alert`) — intentional for Baby so the caregiver can retry failed rows.
- **Loading / empty / error / success:** Loading = selectable skeleton. Empty = muted copy, no fake checkboxes/bar. Error = existing panel error line + delete partial-fail `Alert`. Success = invalidate + refresh; clear or prune selection per retention rules.
- **Skeleton parity (zero CLS):** Leading `w-10` checkbox placeholder → event → recorded → actions; mobile card placeholders for checkbox + Edit. Same order as live; same change/slice as live selectable chrome.
- **Mobile:** `@container` / `@md:` cards; checkbox + Edit ≥44px (`fx-hit-40` / `iconOnly` as Money/primitives do); selected wash + checked box; bar above safe-area inset.
- **Accessibility:** Per-row checkbox `aria-label`; toolbar `aria-label` (Baby); bar Edit **disabled** (visible) when count ≠ 1 so screen readers still find it; do not rely on color alone for selected.
- **Day-to-day:** Select → act matches Money habit; mixed multi-Edit does not pretend to be a bulk form; bulk delete stays high-stakes (`window.confirm` + busy).

**i18n (new keys — examples):** selection count singular/plural, bar Edit/Delete/Clear, toolbar aria, select-all / row select aria, bulk delete `window.confirm` copy / partial-fail `Alert` text. EN + VI in `messages/baby/*`.

---

## Security design review (OWASP)

**Trust boundaries:**

- Browser UI (selection Set is client-only UX state — not authz).
- GraphQL HTTP edge: session + Baby workspace cookie/context.
- Server services: every delete/update must keep `workspaceId` in the WHERE clause (already true).

**Abuse cases:**

- Delete another workspace’s id by guessing UUID → must fail NOT_FOUND / no row (existing scoping).
- Select many visible rows and spam Delete → `window.confirm` + busy; still N client mutations (acceptable Money parity; no new rate limit this pass unless existing GraphQL limits apply).
- Fake “bulk edit” that patches wrong source → prevented by Edit-only-when-1 + `editTarget` routing.
- XSS via notes/summary in cells → React text escaping; no `dangerouslySetInnerHTML`.

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 Broken Access Control | pass | Reuse workspace-scoped mutations; selection Set is not authorization |
| A02 Cryptographic Failures | N/A | No new secrets, tokens, or sensitive storage |
| A03 Injection | pass | Existing parameterized ORM/GraphQL; no raw SQL from selection keys |
| A04 Insecure Design | pass | Multi-Edit limited to 1 (Edit disabled, visible); multi-Delete uses `window.confirm` + busy; no silent all-history select |
| A05 Security Misconfiguration | N/A | No CORS/header/debug changes |
| A06 Vulnerable Components | pass | No new dependencies planned |
| A07 Auth Failures | pass | Existing session + `requireBabyWorkspace` on mutations |
| A08 Software / Data Integrity | pass | No webhooks/deserializers; client loops call typed mutations |
| A09 Logging / Monitoring Failures | pass | Do not log full payloads/secrets; rely on existing error surfacing to user |
| A10 SSRF | N/A | No server fetch of user URLs |

Source: https://owasp.org/Top10/

---

## Challenges answered

- **Do we need this?** Yes for caregivers who already use Money select → act; Gate A and Gate A2 approved the gap. View-only table chrome alone left interaction incomplete.
- **What fails?** Checkbox vs whole-row click if we leave `clickable`; bare UUID selection collisions; skeleton CLS; mixed multi-Edit without an API; accidental bulk delete without `window.confirm`; selecting unloaded history; inventing a ConfirmDialog instead of Money’s `window.confirm`.
- **Is this overspecified?** Option 1 stays thin: no new GraphQL, no Money refactor, no bulk-edit modal, no new ConfirmDialog. Option 2 would overspecify for this pass.
- **Why not Money bulk-edit?** No Baby bulk-edit API; care vs growth fields differ; Gate A preferred Edit only for one selection.
- **Why client delete loop?** Matches Money; avoids inventing a batch delete API for parity shape alone.
- **Why keep failed selection keys?** Caregiver can retry failed rows; differs from Money clear-all by design (locked in pick #2).
