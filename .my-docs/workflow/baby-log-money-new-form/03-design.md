# Design: Baby log forms + vaccines on Growth

**Mode:** full — from `00-run.md`  
**Updated:** 2026-09-19

## Design locks (do not re-open)

| Lock | Choice |
|------|--------|
| **D1** | UI sentinel chip `"vaccine"` on Growth; not a `baby_growth` DB kind; save → `createBabyVaccine` |
| **D2** | Preselect via `?kind=vaccine` (reuse existing Growth `kind` reader) |
| **D3** | Option 2 — update Activities/Insights copy + links this pass (no separate Vaccines capture page) |
| **D4** | Option 1 — delete `app/(shell)/baby/vaccines/*` + `BabyVaccinesPage` this pass; keep vaccine GraphQL/API/table |
| **Gate A** | money/new = chrome only; one-tap feed/diaper/sleep preserved (no extra Save) |
| **Gate A2 / 01b** | Chip order: Pump → Vaccine → Vitamin → Medication → Temperature → Weight → Height → Head; default selection **Weight**; Vaccine always visible, not default |
| **Post-save (Growth)** | Stay on Growth + success toast + reset to Weight (all growth kinds + vaccine). Use `afterSave: "stay"` (or Growth stay constant). **Reject** `BABY_CARE_AFTER_SAVE.diaper` → `/baby` |
| **Label** | Plain **Vaccine** (`growth.vaccine`) |

---

## Decision 1: implementation packaging

### Option 1 — Extend Growth page in place + page-local chrome

**What it is:**
Keep one `BabyGrowthPage` owner. Add UI-only `vaccine` to page chips; branch Save (growth kinds → `createBabyGrowth`, vaccine → `createBabyVaccine` via existing `growthVaccine*` helpers). Permanent `next.config` redirect `/baby/vaccines` → `/baby/growth?kind=vaccine`, then delete vaccines route/page. Restyle feed/sleep/diaper with `quickPickChipCls` / spacing / radii without changing one-tap workflow. Thin nav/header/skeleton/copy/e2e edits.

**Example:**
`BABY_GROWTH_PAGE_CHIPS` includes `vaccine` in Gate A2 order; `isBabyGrowthPageDbKind("vaccine")` is false; Save on Vaccine calls `createBabyVaccine`. Feed method tap still creates immediately — no new Save.

**Pros:**

- Matches `01b` one merge surface and analysis Approach.
- No schema / API rewrite; helpers already exist.
- Low glue; skeleton parity stays obvious.

**Cons:**

- Growth page grows (vaccine dose fields live beside growth fields).
- Chip type ≠ DB kind needs clear helper names/tests.

### Option 2 — Shared BabyLogForm kit, then migrate all capture pages

**What it is:**
Build a shared form shell (chips → fields → save) used by Growth, feed, sleep, diaper; vaccine becomes one kind in that kit. Vaccines route deleted after all pages adopt the kit.

**Example:**
New `components/baby-log-form.tsx` with pluggable field maps; each route only passes kind config.

**Pros:**

- One chrome implementation for all capture pages.
- Future kinds plug in faster.

**Cons:**

- New shared framework (idea Non-goal / “should not build”).
- High risk of forcing Save onto one-tap feed/diaper.
- Larger blast radius; delays vaccine merge.

## Tradeoffs

| Factor | Option 1 | Option 2 |
|--------|----------|----------|
| Cost / time | Medium — targeted edits | High — new abstraction + migrate |
| Complexity | One owner + clear save branch | Framework + adapters |
| Usability | Honors Gate A one-tap + 01b | Easy to break one-tap |
| Failure cases | Miss invalidate / leftover nav | Wrong defaults across all pages |

## Recommendation

**Pick Option 1** because Analyze already chose UI sentinel + `?kind=` + keep vaccine API; `01b` locks one Growth surface; Option 2 fights the Non-goal and Gate A one-tap rule.

## Chosen design (user-approved)

<!-- Fill after Gate B -->

---

## Sequence diagram

