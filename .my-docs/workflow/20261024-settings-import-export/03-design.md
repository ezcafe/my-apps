# Design

**Result:** done

**clarity-check ok — design-update**

**Design present** only when Result **`done`** (file alone / `pending` never pays).

## Option A — Per-feature clone of Money patterns (recommended)

**What:** Ship Import/Export for all four features in one delivery by **mirroring Money’s proven stack** per feature: kind catalogs + CSV field defs, preview→confirm→commit for imports, thin `app/api/{feature}/…` routes, settings `import-export` category + child deep-links. Share only thin UI chrome (settings section, download control). Do **not** build a cross-feature import framework in v1.

**Example:**

```ts
// lib/baby-import-kinds.ts — parallel to lib/money-import-kinds.ts
export type BabyImportKind = "profile" | "care" | "growth" | "vaccines";

// app/api/money/export/[kind]/route.ts — GET only (no ?kind= alternate)
// app/api/baby/import/preview|commit|abandon + app/api/baby/export/[kind]
// Settings: MONEY_SETTINGS_CATEGORIES += { id: "import-export", … }
// Child /money/settings/accounts → Import → /money/import/accounts; Export → download
```

**Pros:**
- Reuses battle-tested Money + Investments statement flows.
- Clear feature boundaries (`docs/ADDING_A_FEATURE.md`).
- Faster path to locked v1 kinds without a shared abstraction tax.

**Cons:**
- Some duplicated preview-store / wizard glue across Baby/Loans.
- Later shared framework would need a deliberate extract.

## Option B — Shared cross-feature Import/Export framework first

**What:** First extract a generic kind registry, preview table, and wizard shell; plug Money/Baby/Loans/Investments into it; then add settings IA and exports.

**Example:**

```ts
// lib/feature-import/registry.ts
registerImportKind({ app: "baby", kind: "care", fields, serialize, commit });
// One wizard + one preview table for all apps
```

**Pros:**
- One UX/API shape long-term; less duplication after migrate.

**Cons:**
- Blocks ship on a large refactor of working Money import.
- Higher risk in one Mode-full delivery; Grill locked product kinds, not a platform rewrite.

## Recommendation

**Pick Option A.** Grill locked kinds, CSV, merge policy, hub+child IA, and one four-feature ship — not a shared platform. Clone Money patterns; keep Investments statement import as-is; add exports and Baby/Loans CSV import beside them.

## Chosen design (Option A)

### Locked product rules (from Grill)

| Rule | v1 |
|------|-----|
| Kinds | Money 8 + export; Baby care/growth/vaccines/profile (excl. telegram + quick-care); Loans loans+installments+pay status (excl. push); Investments statement import + export instruments/journal (excl. quotes); **no** new non-statement Investment import |
| Format | CSV (+ existing Investment statement formats); **no** JSON archive; **Export all** = ZIP of those CSVs (not a JSON archive) |
| Merge | append/create + preview+confirm; upsert **only** with stable natural key; **never** silent full replace |
| IA | Import/Export hub category per feature; Money entity children (+ peers with entity pages) deep-link same wizard/export; **Export all / Import all** top row on hubs only (not on children) |
| Phasing | One delivery covering all four features |
| Export all | ZIP of per-kind CSVs; single-kind CSV downloads unchanged; Investments ZIP = `instruments.csv` + `trade-journal.csv` |
| Export-all caps | Same per-kind row/byte caps; any kind over → whole request `413` `export_too_large`; **no** partial ZIP |
| Import all | ZIP → multi-kind preview → ordered commit; missing file = skip+warn; unknown filename = reject; per-kind wizards stay |
| Import-all order | Money: accounts→categories→merchants→tags→budgets→rules→recurrence→transactions; Baby: profile→care→growth→vaccines; Loans: loans→installments; Investments Import all = **statement wizard only** |
| Import-all fail | Stop on first hard-fail; earlier kinds stay committed; report failed kind |

### Natural keys (upsert vs append)

| Kind | Policy |
|------|--------|
| Money kinds | Keep existing Money commit behavior; export columns align to `moneyImportFieldDefs` for round-trip |
| Baby `profile` | Upsert — `baby_profile_workspace_uq` (one profile per workspace) |
| Baby care / growth / vaccines | Append/create only (no stable natural key for event rows) |
| Loans `loans` | Append/create (loan `name` is not unique) |
| Loans installments (+ status) | Upsert when parent loan resolved **and** `(loanId, installmentNumber)` matches existing unique index; else create under imported/linked loan |
| Investments | Statement import unchanged; instruments/journal **export only** in v1 |

