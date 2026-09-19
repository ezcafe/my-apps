# Design: Dedicated Baby Activities page

## Decision 1: Activities page structure

### Option 1 — Dedicated `BabyActivitiesPage` (Money Spending shape)

**What it is:**
Add a thin route `app/(shell)/baby/activities/page.tsx` that mounts one client page owner (`components/baby-activities-page.tsx`), like Money’s `MoneyTransactionsPage`. That page owns filter toolbar → period chip → selectable ledger, selection bar, and edit modal. Move the Activity log UI out of `BabyInsightsDashboard`. Keep merge / selection / edit helpers in `lib/`. Insights becomes charts + cue only.

**Example:**
`/baby/activities` → `<BabyActivitiesPage />` with `InsightsDateRangeFiltersBar` + `AnalyticsPeriodChip` + ledger table + `BabyActivitySelectionBar` + `BabyInsightsEditModal`. Dashboard no longer renders `baby-activity-log` / expand gate.

**Pros:**

- Matches Spending’s one-page-owner pattern; easy to keep chrome order and skeleton parity.
- Clear ownership: Activities = ledger; Insights = patterns.
- Smaller risk of accidental dual-host of the log.

**Cons:**

- One large-ish new page file (mitigate by keeping helpers in existing `lib/` modules).
- Requires a careful cut from the dashboard (not a tiny prop flip).

### Option 2 — Thin route + many small extracted slices (no single page owner)

**What it is:**
Thin Activities route composes several extracted pieces (`BabyActivityFilters`, `BabyActivityLedgerTable`, …) pulled from the dashboard, with filter/list state living in hooks or leftover dashboard modules. No single Spending-like page component.

**Example:**
`page.tsx` renders `<InsightsDateRangeFiltersBar />` + `<BabyActivityLedgerTable />` + bar/modal, each wired in the route or a thin wrapper with duplicated enable/query glue.

**Pros:**

- Smaller named pieces; possible reuse if another surface needed the ledger later.

**Cons:**

- Wiring (default range, infinite queries, selection, invalidate) tends to scatter and drift from Spending.
- Easier to leave dead expand-gate code on Insights or forget skeleton parity.
- Over-splits a move that Gate A already scoped as one cleanup page.

## Tradeoffs

| Factor | Option 1 | Option 2 |
|--------|----------|----------|
| Cost / time | Medium cut from dashboard into one page | Similar cut + more glue files |
| Complexity | One owner; Insights slimmed | Many owners; harder mental model |
| Usability | Same UI (01b) if chrome locks held | Same UI only if every slice stays aligned |
| Failure cases | Missed extract leaves dual log | Missed wiring → empty list / broken edit |

## Recommendation

**Pick Option 1** because Money Spending already proves the dedicated page pattern, Gate A2 locked one Activities surface, and Analyze said move the log rather than rebuild. Option 2 adds file churn without a second consumer.

---

## Decision 2: Insights growth fetch after the log leaves

### Option 1 — Always-on growth on Insights; timeline off Insights

**What it is:**
After removing `activityOpen`, Insights keeps **growth** infinite query enabled whenever the Insights page is active (workspace ready), so More insights weight/height/head/temp charts still get points. Insights does **not** fetch timeline for a ledger. Activities always enables **timeline + growth** for the merged ledger (no expand gate). Same React Query keys as today when date bounds match → cache share.

**Example:**
Insights: `growthEnabled = true` (page mount); `timelineEnabled = false`. Activities: both `true` on mount with `babyInsightsDefaultRange()`.

**Pros:**

- Charts stay alive without caregivers expanding a removed log.
- Simple rule; no new “More insights open” UI state.
- Cache reuse when ranges overlap Activities.

**Cons:**

- Insights loads growth even if the user never opens More insights (acceptable — growth payload is already used for charts).

### Option 2 — Lazy growth when More insights expands