```mermaid
sequenceDiagram
  participant UI as BabyGrowthPage
  participant GQL as POST /api/graphql/baby
  participant Growth as features/baby/server/growth
  participant Vax as features/baby/server/vaccines
  participant DB as Postgres

  Note over UI: Open /baby/growth or /baby/growth?kind=vaccine
  UI->>UI: select chip (default Weight; vaccine if kind=vaccine)

  alt chip is DB growth kind
    UI->>GQL: createBabyGrowth(kind, fields)
    GQL->>Growth: Zod + workspace scope
    Growth->>DB: INSERT baby_growth_entry
    alt validation fail
      Growth-->>GQL: BAD_USER_INPUT
      GQL-->>UI: field error / toast
    else ok
      DB-->>Growth: row
      GQL-->>UI: success → invalidate growth → toast
      UI->>UI: stay on Growth; reset chip to Weight (no navigate /baby)
    end
  else chip is vaccine (UI sentinel)
    UI->>GQL: createBabyVaccine(name, dose, administeredAt)
    GQL->>Vax: Zod + workspace scope
    Vax->>DB: INSERT baby_vaccine_entry
    alt validation fail
      Vax-->>GQL: BAD_USER_INPUT
      GQL-->>UI: field error / toast
    else ok
      DB-->>Vax: row
      GQL-->>UI: success → invalidate vaccines → toast
      UI->>UI: stay on Growth; reset chip to Weight (no navigate /baby)
    end
  end

  Note over UI: Post-save = afterSave stay (not BABY_CARE_AFTER_SAVE.diaper → home)
  Note over UI: Bookmark /baby/vaccines → next.config permanent redirect → /baby/growth?kind=vaccine
```

Feed / sleep / diaper: same chrome classes; primary path stays one-tap / start-end (no new GraphQL contracts).

---

## Contracts

### API contracts

**No new endpoints.** Reuse existing Baby GraphQL.

| Item | Detail |
|------|--------|
| Method + path (or name) | `createBabyGrowth` / `createBabyVaccine` (existing) via `POST /api/graphql/baby` |
| Auth / who can call | Session + baby workspace (unchanged) |
| Request fields | Growth: existing kind validators. Vaccine: name, dose (`first`\|`second`), administeredAt — via `growthVaccineCreateInput` |
| Success response | Existing mutation payloads |
| Errors | Existing `BAD_USER_INPUT` / auth errors; UI maps to field + toast |
| Downstream calls | None |

**Events / other module APIs:** none. Insights/Activities keep reading vaccine + growth sources; only **links/copy** that imply a Vaccines capture page change (D3).

### Database contracts

**No schema change this pass.**

| Table / collection | Purpose | Key fields | Indexes / uniques | Write owner | Read owners |
|--------------------|---------|------------|-------------------|-------------|-------------|
| `baby_growth_entry` | Growth/health kinds | existing | existing | Growth mutations | Insights, Activities, Growth UI |
| `baby_vaccine_entry` | Vaccine doses | existing | existing | Vaccine mutations (UI entry now Growth) | Insights, Activities, Growth UI |

**Data ownership notes:** Vaccine rows stay on `baby_vaccine_entry`. Do **not** add `vaccine` to `baby_growth_kind` or Insights growth filter chips.

### Example queries

```ts
// Example 1: Vaccine save from Growth (UI sentinel)
// createBabyVaccine({ name, dose: "first"|"second", administeredAt })
// after growthVaccineCreateInput({ name, dose }) passes
```

```ts
// Example 2: Growth kind save (unchanged shape)
// createBabyGrowth({ kind: "weight", valueNum, unit, recordedAt, ... })
```

```sql
-- Example 3: No DDL — vaccine stays its table
-- SELECT id, name, dose, administered_at FROM baby_vaccine_entry WHERE workspace_id = $1;
```

---

## Patterns to reuse