### Architecture pieces

#### 1. Settings IA (all four features)

- Add category id `import-export` to `MONEY_SETTINGS_*`, `BABY_SETTINGS_*`, `LOANS_SETTINGS_*`, `INVESTMENT_SETTINGS_*` in `components/settings/settings-types.ts`.
- Hub section: **top actions row** — **Export all** + **Import all** — then per-kind Import / Export actions (labels from kind catalogs).
- Money children (`accounts|categories|merchants|tags|budgets|rules|recurrence` + transactions entry if present): Import + Export buttons deep-linking `/money/import/[kind]` and export download for that kind. **No** Export all / Import all on children.
- Investments: hub **Export all** → ZIP; hub **Import all** → `/investments/import` (statement wizard only); per-kind Export for instruments / trade journal; keep legacy redirect behavior.
- Baby / Loans: hub Export all / Import all + per-kind list; hub-only unless entity child settings pages appear later.
- Core `/settings` unchanged. Skeleton / `loading.tsx` parity same change (`docs/DESIGN_GUIDE.md`).

#### 2. Money — export + hub over existing import

- Keep `MoneyCsvImportWizard` + `POST /api/money/import/*`.
- **Export path (locked):** `GET /api/money/export/[kind]` only. **No** `?kind=` (or other query-kind) alternate — one public shape (Hyrum). Peer features use the same `[kind]` path form where they have a kind catalog.
- **Investments asymmetry (intentional):** fixed paths `GET /api/investment/export/instruments` and `GET /api/investment/export/trade-journal` only (two kinds; no `[kind]` catalog). Do not invent Investment `[kind]` in Build.
- Auth: session or Bearer with **read** scope; workspace-scoped Drizzle select → CSV with columns aligned to import field defs.
- **Large export (locked — Money `transactions` and any peer export that can grow large):**
  - **Buffered CSV only** in v1 (build full body, then respond). **No streaming** (no chunked/stream response contract).
  - Hard max **rows** and **bytes** (env-tunable; suggested defaults: `MONEY_EXPORT_MAX_ROWS=100000`, `MONEY_EXPORT_MAX_BYTES=5242880` / 5 MiB — same idea for Baby/Loans/Investment export helpers).
  - If either cap would be exceeded → **`413`** with stable `{ error, code: "export_too_large" }` (and a clear message). Do not return a partial CSV.
  - Query layer must bound the read (LIMIT / early abort) so export never does an unbounded full-table dump into memory.
- UI: download next to Import on hub + children.
- **Export all (locked):** `GET /api/money/export/all` only (path param `all`, not a query). Returns `application/zip` of `{kind}.csv` for all Money kinds in catalog order. Reuse per-kind serializers; apply per-kind row/byte caps; if any kind would exceed → `413` `export_too_large` (no partial ZIP). Optional ZIP-byte ceiling env-tunable. Do **not** add a second public Export-all path.
- **Import all (locked):** `POST /api/money/import/all/preview` (ZIP multipart or base64 body — match existing Money preview body style where practical) stashes multi-kind preview; `POST /api/money/import/all/commit` commits in order accounts→categories→merchants→tags→budgets→rules→recurrence→transactions; optional `Idempotency-Key` same as single commit. Missing kind file → skip + warn in preview; unknown filename → reject preview. On commit hard-fail → stop; earlier kinds stay; response names failed kind.

#### 3. Baby — kind catalog + import/export

- `lib/baby-import-kinds.ts` (+ serializers/parsers); kinds: `profile`, `care`, `growth`, `vaccines`.
- Preview table `baby_import_preview` (see Database contracts) + `POST /api/baby/import/preview|commit|abandon`; `GET /api/baby/export/[kind]` only (no query-kind).
- Commit: profile upsert; other kinds append; never export telegram link secrets or quick-care rows.
- **Idempotency (locked):** `POST /api/baby/import/commit` honours optional `Idempotency-Key` with the **same** claim / replay / conflict rules as `POST /api/money/import/commit` (`lib/http-idempotency`: validate body before claim; replay → stored JSON + `Idempotency-Replayed: true`; `409` + `idempotency_in_progress` / `idempotency_body_mismatch`; key > 128 → `400`; **absent key = unsafe to retry**). Document new routes on the ARCHITECTURE Idempotency-Key table and in `docs/API.md`.
- Auth: existing Baby workspace membership / Bearer grant patterns.
- **Export all / Import all:** same ZIP + multi-kind preview/commit pattern as Money under `/api/baby/export/all` and `/api/baby/import/all/{preview|commit}`; order profile→care→growth→vaccines; Idempotency-Key on all-commit.

