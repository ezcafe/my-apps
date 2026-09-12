# Design: E2E for Money, Investments, and Loans

## Option A — One finance spec file

**What it is:**
Put all Money, Investments, and Loans Playwright cases in a single file (like Baby Care’s one big smoke file). Keep small helpers inside that file. Skip the whole suite when `E2E_STORAGE_STATE` is missing.

**Example:**
`e2e/money-finance.spec.ts` with `test.describe` blocks for Money / Investments / Loans; run with `pnpm test:e2e -- e2e/money-finance.spec.ts` after setting `E2E_STORAGE_STATE=e2e/.auth/user.json`.

**Pros:**

- One skip gate and one file to open when debugging “finance e2e”.
- Matches Baby Care’s current “one suite file” habit.
- Slightly less boilerplate across files.

**Cons:**

- Depth C + Settings B makes one file long and hard to review.
- Failures mix three features in one list output.
- Temptation to grow a mini page-object framework inside one blob.

## Option B — Split specs + thin shared helpers

**What it is:**
Three focused Playwright files (`money`, `investments`, `loans`) plus a small shared helper for auth skip and hamburger/menu. Same Pocket ID storage pattern as Baby. Live GraphQL against the signed-in workspace (no new seed helper; no Insights GraphQL mocks in v1). Mutating submits: Money add + Loans Pay with unique notes and soft toast asserts; Investments is open-form only (Write-B exception).

**Example:**
`e2e/money.spec.ts`, `e2e/investments.spec.ts`, `e2e/loans.spec.ts` + `e2e/helpers/shell.ts` (`hasAuthStorage`, `openAppMenu`, `uniqueNote()`). Money write: on `/money/new`, click **Notes & extras**, fill Notes with `uniqueNote()`, click “Save transaction”, soft-assert toast title **Transaction added** — never exact balances. Investments v1: open `/investments/new` and assert heading only (no submit). Loans Pay: first list **Pay** (or detail **Add payment to Money**), submit with unique note, soft-assert **Payment recorded in Money**.

**Pros:**

- Clear ownership per feature; easier review and failure triage.
- Shared helper stays tiny (no page-object framework).
- Scales Depth C without one XL file.

**Cons:**

- Three files must each call the same skip-without-storage pattern.
- Slightly more setup than one monolith.
- Contributor must know which file owns which path.

## Tradeoffs

| Factor | Option A | Option B |
|--------|----------|----------|
| Cost / time | Faster to start; slower to maintain as cases grow | Small extra setup; cheaper to maintain at Depth C |
| Complexity | Low file count; high in-file complexity | Low per file; one thin shared helper |
| Usability | Fine for tiny suites | Better for maintainers scanning failures |
| Failure cases | One red file hides which feature broke | Failures point at money vs investments vs loans |

## Recommendation

**Pick Option B** because Gate 1 Depth C + Settings B is already broad: split specs keep Baby’s auth/skip pattern without copying Baby’s monolithic size, and a thin `shell` helper avoids both copy-paste and overbuilt page objects. Live seed + unique notes matches Data B / Write B (Money + Loans Pay submits; Investments open-form exception) without mocks or a new seed script.

## Chosen design (user-approved)

**Option B** — Split specs (`e2e/money.spec.ts`, `e2e/investments.spec.ts`, `e2e/loans.spec.ts`) + thin `e2e/helpers/shell.ts`. Gate 2 approved 2026-09-11.

## Sequence diagram

Recommended design (Option B): authenticated Money “Add transaction” write — the main mutating happy path. Same auth/skip gate applies to Investments and Loans specs.

```mermaid
sequenceDiagram
  participant PW as PlaywrightSpec
  participant Auth as StorageState
  participant Proxy as ProxyAuth
  participant UI as MoneyNewPage
  participant GQL as ApiGraphql
  participant DB as Postgres

  alt E2E_STORAGE_STATE unset
    Note over PW: test.skip — CI stays green
  else storage path set
    PW->>Auth: load E2E_STORAGE_STATE cookies
    PW->>Proxy: GET /money/new
    alt session missing or expired
      Proxy-->>PW: redirect /login
      Note over PW: HARD FAIL — fixture broken; human re-saves storage (not soft assert)
    else session ok
      Proxy-->>UI: render Add transaction
      UI->>GQL: money bootstrap / accounts reads
      GQL->>DB: SELECT workspace accounts categories
      DB-->>GQL: rows
      GQL-->>UI: data for form
      PW->>UI: fill amount type
      PW->>UI: click Notes & extras
      PW->>UI: fill Notes with uniqueNote
      PW->>UI: click Save transaction
      UI->>GQL: MoneyTransactionCreate
      GQL->>DB: INSERT money transaction
      alt validation or auth error
        GQL-->>UI: GraphQL errors
        UI-->>PW: error toast visible
      else ok
        DB-->>GQL: new id
        GQL-->>UI: success
        UI-->>PW: soft-assert toast title Transaction added
      end
    end
  end
```

