# Analysis: settings-page-optimize

**Has API recommendation:** no  
**Has DB recommendation:** no

## Overall — What / Why / How

### What is this?
Shorten App Settings by making category nav a **real filter**: show one category body by default; show multiple only while searching.

### Why do we need this?
Sidebar already exists but `SettingsPageLayout` maps **all** `matchingCategories` (empty search = all). Users scroll a long wall (Account → Workspaces → API tokens…). Gate A2 approved single-pane.

### How to do this?
Change visible-section logic in shared `SettingsPageLayout`. Keep hash + search. Update App Settings loading skeleton to one pane. Shared layout also fixes Money / Investments / Loans settings.

**Other ways:** Accordion on stacked page (weaker vs A2); App-Settings-only fork of layout (drift).  
**Best practices:** Progressive disclosure; nav selection = content filter (OS Settings / Stripe / Vercel patterns); DESIGN_GUIDE flat sections.

## Solution pieces

### 1. Visible sections in `SettingsPageLayout`

##### What is this?
Derive `visibleCategories`: if searching → matching list; else → `[activeCategory]` (or empty carefully).

##### Why do we need this?
This is the length fix. Skipping leaves sidebar as scroll-only chrome.

##### How to do this?
- Not searching + `activeCategory !== "all"` → render only that id’s section.
- Searching → current match list (may be many).
- Clear search → restore last concrete category (not `"all"`).
- Category click → set active + hash; drop need to scrollIntoView when only one pane (optional scroll to top of main).
- Hash on load → set active (already); remove/skip scroll-to-missing-siblings.

**Alternatives:** Keep all mounted + CSS hide (wasteful; hurts a11y). Lazy mount only active (same UX as filter).

### 2. Skeleton parity (`settings/loading.tsx`)

##### What is this?
Loading UI still stacks many section skeletons.

##### Why do we need this?
CLS / DESIGN_GUIDE: loading must match live single-pane.

##### How to do this?
Sidebar + search + **one** content block (Appearance-shaped default). Same for other apps’ settings loadings if they stack all categories.

### 3. Tests

##### What is this?
Extend `settings.test.ts` / layout source tests for visible-category rules.

##### Why do we need this?
Prevent regress to “render all”.

##### How to do this?
Unit: pure helper `resolveVisibleSettingsCategories(...)` or source-contract tests on layout behavior; keep existing filter tests.

## Decision lean (for Design)

| Approach | Note |
|----------|------|
| Shared layout single-pane | Prefer — one fix, all consumers |
| Accordion stacked | Reject vs Gate A2 |
| App-only fork | Reject — drift |

## Reusable patterns

| Pattern | Where | Why |
|---------|-------|-----|
| `SettingsPageLayout` | `components/settings/` | Single place for IA |
| `filterSettingsCategories` | `settings-types.ts` | Search unchanged |
| Settings loading skeleton | `app/(shell)/settings/loading.tsx` | Parity |

## System shape candidates

| Shape | Why |
|-------|-----|
| Client layout state (active + search) | Already there; only render rule changes |
| No server/API change | Sections still SSR into props; client filters display |

## Constraints and risks

- Hash deep links must open correct category.
- Search “All matches” must still show multiple sections.
- Money/Investments/Loans inherit behavior — verify no consumer relied on “scroll past siblings.”
- In-section length (Workspaces, pairing) out of scope unless leftover after pane fix.

## Settled

- Gate A2: single-pane Appearance concept
- Has API no / Has DB no
- Scope: shared layout + App Settings skeleton (and sibling loadings if stacked)

## Open questions

- None blocking — Design locks shared-layout vs app-only if needed (recommend shared).

## Enough to design?

yes
