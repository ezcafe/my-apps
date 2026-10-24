# Analysis: Foods page

**Result:** done  
**Size:** Prefer bullets. ≤5 solution pieces.  
**Updated:** 2026-10-21

## Deep dive

### Overall

#### What is this?
New **Foods** workspace feature: log food types (multi per day), optional meal slot + note, calendar with icons, **auto AI after each save** showing variety/balance + next-day suggestions in the Foods UI.

#### Why do we need this?
User wants a dedicated place to track what they ate by type and get immediate AI guidance for balance and tomorrow — not buried in Money/Baby.

#### How to do this?
Follow `docs/ADDING_A_FEATURE.md`: `foods` workspace key → schema → registry/nav → shell routes + provider → thin API → UI (calendar + log + analysis panel). New LLM server helper (none exists today). Mirror Baby layout/provider patterns; build calendar from design tokens (no shared calendar found).

### Solution pieces

#### 1. Workspace + schema

##### What is this?
`WORKSPACE_APP_KEYS` += `foods`; tables for food types (or enum/preset), log entries, stored AI analysis results.

##### Why do we need this?
Logs and analysis must be workspace-scoped and durable; calendar and AI panel need server data.

##### How to do this?
**Decision — food types storage**

- **Option A — Preset enum / const list in code + optional custom text on entry**
  - **Example:** `type: "pork"|"beef"|…|"custom"` + `customLabel?`
  - **Pros:** Fast v1; no type admin UI.
  - **Cons:** Harder to rename/add types without deploy.
- **Option B — `food_type` catalog table per workspace**
  - **Example:** seed pork/beef/vegetable/fish; entries FK to type id.
  - **Pros:** Editable later; icons per type in DB.
  - **Cons:** More migration + CRUD.
- **Recommendation:** **Option A** for v1 (idea default); Design may upgrade to B if icon mapping needs rows.

**Entries:** `workspace_id`, `logged_on` (date), `food_type`, optional `meal_slot` enum, optional `note`, timestamps. Unique? Allow multiple same type same day (different meals) — yes.

**Analysis cache:** store last analysis text/JSON per workspace (or per day) + `source_entry_ids` / hash so re-save can refresh; avoid unbounded LLM spam via debounce or coalesce in API.

#### 2. HTTP API + AI

##### What is this?
Thin `app/api/foods/**` routes; server module runs Zod + Drizzle; after create/update/delete log → trigger analysis → return entry + analysis payload.

##### Why do we need this?
UI needs CRUD; auto-analyze-after-save needs a single write path that updates the analysis panel.

##### How to do this?
- Pattern: Baby/Money thin route → `features/foods/server/...`.
- Auth: workspace membership for `foods` key (new `requireFoodsContext` twin).
- AI: env-based provider (OpenAI-compatible or Anthropic — **Grill/Design pick**); prompt = recent logs + today; output structured: summary (variety/balance) + next-day suggestions[]; UI disclaimer “not medical advice”.
- Failure: save still succeeds; analysis panel shows retry/error (*guess* — confirm in Grill).

#### 3. UI: calendar + log + analysis

##### What is this?
`/foods` page: month calendar with type icons per day; add/edit log; panel for latest AI result.

##### Why do we need this?
Core user experience from ideation.

##### How to do this?
- Shell: `app/(shell)/foods/layout.tsx` + `FoodsWorkspaceProvider` + registry icon.
- Calendar: CSS grid `repeat(7, …)` + container queries; icons from preset map; skeleton parity mandatory.
- Log form: type chips, optional meal Select, optional note; multi entries per day list.
- Analysis panel: loading while LLM runs after save; show balance + next-day bullets.
- Design tokens only; light/dark.

#### 4. Tests

##### What is this?
Unit: validators, type presets, analysis prompt/shape. API: CRUD + membership. E2E: log two types same day → calendar icons → analysis region updates (mock LLM in e2e).

##### Why do we need this?
Mode full + TDD iron law; AI must be mockable.

### Risks

| Risk | Mitigation |
|------|------------|
| LLM latency/cost on every save | Coalesce; short prompt; cache by day hash; timeout + non-blocking UI |
| No LLM in repo yet | Feature flag / mock in tests; Design picks provider + `.env.example` keys only |
| Calendar CLS / a11y | Skeleton parity; day cells as buttons; icon labels |
| Medical overclaim | Disclaimer copy; soft suggestions only |
| Scope creep (nutrition DB) | Stay on type-level analysis |

### Open questions (for Grill)

1. Same type twice same day (e.g. pork lunch + pork dinner) — allowed? (analysis assumes yes)
2. On AI failure after successful save — keep prior analysis vs clear vs error-only?
3. Analysis window: today only vs last N days for variety?
4. LLM provider preference (OpenAI / Anthropic / other)?
5. Preset list beyond pork/beef/vegetable/fish?

### Proposed Has

UI yes · API yes · DB yes · auth/PII/schema yes (unchanged)