**Auth failure notes:** Skip **only** when `E2E_STORAGE_STATE` is unset/empty. When storage is set but the app lands on `/login` → **hard fail** (expired/broken fixture). Re-saving storage is a human fix, not a soft assert or skip.

**Related failure notes (Loans Pay):** User must seed a payable installment first. Prefer `/loans` → first visible compact **Pay** button (list shows Pay when `nextScheduleInstallmentId` is set). Else open that loan’s detail and use **Add payment to Money**. Fill Notes with `uniqueNote()`, submit **Record payment**, soft-assert toast **Payment recorded in Money**. If no Pay / Add payment control → **hard fail** (settled: assume Pay exists).

## Contracts

### API contracts

**No new product HTTP/GraphQL APIs.** Tests exercise existing UI → GraphQL. Contracts below are the **Playwright/test helper** surface and the **existing** operations the suite hits.

#### Test helper: `hasAuthStorage` / skip gate

| Item | Detail |
|------|--------|
| Method + path (or name) | `hasAuthStorage` (boolean) + `test.skip(!hasAuthStorage, …)` at describe or test level |
| Auth / who can call | Local/CI e2e runner only |
| Request fields | Reads `process.env.E2E_STORAGE_STATE` (string, optional) |
| Success response | `true` when trimmed path is non-empty → specs run |
| Errors | Env unset/empty → **skip**. Env set but UI redirects to `/login` → **hard fail** (do not skip or soft-pass) |
| Downstream calls | None |

#### Test helper: `openAppMenu(page)`

| Item | Detail |
|------|--------|
| Method + path (or name) | `openAppMenu(page: Page): Promise<void>` in `e2e/helpers/shell.ts` |
| Auth / who can call | Any Playwright test with a loaded shell page |
| Request fields | `page` (Playwright `Page`, required) |
| Success response | Menu opens; Money / Investments / Loans links visible |
| Errors | Timeout if `button` name `/open .+ menu/i` missing (shell not ready) |
| Downstream calls | None (UI only) |

#### Test helper: `uniqueNote(prefix?)`

| Item | Detail |
|------|--------|
| Method + path (or name) | `uniqueNote(prefix?: string): string` |
| Auth / who can call | E2e only |
| Request fields | `prefix` optional string (default `"e2e"`) |
| Success response | String like `e2e-20260911180400-a1b2` for soft identity of writes |
| Errors | None |
| Downstream calls | None |

#### Existing GraphQL (exercised via UI, not called raw in v1)

| Item | Detail |
|------|--------|
| Method + path (or name) | `POST /api/graphql` — `MoneyTransactionCreate` (via `/money/new` UI) |
| Auth / who can call | Signed-in session (cookies from storage state) |
| Request fields | `input: MoneyTransactionCreateInput!` (amount, type, account, notes, … — filled by UI) |
| UI steps | Fill amount/type → click **Notes & extras** → set Notes to `uniqueNote()` → click **Save transaction** |
| Success soft-assert | Toast title **Transaction added** (live copy); no exact balances |
| Errors | Unauthenticated with storage set → **hard fail** on `/login`; validation → error toast |
| Downstream calls | Postgres money tables via existing resolvers |

| Item | Detail |
|------|--------|
| Method + path (or name) | `POST /api/graphql` (loans client may use `/api/graphql/loans`) — `LoanInstallmentPay` / `loanInstallmentPayWithTransaction` |
| Auth / who can call | Signed-in session |
| Request fields | `scheduleInstallmentId`, `moneyWorkspaceId`, `accountId`, `categoryId?`, `notes`, `amountMinor` (UI modal) |
| Discovery | Prefer `/loans` first visible **Pay** (compact list label); else detail **Add payment to Money**. Missing control → **hard fail** |
| UI steps | Open Pay modal → Notes = `uniqueNote()` → **Record payment** |
| Success soft-assert | Toast **Payment recorded in Money** |
| Errors | No payable installment / missing Pay UI → **test fails**; payment failure → error toast |
| Downstream calls | Loans schedule + Money transaction insert |