#### 4. Loans — kind catalog + import/export

- Kinds: `loans`, `installments` (installment rows include pay status fields as needed).
- Same preview→commit + export routes under `app/api/loans/…` (`GET /api/loans/export/[kind]` only).
- Exclude `loan_push_subscription` from all dumps.
- FK to Money accounts/categories/transactions: resolve by name/id when columns present; leave null when unresolved (document in preview errors) — do not invent Money rows from Loans import.
- **Idempotency (locked):** `POST /api/loans/import/commit` same optional `Idempotency-Key` contract as Money/Baby commit (above). Document in ARCHITECTURE + `docs/API.md`.
- **Commit sequence (locked — one RLS callback):** inside a single `withLoansWorkspaceRls` (or equivalent) callback, in order:
  1. Resolve or create parent `loan` as required by kind/rows.
  2. Upsert `loan_schedule_installment` by unique `(loanId, installmentNumber)` (`loan_schedule_installment_loan_num_uq`).
  3. Upsert/create matching `loan_installment_status` row(s).
  4. Delete the import preview row on success.
  - Prune expired previews **outside** this callback (`withBypassRls`), same as Money commit (no nested `db.transaction` under the outer RLS callback).
  - Mirror Baby: multi-row domain writes + preview delete in **one** feature RLS callback; prune outside.
- **Export all / Import all:** ZIP + multi-kind preview/commit under `/api/loans/export/all` and `/api/loans/import/all/{preview|commit}`; order loans→installments; Idempotency-Key on all-commit.

#### 5. Investments — settings entry + export

- Settings Import/Export category: statement Import → existing wizard; Export instruments + trade journal CSV; hub **Export all** + **Import all**.
- `GET /api/investment/export/instruments` and `…/trade-journal` (read scope) — fixed paths only.
- **Export all (locked):** `GET /api/investment/export/all` → ZIP of `instruments.csv` + `trade-journal.csv`; same per-kind caps → whole `413` if over.
- **Import all (locked):** **UI only** deep-link to `/investments/import` (statement wizard). **No** ZIP import of instruments/journal; **no** new CSV/JSON import for those kinds in v1.
- Same buffered + max rows/bytes → `413` / `export_too_large` rule if a dump can exceed caps.
- **Do not** export `investment_quote` / `investment_quote_daily`.
- **Do not** add CSV/JSON import for instruments/journal in v1.

#### 6. Safety, auth, docs, tests

- Import always preview → confirm → commit; abandon cleans preview.
- Export: read-scoped; denylist secrets (telegram, push endpoints, quote cache).
- Document routes in `docs/API.md` / OpenAPI when landed — including export GETs, Baby/Loans import trio, Idempotency-Key on Baby/Loans commit, and `export_too_large`.
- Extend `docs/ARCHITECTURE.md` Idempotency-Key routes list + housekeeping cron step for new preview tables; note prune in `docs/PERFORMANCE.md` beside Money preview.
- Unit: parsers/serializers, merge policy, auth/workspace denial, export-too-large, Baby/Loans Idempotency-Key claim/replay/409; e2e: settings section visible per feature + one import or export smoke per feature where feasible.

### Database contracts

Additive migrations only. Feature-scoped tables (not one shared preview table) for RLS clarity.

**Import-all preview payload:** Prefer **reuse** existing `*_import_preview` tables with `rows` jsonb shaped as `{ kinds: { [kind]: row[] }, warnings?: … }` (or equivalent multi-kind envelope). **Do not** require a new preview table solely for Import all unless Isolated DB review finds a hard conflict with single-kind preview shape — then additive column/envelope only, same RLS/TTL/housekeeping.

#### `baby_import_preview` (mirror `money_import_preview` — `0015` + RLS `0034`)

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | `uuid` PK | NOT NULL | `gen_random_uuid()` default |
| `user_sub` | `text` | NOT NULL | Stashing actor |
| `workspace_id` | `uuid` | NOT NULL | FK → `workspace(id)` **ON DELETE CASCADE** |
| `rows` | `jsonb` | NOT NULL | Short-lived preview payload |
| `expires_at` | `timestamptz` | NOT NULL | TTL (~1h, same constants as Money store) |
| `created_at` | `timestamptz` | NOT NULL | `now()` default |