| Pattern | Why it fits | Reference |
|---------|-------------|-----------|
| Quick-pick chips | money/new chrome | `lib/money-quick-pick-chip-cls.ts` |
| Growth `?kind=` | Redirect + deep link | `components/baby-growth-page.tsx` |
| Vaccine map/save gates | Already tested | `lib/baby-growth-recent.ts` (`growthVaccine*`) |
| Permanent Baby redirects | Bookmarks | `next.config.ts` (`/baby/measure` → growth) |
| Care save + invalidate | Success/error UX | `runBabyCareSaveThenNavigate` with `afterSave: "stay"` (or Growth-named stay constant) + `invalidateBabyQueries`. **Reject** copying today’s Growth/Vaccines use of `BABY_CARE_AFTER_SAVE.diaper` (navigates `/baby`) — wrong for 01b Success (stay + toast + reset to Weight) |

---

## UI / UX / mobile

- **UI concept (01b):** Growth = chips (locked order) → type fields → primary Save; Vaccine = name + First/Second dose + Save. Do not reinvent IA.
- **80/20 (aligned, not re-argued):** #1 type chips (Vaccine always visible); #2 Save on form pages / one-tap primary on feed·diaper·sleep.
- **Layout / hierarchy:** Title → chips → `repeat(auto-fit, minmax(…))` fields → Save. Default chip selection Weight.
- **Loading / empty / error / success:** Skeleton mirrors chips→fields→Save; empty = blank fields + Weight; inline + toast errors; **success = stay on Growth** + toast + **reset to Weight** (growth kinds and vaccine). Do **not** `router.push("/baby")` after save.
- **Skeleton parity:** One **static** Growth skeleton — 8 chips in Gate A2 order + one field block sized to fit name + dose chips + primary Save (covers Weight and Vaccine without reading `?kind=`). No kind-conditional branch in `loading.tsx`. Remove vaccines loading with route delete; feed/sleep/diaper skeletons match restyled controls.
- **Mobile:** ≥44px / `fx-hit-40` chips + Save; no hover-only; Save in thumb zone.
- **Accessibility:** Visible Field labels; type/dose as radiogroup; token focus/contrast.
- **Day-to-day:** Capture group loses “Log vaccines”; caregivers log vaccine from Growth chip or old URL redirect.

---

## Security design review (OWASP)

**Trust boundaries:** Browser form → GraphQL baby API → Postgres (workspace-scoped). Redirect is config-only (no user-controlled destination).

**Abuse cases:** Submit vaccine with empty name/dose; forge growth kind `vaccine` in createBabyGrowth; hit deleted `/baby/vaccines` expecting write UI; cross-workspace id in mutation.

| OWASP | Status | Note |
|-------|--------|------|
| A01 Broken Access Control | pass | Keep existing workspace-scoped vaccine/growth mutations; no IDOR change |
| A02 Cryptographic Failures | N/A | No new secrets or crypto |
| A03 Injection | pass | Stay on GraphQL + Zod + Drizzle; no raw user SQL |
| A04 Insecure Design | pass | UI sentinel ≠ DB kind; reject treating vaccine as growth kind |
| A05 Security Misconfiguration | pass | Permanent redirect only to fixed `/baby/growth?kind=vaccine` |
| A06 Vulnerable Components | N/A | No new deps planned |
| A07 Auth Failures | pass | Existing session/auth on GraphQL unchanged |
| A08 Software / Data Integrity | pass | No client-trusted kind→table mapping without server Zod |
| A09 Logging / Monitoring Failures | pass | Do not log vaccine names in new places; keep existing care error toasts |
| A10 SSRF | N/A | No outbound fetch from this change |

Source: https://owasp.org/Top10/

---

## Challenges answered

- **Do we need this?** Yes — one form chrome + one fewer capture nav item; vaccine findable without a Vaccines page.
- **What fails?** One-tap slowed by forced Save; vaccine “gone” if chip missing or redirect lacks `kind=vaccine`; Insights breaks if vaccine becomes a growth DB kind; dead bookmarks if route deleted without redirect.
- **Is this overspecified?** No shared form framework; no schema move; chrome-only on one-tap pages; D3 limited to copy/links.