**What it is:**
Tie growth fetch to the existing More-insights expand state (`moreOpen` on `BabyInsightsDashboard`, `data-testid="baby-more-insights"`) instead of the old Activity log expand (`activityOpen`). Do **not** invent a parallel flag.

**Example:**
`growthEnabled = moreOpen`; charts show empty/skeleton until More insights expands.

**Pros:**

- Slightly less work on first Insights paint if user only wants care charts/KPIs.
- Reuses the toggle caregivers already open for More insights.

**Cons:**

- Reintroduces an expand gate for chart data — easy to ship empty growth charts if `moreOpen` is forgotten.
- More state to test; fights “Insights = patterns first.”

## Recommendation

**Pick Option 1** — Insights’ job is charts; do not leave growth data-dead after removing `activityOpen`. Activities owns the care timeline list fetch.

**Superseded by Chosen:** human locked **Option 2** (`growthEnabled = moreOpen`). See Chosen design below.

---

## Decision 3: Old `/baby/timeline` redirects + Home link

### Option 1 — Timeline → Activities; Home → Activities; growth stays Insights

**What it is:**
Change `next.config.ts` so `/baby/timeline` (+ path) permanently redirects to `/baby/activities`. Keep `/baby/growth` → `/baby/insights`. Update Home pending “too old” link from `/baby/timeline` to `/baby/activities` (copy can say open Activities).

**Example:**
`{ source: "/baby/timeline", destination: "/baby/activities", permanent: true }` · Home `href="/baby/activities"`.

**Pros:**

- Old timeline bookmarks land on the cleanup ledger (what people wanted).
- Home “review past entries” goes straight to Activities.
- Growth alias still means charts/Insights.

**Cons:**

- Permanent redirect change — anyone who used timeline as a shortcut to Insights charts must use Insights nav (cue + nav still exist).

### Option 2 — Keep timeline → Insights; only retarget Home

**What it is:**
Leave redirects as today; rely on Insights cue + nav. Only change Home pending link to Activities.

**Example:**
`/baby/timeline` still → Insights; Home `href="/baby/activities"`.

**Pros:**

- Zero redirect churn; fewer e2e redirect asserts to rewrite.

**Cons:**

- Timeline bookmarks still miss the log until the user notices the cue.
- Home and timeline aliases disagree about “where past entries live.”

## Recommendation

**Pick Option 1** — timeline historically meant the event list; Activities is that list now. Growth → Insights stays correct for measurement charts.

**Superseded by Chosen:** human locked **Option 2** (keep `/baby/timeline` → Insights; only retarget Home). See Chosen design below.

---

## Decision 4: Activities breadcrumbs

### Option 1 — Empty crumbs (top-level, per 01b)

**What it is:**
`resolveBabyAppHeader("/baby/activities")` returns title key for **Activities** and `breadcrumbs: []` (Home-like). Section nav already shows location.

**Example:**
`{ titleKey: "activities.title", breadcrumbs: [] }` — `PageHeading` with title only, no Home → Activities trail.

**Pros:**

- Matches 01b handoff (“top-level page — no breadcrumbs”).
- Spending-like review pages often read as primary destinations; less chrome.

**Cons:**

- Inconsistent with Insights (`Home → Insights`) if caregivers expect every Baby child route to crumb.

### Option 2 — Match Insights: Home → Activities

**What it is:**
Same crumb pattern as Insights / Feed / etc.

**Example:**
`breadcrumbs: [{ labelKey: "home.title", href: "/baby" }, { labelKey: "activities.title" }]`.

**Pros:**

- Consistent with most Baby child routes today.

**Cons:**

- Conflicts with Gate A2 / 01b lock; crumbs are location polish, not the 80/20 job.

## Recommendation

**Pick Option 1** — honor 01b; nav + title carry location. Do not re-argue Gate A.

---

## Chosen design (user-approved)

**Human approved (2026-09-18):** **Decision 1 Option 1** + **Decision 2 Option 2** + **Decision 3 Option 2** + **Decision 4 Option 1**.