**Indexes:** `baby_import_preview_expires_idx` on `(expires_at)`; `baby_import_preview_user_workspace_idx` on `(user_sub, workspace_id)`.

**RLS:** `ENABLE` + `FORCE ROW LEVEL SECURITY`; policy `baby_import_preview_workspace_rls` — `USING` / `WITH CHECK` (`workspace_id = app_current_workspace_id()`), same shape as Money `0034`.

**Owners:**
- **Write:** Baby import preview / commit / abandon path (stash, delete on commit or abandon).
- **Read:** Baby import commit path only (load by id under workspace RLS).
- **Prune:** housekeeping + best-effort prune via `withBypassRls` **outside** commit RLS (never nested under commit callback).

#### `loans_import_preview` (same shape)

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | `uuid` PK | NOT NULL | `gen_random_uuid()` default |
| `user_sub` | `text` | NOT NULL | |
| `workspace_id` | `uuid` | NOT NULL | FK → `workspace(id)` **ON DELETE CASCADE** |
| `rows` | `jsonb` | NOT NULL | |
| `expires_at` | `timestamptz` | NOT NULL | |
| `created_at` | `timestamptz` | NOT NULL | `now()` default |

**Indexes:** `loans_import_preview_expires_idx` on `(expires_at)`; `loans_import_preview_user_workspace_idx` on `(user_sub, workspace_id)`.

**RLS:** `ENABLE` + `FORCE`; policy `loans_import_preview_workspace_rls` — `workspace_id = app_current_workspace_id()`.

**Owners:** Loans import preview / commit / abandon (write); commit path (read); housekeeping / bypass prune outside commit (same as Money + Baby).

#### Housekeeping (locked)

- Extend `lib/db-housekeeping.ts` / `POST /api/cron/db-housekeeping` to prune expired rows from **both** `baby_import_preview` and `loans_import_preview` (parallel helpers or shared pattern with `pruneExpiredImportPreviews`).
- Document beside Money in `docs/ARCHITECTURE.md` (cron step list) and `docs/PERFORMANCE.md`.
- Same `withBypassRls` prune-outside-commit pattern as Money — never prune inside the commit RLS callback.

#### Domain writes (no new entity tables)

- Import writes existing Baby / Loans domain tables only.
- Loans installment amounts stay **bigint** (`*_minor`); no `SUM(…)::int`.

### Non-goals

- JSON archive / whole-app (cross-feature) backup.
- Foods settings; core `/settings` dump.
- Shared cross-feature import framework (Option B).
- New Investments non-statement / instruments/journal CSV import (Import all = statement wizard only).
- Silent replace / full wipe on import.
- Streaming CSV/ZIP export in v1.
- Query-string kind alternate for Money/Baby/Loans export.
- Partial ZIP on export-too-large; full cross-kind rollback on Import-all mid-fail.

### Hot files

- `components/settings/settings-types.ts`, feature settings pages + skeletons (+ Export all / Import all hub row)
- `lib/money-import-kinds.ts`, new `lib/{baby,loans}-import-*`, Money/Investment export serializers + ZIP helpers
- `app/api/money/export/[kind]/**` + `export/all`, `app/api/{money,baby,loans}/import/all/**`, `app/api/baby|loans/import|export/**`, `app/api/investment/export/**` + `export/all`
- `db/schema/*` + migrations for `baby_import_preview` / `loans_import_preview` (+ RLS like Money `0034`); multi-kind preview envelope in existing preview tables
- `lib/db-housekeeping.ts`, `lib/http-idempotency` callers on Baby/Loans (+ all-commit)
- `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`, unit + e2e tests

### API / DB impact

- **API:** Per-kind export GETs + **`GET …/export/all` ZIP**; Baby/Loans (+ Money) **import/all preview|commit**; Investments Export all ZIP only; Investments Import all = UI→statement; Idempotency-Key on all-commits; buffered + `export_too_large`.
- **DB:** Existing/new preview tables hold multi-kind envelope for Import all (prefer no extra table). Domain writes unchanged.
- **Auth/PII:** Session + Bearer with correct app grant; export omit secrets; workspace isolation mandatory.

## Proposed Has (parent applies to card)

Stage records proposed values only — parent writes card Has via Always §4.

## Has API / DB (proposed)

- **Has UI:** yes  
- **Has API:** yes  
- **Has DB:** yes (new Baby/Loans preview tables + migrations)  
- **Has auth/PII/schema:** yes  

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes` (no flip vs card)
