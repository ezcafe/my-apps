# Analysis: Settings import / export

**Result:** done  
**Size:** Prefer bullets. ≤5 solution pieces.  
**Updated:** 2026-10-24

## Deep dive

### Overall

#### What is this?
Add a clear **Import / Export** area on each in-scope **feature settings** surface (Money, Baby, Loans, Investments) — including nested settings children that own data — so users can move that feature’s matching entity types in and out of the **current workspace**.

#### Why do we need this?
Money already imports many ledger entities via CSV wizard; Investments imports broker statements. Baby and Loans have settings but no import/export. There is **no** general export download path today. Users need a symmetric, discoverable way to back up and restore feature data without a global app dump.

#### How to do this?
Reuse Money’s preview → map → commit import pattern and Investments’ statement preview/commit where they fit. Add **export** APIs + UI downloads per feature/kind. Extend Baby/Loans (and Investments beyond statements) with kind catalogs + thin `app/api/{feature}/…` routes, workspace-scoped auth, and settings categories/sections that match `SettingsPageLayout` + skeleton parity.

### Solution pieces

#### 1. Settings IA — Import/Export category + child entry points

##### What is this?
A searchable settings category (or section) named Import / Export on each feature settings page, plus entry points on **child** settings pages that own records (Money entity editors; Investment instrument/ledger surfaces as needed).

##### Why do we need this?
User scope: **all records** + **all child settings pages**. Import must be discoverable next to the data it affects, not only buried under `/money/import`.

##### How to do this?
- Extend `components/settings/settings-types.ts` category metas per feature (e.g. Money add `import-export`; Baby/Loans/Investments same).
- Hub: `SettingsSection` with links/actions per entity kind (Import / Export).
- Children: on Money `accounts|categories|…` pages (and peers), expose Import + Export for that kind (Money import redirects already exist — add Export + keep parity).
- Core `/settings` unchanged.
- Skeletons + loading.tsx updated same change (`docs/DESIGN_GUIDE.md`).

#### 2. Money — export + settings hub over existing import

##### What is this?
Keep `MoneyCsvImportWizard` + `POST /api/money/import/*` for the eight kinds in `lib/money-import-kinds.ts`. Add matching **export** (CSV download of workspace rows for those kinds). Surface both from Money settings hub + per-entity children.

##### Why do we need this?
Import exists; export does not. Settings hub today has `ledger` / `menu` / `clone` but no Import/Export category. Clone is workspace→workspace structure copy — complementary, not a file export.

##### How to do this?
- New `GET` (or POST) export routes under `app/api/money/export/[kind]` (or one route + kind query) — session/Bearer + **read** scope preferred for export (`docs/API.md` security note).
- Server: Drizzle select by workspace → serialize columns aligned with import field defs where possible (round-trip).
- UI: download button next to Import; reuse kind labels from `moneyImportSectionTitle`.
- Do **not** break existing `/money/import/[kind]` wizard flows.

#### 3. Baby + Loans — new kind catalogs + import/export

##### What is this?
First-class import/export for Baby and Loans domain tables, hosted on their settings pages (new Import/Export category; children if any gain entity editors later).

##### Why do we need this?
Neither feature has import/export UI or export APIs. Settings today are profile/language/telegram (Baby) and notifications (Loans) only.

##### How to do this?
**Decision — v1 entity sets** (Grill locks; Analyze defaults):

| Feature | Likely include | Likely exclude / defer |
|---------|----------------|------------------------|
| Baby | care events, growth, vaccines, profile | telegram link secrets; quick-care replay rows |
| Loans | loans + schedule installments (+ status) | push subscription endpoints (device-local) |

- Mirror Money: CSV (or JSON) schema per kind; preview store or sync validate → commit; export download.
- Thin routes: `app/api/baby/import|export…`, `app/api/loans/import|export…` + server modules; GraphQL optional later.
- Auth: existing workspace membership / feature context helpers.

#### 4. Investments — unify settings entry; expand beyond statements

##### What is this?
Settings Import/Export category that links statement import **and** export (and optionally import) for instruments / trade journal / related ledger-linked rows — without removing `/investments/import`.

##### Why do we need this?
Statement import exists (`lib/investment-services/import-statement.ts`, preview/commit APIs) but settings page today only lists instruments + cash accounts — no Import/Export section. “All records” implies more than broker statement CSV.

##### How to do this?
- Add category + links to existing statement wizard.
- Add export for instruments + trade journal (and document what stays Money-owned vs Investments-owned).
- Import for non-statement kinds: either reuse Money CSV patterns or JSON dump — **Grill**.

#### 5. Shared safety, auth, and tests

##### What is this?
Consistent preview/confirm for destructive imports; workspace RLS; token scopes; unit + e2e coverage.

##### Why do we need this?
Anti-goal: silent overwrite. Has auth/PII/schema = yes. Mode full + TDD iron law.

##### How to do this?
- Import: preview → user confirm → commit (Money pattern; new features copy).
- Export: read-scoped; no secrets (telegram tokens, push endpoints) in default dumps.
- Merge policy for import (append / upsert / replace) — **Grill**.
- Tests: parsers/serializers per kind; API auth/workspace; e2e settings section + one round-trip per feature where feasible.
- Docs: `docs/API.md` / OpenAPI when routes land.

### Risks

| Risk | Mitigation |
|------|------------|
| Scope explosion (“all records” across 4 features) | Grill locks v1 kind lists; ship Money export + settings hub first if Design phases; still one design covering all |
| Round-trip CSV column drift | Export columns follow import field defs; golden fixtures |
| PII / device secrets in Baby/Loans export | Default denylist; confirm in Grill |
| Large Money transaction exports | Streaming / chunked download; size warnings |
| Duplicate UX (settings child + `/money/import`) | Child deep-links to same wizard; single implementation |
| Import overwrite of live data | Preview diffs + explicit confirm; no silent replace |
| Investment vs Money ownership (accounts/tx) | Document boundary; export only feature-owned rows |

### Open questions (for Grill)

1. **v1 kind lists** — confirm include/exclude per feature (esp. Baby telegram/quick-care; Loans push subs; Investment quotes cache vs instruments+journal only).
2. **File format** — CSV only (Money-like), JSON archive, or both?
3. **Import merge policy** — append-only, upsert by natural key, or replace-with-confirm?
4. **Money settings IA** — new `import-export` category on hub **and** Import+Export on each entity child page (assumed yes from user wording) — confirm.
5. **Investments** — statement import stays primary; do we also need CSV/JSON import for instruments/journal in v1, or export-only + statement import?
6. **Phasing** — one ship for all four features, or Money-first then Baby/Loans/Investments?
