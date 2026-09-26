# Design: drawer-nav-assessment

**Mode:** full  
**Has API:** no  
**Has DB:** no

## Decision 1: how to redesign the drawer?

### Option 1 — Surface existing task groups + Other apps label (recommended)

**What it is:** Keep all destinations. In `MoneyAppMenu`, render current-app items with `appSectionItemsByGroup` and `APP_NAV_GROUP_LABELS` (Browse / Review / Capture / Configure). Label the peer-app band **Other apps**. Update DESIGN_GUIDE to allow these labels. Match approved Gate A2 HTML.

**Example:** On `/baby`, open menu → Browse: Home → Review: Insights, Activities → Capture: Log… → Configure: Settings → Other apps → Workspace footer.

**Pros:** Matches A2; uses existing data/helpers; lowest blast radius; improves navigation budget without cutting power.

**Cons:** Slightly taller scroll for short apps (Money); DESIGN_GUIDE text must change.

### Option 2 — Flat list only; stronger separators / reorder

**What it is:** Keep flat links; maybe dividers or reorder; no group subtitle labels.

**Example:** Same Baby links in one continuous list with a hairline before Other apps.

**Pros:** Matches older DESIGN_GUIDE “no subtitle headers”; fewer DOM nodes.

**Cons:** Fails Gate A2; weak mental model; ignores finished assessment step “reassess categories.”

## Recommendation

**Pick Option 1** — Gate A2 + P&P category map; helpers already exist.

## Locked picks

| Topic | Pick |
|-------|------|
| Design | Option 1 |
| Group order | `APP_NAV_GROUP_ORDER`: browse → review → capture → configure |
| Group labels | `APP_NAV_GROUP_LABELS` exact English strings |
| Other apps | Label **Other apps** |
| Page actions | Unchanged (top when registered) |
| Workspace footer | Unchanged |
| Desktop rail | No group labels this pass |
| Cuts this pass | None beyond existing optional-tab visibility |
| Search in drawer | Out of scope |
| API/DB | No |

## Navigation Assessment (P&P long-nav)

Source: `refs/navigation-assessment-framework.md` · https://www.pencilandpaper.io/articles/navigation-assessment-framework

### Persona inventory

| Persona | Drawer sees |
|---------|-------------|
| Full-access owner (default for design) | Current app sections + other three apps + Kiosk/Help/Settings/auth |
| Single-app day | Mostly current-app groups; Other apps still short |

### Low-value rank (utility 1–10, design judgment)

| Destination class | Rank | Action |
|-------------------|------|--------|
| Current-app browse/capture (Home, Spending, Log feed…) | 9–10 | Keep |
| Review (Insights, Activities) | 8 | Keep |
| Configure (app Settings) | 7 | Keep |
| Other app homes | 7 | Keep as jump only |
| Optional Money Bills/Savings/Import | 4 | Already amalgamated via visibility (off by default) |
| Help / Settings / Sign out | 6–8 | Footer |
| Kiosk | 5 | Footer |
| Whole-app deprecate | — | **Do not cut** this pass |

### Overloaded / wide depth

Deep routes stay on **breadcrumbs**, not extra hamburger rows (DESIGN_GUIDE Wide vs deep). No drawer change for loan detail depth.

### Category map (proposed drawer IA)

```text
[ Page actions? ]          ← secondary, when registered
── Current app ──────────
Browse / Review / Capture / Configure   ← labeled groups
── separator ────────────
Other apps                 ← jump to peer homeHref only
── separator ────────────
Workspace: Kiosk, Help, Settings, Sign in/out
```

### Navigation budget

Each open still costs reorientation; **labels amortize scan cost** without extra hops. Counterintuitive: we add parent labels rather than only cutting — clearer categories beat a flatter dump (P&P case study).

## System design

### Overview

- **Shape:** Client menu reads shared `APP_SECTION_NAV` → filters visibility → groups → renders Popover rows. No server round-trip for IA.
- **Boundaries:** UI + docs only; routes/auth unchanged.
- **Failure:** Empty visible list for an app (shouldn’t happen) → empty scroll region; auth row still in footer.
- **Point to:** Sequence below; API/DB N/A.

### Concept 1 — Grouped panel

- **What:** `AppSectionNavPanel` iterates `appSectionItemsByGroup(visibleItems)`.
- **Why:** One code path for all four apps.
- **How:** Label each non-empty group; links keep existing `MoneyAppMenuNavLink`.

## Design patterns used

### Pattern 1 — Config-driven nav render

- **What:** Data owns groups; UI maps groups to labels.
- **How:** Reuse `appSectionItemsByGroup` + `APP_NAV_GROUP_LABELS`.
- **Why:** Unit-testable; no hard-coded Baby-only layout.
- **Best practices:** Don’t invent parallel group enums in the component.

### Pattern 2 — Context-first bands

- **What:** Current tasks → other places → workspace chrome.
- **How:** Existing separators; add Other apps label.
- **Why:** Matches DESIGN_GUIDE context-first menu + A2.

## Sequence diagram

```mermaid
sequenceDiagram
  participant U as User
  participant M as MoneyAppMenu
  participant N as app-section-nav
  participant R as Router

  U->>M: Open hamburger
  M->>N: resolveAppSectionFromPath + visibleAppSectionItems
  N->>M: items
  M->>N: appSectionItemsByGroup
  N->>M: groups
  M->>U: Render labeled groups + Other apps + footer

  U->>M: Tap section link
  M->>R: soft nav + deferMenuClose
  R->>U: Destination; menu closed
```

## API contracts

N/A — no public HTTP/GraphQL/server-action contract change.

## Database contracts

N/A — no schema/migrations/persistence query change.

## Example queries

N/A

## UI / UX / mobile

- **Build must match** `ui-refs/_proposed-drawer-baby.html` (size, positions, texts, chrome): group labels, Other apps, footer band, row hit size.
- #1 current-app groups always visible when open; #2 Other apps band; secondary page actions + footer.
- Mobile / `<lg` only for this drawer; desktop rail unchanged.
- Light/dark: existing tokens only.
- Skeleton: N/A for popover (no loading.tsx for menu); no CLS route skeleton change unless a menu shell skeleton appears (none today).
- a11y: keep link names; section labels are text, not required as landmarks; Workspace `aria-label` stays.

## Security (OWASP)

| ID | Topic | Notes |
|----|-------|-------|
| A01 | Broken access control | Nav links only; server still enforces workspace auth |
| A02 | Cryptographic failures | N/A |
| A03 | Injection | No new user HTML; labels from constants |
| A04 | Insecure design | No new trust boundary |
| A05 | Security misconfiguration | N/A |
| A06 | Vulnerable components | No new deps |
| A07 | Auth failures | Sign out/in unchanged |
| A08 | Data integrity | N/A |
| A09 | Logging failures | N/A |
| A10 | SSRF | N/A |

## Aggressive challenges

| Challenge | Response |
|-----------|----------|
| Labels add noise | A2 approved; P&P prefers clearer parents over flat dump |
| DESIGN_GUIDE forbade headers | Update guide in same change — assessment complete |
| Should cut Baby capture rows | No — high utility; amalgamate via groups not delete |
| Dual MoneyAppMenu mounts | Existing e2e helper already handles; don’t change open store |

## Docs to update

- `docs/DESIGN_GUIDE.md` Navigation assessment: allow task-group labels; align order prose with `APP_NAV_GROUP_ORDER`.