| Item | Detail |
|------|--------|
| Method + path (or name) | Reads: money/investments/loans bootstrap + list/insights queries already used by pages |
| Auth / who can call | Signed-in session |
| Request fields | Route-dependent (`from`/`to` for insights, `id` for loan detail, …) |
| Success response | Page headings and landmarks render (empty-or-data soft asserts) |
| Errors | Network/GraphQL error chrome if present — do not assert exact chart series |
| Downstream calls | Postgres via existing resolvers |

**Events / other module APIs (if any):**

- None new. Proxy (`proxy.ts` + `auth.ts`) redirects unauthenticated `/money`, `/investments`, `/loans` to `/login`.

### Database contracts

**No schema changes.**

**Seed expectations the tests rely on (Data B):**

| Expectation | Used by | If missing |
|-------------|---------|------------|
| Signed-in user has a Money workspace with at least one usable account (and category if form requires) | `/money/new` submit | Write test fails — user fixes seed |
| Money Insights has enough activity that ATF + More teasers render (Money More mounts with the Insights dashboard section) | Money Insights More | Soft assert / fix seed if teasers missing |
| Investments Insights is **non-empty ATF** (`atf && !empty`) so More teasers show (**Realized vs unrealized**, **P&L by symbol**, **Risk metrics**) | Investments Insights More | Spec **fails** — user seeds instrument/activity so Insights is not empty-state |
| User pre-seeds an active loan with a payable next installment | Loans Pay + list **Pay** | Spec **fails** (settled: assume Pay exists) |
| Loans Insights non-empty ATF (usually true once Pay seed / active loan exists — say so; More titles: **Combined payoff progress**, **Collateral LTV**, **Per-loan payoff**) | Loans Insights More | Spec **fails** if empty-state (no More teasers) |
| Settings child routes exist in app | Money Settings B | Navigation fail = product bug |
| Home / other entry routes | Smoke | Soft assert heading + empty-or-data chrome where More is not required |

**Write B scope (explicit):** Mutating submit paths in v1 are **Money `/money/new`** and **Loans Pay** only. **Investments Write-B exception:** open `/investments/new` and assert heading / form landmark only — do **not** require instrument seed + submit in v1 (form needs instruments/open lots).

**Data ownership notes:**

- E2e **owns** unique-note marker strings only.
- Product/DB ownership unchanged; no delete-after cleanup in v1 (unique notes keep collisions soft).
- **Local-only:** Run mutating e2e only against a disposable local workspace. Unique notes reduce collision; they do **not** make shared/prod storage safe.

### Example queries

Happy-path ops the UI triggers (not new raw e2e GraphQL clients in v1):

```graphql
# Example 1: Money add transaction (via /money/new Save transaction)
mutation MoneyTransactionCreate($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}
# Typical UI-filled input includes amountMinor, type, accountId, notes: "e2e-…"
```

```graphql
# Example 2: Loan Pay modal submit
mutation LoanInstallmentPay($input: LoanInstallmentPayWithTransactionInput!) {
  loanInstallmentPayWithTransaction(input: $input) {
    ok
    moneyTransactionId
  }
}
```

```graphql
# Example 3: Loan detail read before Pay
query LoanDetail($id: ID!) {
  loan(id: $id) {
    id
    name
    # … schedule / next installment fields as page already queries
  }
}
```

Pure navigation cases (settings children, import entry, Insights More expand) add **no new queries** beyond what those pages already fire; asserts are role+name / heading only.

## Challenges answered

- **Do we need this?** Yes — finance routes are auth-gated and have zero Playwright coverage; Baby smoke cannot catch Money/Investments/Loans regressions.
- **What fails?** No `E2E_STORAGE_STATE` → **skip**. Storage set but `/login` → **hard fail**. Missing Money account seed → write fails. Empty Investments Insights → More tests fail (need non-empty ATF seed). Missing payable installment / Pay control → Pay test **hard fails**. Fragile currency/balance asserts → avoided via unique notes + pinned toast strings.
- **Write B vs Investments?** Settled exception: Investments v1 is **open-form only**; Money + Loans Pay remain the mutating submits.
- **Local/prod?** Disposable local workspace only — do not point storage at shared/prod.
- **Is this overspecified?** No page-object framework, no seed helper, no GraphQL Insights mocks, no product UI redesign, no CI secrets — only split files + thin helpers + settled Depth C paths. ADR skipped (not an expensive architecture change; Playwright + Pocket ID already chosen).