| Decision | Chosen | Locked meaning |
|----------|--------|----------------|
| 1 Page structure | Option 1 | Dedicated `BabyActivitiesPage` + thin `/baby/activities` route |
| 2 Insights growth fetch | Option 2 | Growth fetch = existing **`moreOpen`** (More insights toggle) — not always-on; not a new flag; timeline list stays off Insights |
| 3 Timeline + Home | Option 2 | Keep `/baby/timeline` → Insights; **only** retarget Home pending link → Activities |
| 4 Breadcrumbs | Option 1 | Empty crumbs on Activities |

**List ownership / sync (Build must move, not drop):** Today Insights gates timeline sync poll (interval first-page truncate), auto-page, load-more, and list enable on `activityOpen` / `listsEnabled`. After the move, **`BabyActivitiesPage` owns** timeline list fetch **and** that sync / auto-page / load-more glue (enabled on mount — no expand gate). **Insights drops** timeline list query, `activityOpen`, `listsEnabled`, sync truncate, and timeline auto-page. Insights keeps series (+ growth when `moreOpen`).

**Series-only care KPIs on Insights:** After timeline list is off Insights, care-count / care KPI paths that used to fall back to `timelineItems` / `listsEnabled` go away. That is intentional — rely on `babyInsightsSeries` (and growth charts when `moreOpen`). Do not keep a silent timeline fallback on Insights.

Gate B still confirms design + tasks + tests (+ UI) before Build.

## Sequence diagram

Main path: open Activities → load merged ledger → edit/delete → refresh.

```mermaid
sequenceDiagram
  participant UI as BabyActivitiesPage
  participant GQL as POST /api/graphql/baby
  participant Care as care-events / growth servers
  participant DB as Postgres

  UI->>UI: default range last 7 days (babyInsightsDefaultRange)
  UI->>GQL: babyTimeline(from,to,limit,cursor) + babyGrowthEntries(...)
  GQL->>Care: workspace-scoped resolvers

  alt auth / forbidden
    Care-->>GQL: 401 or 403
    GQL-->>UI: auth/workspace error
    UI->>UI: existing Baby auth/workspace handling
  else load ok
    Care->>DB: read care events / growth rows
    DB-->>Care: rows
    Care-->>GQL: pages
    GQL-->>UI: items + nextCursor
    UI->>UI: merge newest-first, filter Care menu, show-more window
    UI->>UI: own sync interval truncate + auto-page (moved from Insights)
  else load error
    Care-->>GQL: error
    GQL-->>UI: load failure
    UI->>UI: inline Alert + retry
  end

  alt single Edit save
    UI->>GQL: updateBabyEvent or updateBabyGrowth
    GQL->>Care: ownership check + write
    Care->>DB: update
    DB-->>Care: ok
    Care-->>GQL: entity
    GQL-->>UI: success
    UI->>UI: invalidate timeline/growth keys; clear selection
  else Delete (one or multi loop)
    UI->>GQL: deleteBabyEvent / deleteBabyGrowth per id
    GQL->>Care: ownership check + delete
    Care->>DB: delete
    Care-->>GQL: entity or error
    GQL-->>UI: per-row result
    alt all deletes ok
      UI->>UI: success settle; invalidate; clear selection
    else partial multi-delete fail
      UI->>UI: honest partial settle (existing helpers); keep failed rows selected if today does
    end
  end

  Note over UI,DB: Insights: no timeline list/sync; cue → /baby/activities; growthEnabled = moreOpen (Decision 2 Option 2)
```

Empty growth charts until More insights expands (`moreOpen`) is expected under Decision 2 Option 2 — skeleton/empty must be honest, not a leftover `activityOpen` gate.

## Contracts

### API contracts

No new HTTP routes or GraphQL schema fields this pass. Activities and Insights reuse `POST /api/graphql/baby`.

