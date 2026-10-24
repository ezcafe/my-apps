# Design: Foods page

**Result:** done  
**Mode:** full — from `00-run.md`  
**Updated:** 2026-10-21

## Design locks (from ideation + grill)

| Lock | Choice |
|------|--------|
| Multi-type / day | Several entries per day; same type may repeat |
| Entry fields | `loggedOn` + `foodType` required; optional `mealSlot` + `note` |
| Calendar | Icons per logged types on each day |
| AI | Auto after each save; in-product panel; variety/balance + next-day suggestions |
| AI fail | Save always wins; keep prior analysis + error/retry |
| Window | Today + last 7 days |
| LLM | OpenAI-compatible (env base URL, key, model) |
| Presets | pork, beef, chicken, fish, vegetable, fruit, dairy, grain, other |
| Types storage | Code presets (no catalog admin v1) |
| Disclaimer | Short “not medical advice” under analysis panel |

---

## Decision 1: feature packaging

### Option A — Full Foods feature module (recommended)

**What it is:**  
New `foods` `WorkspaceAppKey`, Drizzle tables, thin `app/api/foods/**`, `features/foods/**` server + client, `/foods` shell route with provider — same pattern as Baby/Money.

**Example:**  
`WORKSPACE_APP_KEYS` += `"foods"`; `food_log_entry` + `food_analysis`; `POST /api/foods/entries` → insert → run analysis → return `{ entry, analysis }`.

**Pros:**

- Matches `docs/ADDING_A_FEATURE.md`; workspace cookies correct.
- Clear auth boundary; easy to mock LLM behind server module.
- Calendar/log/analysis live under one nav item.

**Cons:**

- Larger first ship (schema + nav + API + UI + AI).
- Needs env for LLM in non-test environments.

### Option B — UI-only under Settings / Baby with localStorage

**What it is:**  
Page without new workspace key; store logs in browser; call LLM from client or skip persistence.

**Example:**  
`/settings/foods` + `localStorage` keys; optional client fetch to OpenAI.

**Pros:**

- Faster prototype; no migration.

**Cons:**

- Breaks workspace sharing; secrets risk if client-side key; fights architecture.
- No durable calendar across devices.

## Tradeoffs

| Factor | Option A | Option B |
|--------|----------|----------|
| Architecture fit | Strong | Weak |
| Multi-device | Yes | No |
| Security | Server key | Client risk |
| Time to first UI | Longer | Shorter |

## Recommendation

**Pick Option A** — required for a real Foods product feature with AI on the server.

## Chosen design

**Decision 1 → Option A.**

### Schema

- **`food_log_entry`:** `id`, `workspaceId`, `loggedOn` (date), `foodType` (text/enum of presets), `mealSlot` (`breakfast|lunch|dinner|null`), `note` (text nullable, short max), `createdAt`, `updatedAt`. Indexes: `(workspaceId, loggedOn)`.
- **`food_analysis`:** one row per workspace (upsert): `workspaceId` PK/unique, `summary` text, `suggestions` jsonb (string[]), `windowStart`/`windowEnd` dates, `entryHash` text, `status` (`ok|error`), `errorMessage` nullable, `updatedAt`.
- Meal slot + food type as PG enums or checked text matching Zod.

### API (thin routes)

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/foods/entries?from&to` | List entries in range (calendar month) |
| POST | `/api/foods/entries` | Create → trigger analysis → `{ entry, analysis }` |
| PATCH | `/api/foods/entries/:id` | Update → re-analyze |
| DELETE | `/api/foods/entries/:id` | Delete → re-analyze |
| GET | `/api/foods/analysis` | Latest analysis for workspace |
| POST | `/api/foods/analysis/retry` | Re-run analysis without new entry |

Auth: `requireFoodsContext` (membership + active workspace for `foods`).

### AI module

- `features/foods/server/analyze-foods.ts`: build prompt from entries in [today−6d, today]; call OpenAI-compatible chat completions; parse JSON `{ summary, suggestions: string[] }`.
- Env (`.env.example` only): `FOODS_LLM_BASE_URL`, `FOODS_LLM_API_KEY`, `FOODS_LLM_MODEL`.
- Timeout + try/catch: on failure upsert `status=error`, leave last ok fields if present (or keep previous row unchanged and set error fields — prefer **keep prior ok body**, set `status=error` + `errorMessage`).
- Tests inject a fake `completeChat` dependency.

### UI (`/foods`)

1. Month calendar (CSS grid 7 cols); day cell shows icons for distinct types that day (duplicates collapse to one icon); select day.
2. Day panel: list entries; add form (type chips, optional meal, optional note); edit/delete.
3. Analysis panel: loading after save; summary + next-day bullets; disclaimer; retry if error.
4. Layout: `FoodsWorkspaceProvider` + chrome like Baby; registry nav + icon; skeletons mirror live layout.

### Non-goals (locked)

No calories, photos, barcode, free-form chat, type catalog admin.

---

## Proposed Has (parent applies to card)

Stage records proposed values only — parent writes card Has via Always §4.

## Has API / DB (proposed)

- **Has UI:** yes  
- **Has API:** yes  
- **Has DB:** yes  
- **Has auth/PII/schema:** yes  

`proposed Has: UI=yes API=yes DB=yes auth/PII/schema=yes`
