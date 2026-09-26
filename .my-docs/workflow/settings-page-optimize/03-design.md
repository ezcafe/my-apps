# Design: settings-page-optimize

**Mode:** full  
**Has API:** no  
**Has DB:** no

## Decision 1: how to shorten Settings?

### Option 1 — Shared layout single-pane filter (recommended)

**What it is:** In `SettingsPageLayout`, when not searching, render **only** the active category section. When searching, render matching categories (today’s search behavior). Update App Settings (and any stacked) loading skeletons to one pane.

**Example:** Open `/settings` → Appearance only. Click API tokens → pairing + token list only. Search “workspace” → Workspaces section(s) that match.

**Pros:** Matches Gate A2; one fix for App + Money + Investments + Loans; smallest durable change; hash/search keep working.

**Cons:** Consumers that relied on scrolling sibling sections on one page lose that (rare; sidebar already implied focus).

### Option 2 — Keep stacked page; accordion / collapse sections

**What it is:** Leave all sections mounted; collapse inactive behind `<details>` or height clamps.

**Example:** Appearance open; Workspaces/API collapsed headers still in the scroll stack.

**Pros:** Hash targets always in DOM; less change to “find by scrolling.”

**Cons:** Fails Gate A2 intent; page still long; false progressive disclosure; more complex a11y.

## Recommendation

**Pick Option 1** — true progressive disclosure; aligns with approved ui-refs.

## Locked picks

| Topic | Pick |
|-------|------|
| Where to fix | Shared `SettingsPageLayout` |
| Default category | Unchanged (`defaultCategory` or first / hash) |
| Search mode | Multi-section matches; clear → last concrete category |
| `"all"` active | Only while searching (existing); not default browse |
| In-section collapse (pairing/workspaces) | **Out of this pass** unless trivial |
| API/DB | No |

## System design

### Overview

- **Shape:** Server still renders all section React trees into layout props; **client layout** chooses which section nodes to mount in the main column.
- **Boundaries:** UI-only; no new routes; session data loaders unchanged.
- **Failure:** Empty search matches → existing empty state; invalid hash → first category.
- **Point to:** Sequence below (no API/DB contracts).

### Concept 1 — Browse vs search visibility

- **What:** Browse = one id; Search = filter list.
- **Why:** Matches mental model of sidebar + search.
- **How:** `visibleCategories = isSearching ? matching : activeConcrete`.

## Design patterns used

### Pattern 1 — Presentational layout filter

- **What:** Pure visibility helper + layout map.
- **How:** `resolveVisibleSettingsCategories({ isSearching, matching, activeCategory, categories })`.
- **Why:** Unit-testable without DOM.
- **Best practices:** Keep sidebar/search as today; only change what maps to DOM.

### Pattern 2 — Skeleton mirrors live pane

- **What:** Loading shows sidebar + search + one section skeleton.
- **How:** Trim `app/(shell)/settings/loading.tsx` (and sibling settings loadings if they stack all).
- **Why:** Zero CLS / DESIGN_GUIDE.

## Sequence diagram

```mermaid
sequenceDiagram
  participant U as User
  participant L as SettingsPageLayout
  participant S as Sidebar / Search

  U->>L: Open /settings (#hash optional)
  L->>L: activeCategory = hash or default
  L->>U: Render only that section

  U->>S: Click category
  S->>L: setActive + replaceState hash
  L->>U: Swap main pane to that section

  U->>S: Type search
  S->>L: active=all; matching=filter
  L->>U: Render matching sections only

  U->>S: Clear search
  L->>L: Restore last concrete category
  L->>U: Single pane again
```

## API contracts

N/A — no public HTTP/GraphQL contract change.

## Database contracts

N/A — no schema/migrations/persistence query change.

## Example queries

N/A

## UI / UX / mobile

- Align Gate A / 01b: #1 nav+active; #2 active controls; secondary other categories.
- Desktop: sticky sidebar unchanged.
- Mobile: horizontal category chips unchanged; one pane below.
- Hash: `#settings-api-tokens` opens API tokens pane only.
- Skeleton: one content block (Appearance-shaped).
- Light/dark: tokens only; no new chrome.

## Security (OWASP)

Trust boundary: browser only (existing session pages). No new inputs to server.

| OWASP | Status | Note |
|-------|--------|------|
| A01 Broken Access Control | N/A | No authz change |
| A02 Cryptographic Failures | N/A | |
| A03 Injection | pass | Search stays client filter on known categories |
| A04 Insecure Design | pass | Danger zone still isolated category |
| A05 Security Misconfiguration | N/A | |
| A06 Vulnerable Components | N/A | No new deps |
| A07 Auth Failures | N/A | |
| A08 Software / Data Integrity | N/A | |
| A09 Logging / Monitoring Failures | N/A | |
| A10 SSRF | N/A | |

Source: https://owasp.org/Top10/

## Challenges answered

- **Do we need shared layout?** Yes — same bug on Money settings; avoid fork.
- **Unmount vs hide?** Unmount/not render inactive — cleaner a11y; remount OK for settings forms (local state resets on leave is acceptable; document if Workspace draft forms need warn — rare).
- **Form state lost on category switch?** Acceptable for this pass (Settings are mostly immediate save). If Money forms suffer, Design note: remount is intentional; user can stay on category while editing.