| Item | Detail |
|------|--------|
| Method + path (or name) | `POST /api/graphql/baby` — operations `babyTimeline`, `babyGrowthEntries`, `babyInsightsSeries`, `updateBabyEvent`, `deleteBabyEvent`, `updateBabyGrowth`, `deleteBabyGrowth` (existing) |
| Auth / who can call | Signed-in user with access to the active Baby workspace (same as today; server resolves workspace from session/cookies — no client-supplied foreign workspace id) |
| Request fields | Timeline/growth list args (schema): `from`, `to`, `limit`, `cursor?` (growth also optional `kind`). Mutations: care/growth ids + patch fields per existing inputs. Client must not invent bulk-delete. |
| Success response | Timeline items: `id`, `kind`, `type`, `at`, `endedAt`, `payload`, `summary`, `source`, `cursor` (+ `nextCursor`). Growth items: `id`, `kind`, `recordedAt`, `valueNum`, `valueText`, `unit`, `notes` (+ `nextCursor`). Match `baby-typeDefs` / `BABY_*` strings in `lib/baby-query-options.ts`. |
| Errors | Existing GraphQL/HTTP error mapping; no stack traces to client; ownership failures → forbidden/not found per server today |
| Downstream calls | None beyond Baby care/growth resolvers → DB |

**Events / other module APIs (if any):**

- None. Money ledger APIs unchanged. No new shell `WorkspaceAppKey`.

**Client query enable rules (contract for Build):**

| Surface | Timeline list + sync/auto-page | Growth list |
|---------|--------------------------------|-------------|
| Activities | enabled on mount; **owns** interval sync truncate + auto-page + load-more (moved from Insights) | enabled on mount |
| Insights | **off** — no timeline query, no `activityOpen` / `listsEnabled`, no sync truncate / timeline auto-page | enabled when existing **`moreOpen`** is true (More insights); empty/skeleton until expand is intentional |

**Cache:** Prefer existing keys and exported query strings (`BABY_INSIGHTS_TIMELINE_QUERY`, `BABY_GROWTH_ENTRIES_QUERY`, …) in `lib/baby-query-options.ts` as source of truth so overlapping date ranges share cache; invalidate the same helpers after mutations.

### Database contracts

No new tables / columns this pass.

| Table / collection | Purpose | Key fields (name, type) | Indexes / uniques | Write owner | Read owners |
|--------------------|---------|-------------------------|-------------------|-------------|-------------|
| Existing Baby care event tables (via care-events) | Feed / sleep / diaper / … rows | id uuid, workspace, recorded_at, payload… | existing | `updateBabyEvent` / `deleteBabyEvent` | `babyTimeline`, Insights series as today |
| Existing Baby growth tables (via growth) | Measurement rows | id uuid, workspace, recorded_at, metrics… | existing | `updateBabyGrowth` / `deleteBabyGrowth` | `babyGrowthEntries`, Insights More insights charts |

**Data ownership notes:**

- All reads/writes stay workspace-scoped on the server. UI selection keys must not cross workspace. Multi-delete remains a client loop of single deletes (no bulk SQL).

### Example queries

Aligned with `lib/graphql/baby-typeDefs.ts` and `lib/baby-query-options.ts` (`BABY_INSIGHTS_TIMELINE_QUERY`, `BABY_GROWTH_ENTRIES_QUERY`). Build must reuse those strings — do not invent new operations or arg names.

```graphql
# Example 1: Activities ledger — care page (payload for edit modal)
query BabyInsightsTimeline(
  $from: String
  $to: String
  $cursor: String
  $limit: Int
) {
  babyTimeline(from: $from, to: $to, cursor: $cursor, limit: $limit) {
    items {
      id
      kind
      type
      at
      endedAt
      payload
      summary
      source
      cursor
    }
    nextCursor
  }
}
```

```graphql
# Example 2: Activities + Insights More insights — growth page
query BabyGrowth(
  $kind: String
  $from: String
  $to: String
  $cursor: String
  $limit: Int
) {
  babyGrowthEntries(
    kind: $kind
    from: $from
    to: $to
    cursor: $cursor
    limit: $limit
  ) {
    items {
      id
      kind
      recordedAt
      valueNum
      valueText
      unit
      notes
    }
    nextCursor
  }
}
```

```graphql
# Example 3: Delete one care row after selection
mutation DeleteBabyActivity($id: ID!) {
  deleteBabyEvent(id: $id) { id }
}
```

## Patterns to reuse

| Pattern | Why it fits | Reference (repo path or known name) |
|---------|-------------|-------------------------------------|
| Dedicated transactions-style page | One owner for filters → period → ledger | `components/money-transactions-page.tsx` |
| Thin Baby route | Insights already thin | `app/(shell)/baby/insights/page.tsx` |
| Insights Date + Care FilterMenu chrome | Gate A2 lock — not pill chips | `InsightsDateRangeFiltersBar` in `components/analytics-filters.tsx` |
| Period chip | Always-visible range (#1) | `components/analytics-period-chip.tsx` |
| Activity selection bar + edit modal | Already Money-parity | `baby-activity-selection-bar.tsx`, `baby-insights-edit-modal.tsx` |
| Merge / selection / show-more / default range | Unit-tested helpers | `lib/baby-insights-activity-log.ts`, `list-visible`, `default-range`, `filters`, `activity-edit` |
| Section nav + header + icons | Findability | `lib/app-section-nav.ts`, `lib/baby-app-header.ts`, `icon-baby-nav.tsx`, `money-section-tabs.tsx` |
| Skeleton parity | Zero CLS | `components/baby-page-skeleton.tsx` + Money filter skeletons |
| GraphQL via `babyGraphQLRequest` | No new HTTP surface | `lib/baby-query-options.ts` |

## UI / UX / mobile

- **UI concept (01b):** Follow `01b-ui-concept.md` + `ui-refs/` — filters toolbar → period chip → selectable ledger; FilterMenu Date + Care + Apply/Reset; ghost Edit; floating selection bar; Insights one-line cue. Do not invent a conflicting layout.
- **80/20 UI (aligned with Gate A — do not re-argue):**
  - Goals: scan / filter / edit-delete past care+growth; Insights = patterns only
  - Vital few: dedicated page, move log, keep select→Edit/Delete, nav entry, Insights cue
  - **#1 always visible:** period / date range (Apply when draft differs)
  - **#2 always visible:** ledger rows with select + Edit
  - Secondary: full edit in modal; care types inside Care menu; no summary strip; capture elsewhere
  - Top journey: Baby → Activities → range → scan → Edit/Delete → refresh
  - Defaults: last 7 days; no selection; quiet empty; Insights cue present
  - Measure after ship: find→edit without Insights; cue/nav usage; empty rate on 7-day default
- **Layout / hierarchy:** `PageHeading` **Activities** → `SHELL_DASHBOARD_STACK` → filter bar → period chip → sharp table (or Money-like mobile cards) → fixed selection bar when `selectedCount > 0`. No charts/KPIs on Activities.
- **Loading / empty / error / success:** Full-page skeleton on load; muted empty copy in table region; inline Alert + retry on load fail; after save/delete invalidate + clear selection + existing feedback scale.
- **Skeleton parity (zero CLS):** New `BabyActivitiesPageSkeleton` (or equivalent in `baby-page-skeleton.tsx`): filter triggers → period chip → table row placeholders. Insights skeleton **drops** collapsed Activity log; optional thin cue-line placeholder if cue always shows. `activities/loading.tsx` + update Insights `loading.tsx`.
- **Mobile:** ≥44px hits on row Edit, filter menu triggers, selection-bar actions; no hover-only; thumb-friendly bottom bar; container-query / Money mobile card split if Spending ledger uses it.
- **Accessibility basics:** Real buttons/links; focus into edit modal; `aria-label` where needed; selected state not color-alone; heading order; light + dark via tokens.
- **Day-to-day:** Nav **Activities** next to Insights (`group: "review"`); Insights cue (“Looking for past entries? **Open Activities**”); Home pending link → Activities; `/baby/timeline` **stays** → Insights (Decision 3 Option 2); growth → Insights unchanged.

**Nav / chrome wiring checklist**

| Piece | Change |
|-------|--------|
| `APP_SECTION_NAV.baby` | Insert Activities href `/baby/activities`, label Activities, icon id, `group: "review"`, **next to Insights** |
| `AppSectionTabIconId` + icon map | New baby Activities icon |
| `resolveBabyAppHeader` | `activities.title`, empty breadcrumbs |
| i18n `messages/baby/en.ts` + `vi.ts` | Nav, title, empty, cue, errors |
| Home pending link | Retarget → `/baby/activities` (copy tweak if needed) |
| `next.config.ts` | **No change** this pass — `/baby/timeline` still → Insights; `/baby/growth` still → Insights |

## Security design review (OWASP)

Trust boundaries:

- Browser → `POST /api/graphql/baby` (session cookies).
- Client filter dates / selected ids → server must re-check workspace ownership on every read/mutation.
- No new upload, webhook, or server-side URL fetch in this design.

Abuse cases:

- Tamper selected ids / forge another family’s event id → must 403/404, no cross-workspace edit/delete.
- Spam multi-delete loop → same as today; no new bulk amplify API; rely on existing auth + sensible client UX (no silent infinite retry).
- Open redirect via cue → hard-coded `/baby/activities` only.
- XSS via event notes/payload in table → React text escaping only; do not `dangerouslySetInnerHTML`.

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 Broken Access Control | pass | Reuse server ownership on timeline/growth/mutations; never trust client workspace id |
| A02 Cryptographic Failures | N/A | No new secrets, tokens in URLs, or crypto surfaces |
| A03 Injection | pass | Existing parameterized GraphQL/DB path; render as text |
| A04 Insecure Design | pass | Threat model above; no client-only authz; no new bulk delete API |
| A05 Security Misconfiguration | pass | No new CORS/debug; keep existing error shape (no stacks) |
| A06 Vulnerable Components | N/A | No new dependencies planned |
| A07 Auth Failures | pass | Same Baby session cookies / workspace gate as other Baby pages |
| A08 Software / Data Integrity | N/A | No webhooks / unsigned updates |
| A09 Logging / Monitoring Failures | pass | Do not log payloads/PII in new client paths; server keeps existing mutation logging norms |
| A10 SSRF | N/A | No server fetch of user URLs |

Source: https://owasp.org/Top10/

## Challenges answered

- **Do we need this?** Yes for the stated ask — ledger cleanup and Insights pattern review are different jobs; Gate A / A2 already locked the page and Spending chrome.
- **What fails?** (1) Leaving growth tied to removed `activityOpen` instead of existing `moreOpen` → empty growth charts forever. (2) Silent Insights removal → “entries vanished.” (3) Keeping e2e on Insights Activity log expand → false fails. (4) Pill chips or summary strip → Gate A2 / Gate A violations. (5) Sharing one filter store across Insights and Activities → wrong charts or wrong list. (6) Changing timeline redirect despite Decision 3 Option 2 → unwanted churn. (7) Moving the ledger but **not** timeline sync/auto-page → Activities list goes stale vs today’s log. (8) Inventing a second expand flag beside `moreOpen` → dual gates and broken tests.
- **Series-only after move:** Insights care counts / care KPIs use `babyInsightsSeries` only; timeline list fallback is gone and that is OK. Growth charts wait on `moreOpen`.
- **Is this overspecified?** No new APIs/DB. Structure + fetch enable rules + sync move + Home-only retarget are the minimum. GraphQL names match `baby-typeDefs` / `baby-query-options` (`from`/`to`; growth `valueNum` shape).
