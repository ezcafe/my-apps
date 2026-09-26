# Analysis: drawer-nav-assessment

**Has API recommendation:** no  
**Has DB recommendation:** no

## Overall — What / Why / How

### What is this?
Finish the long-nav assessment for the mobile shell drawer (`MoneyAppMenu`): surface task groups that already exist in `APP_SECTION_NAV`, label **Other apps**, keep workspace footer secondary — match approved Gate A2 HTML.

### Why do we need this?
Drawer is a flat long list (Baby especially). Users pay navigation-budget cost on every open. Groups + helpers exist (`appSectionItemsByGroup`, `APP_NAV_GROUP_LABELS`) but UI ignores them. DESIGN_GUIDE already cites P&P long-nav but still says “no intermediate subtitle headers” — that conflicts with approved A2.

### How to do this?
Render current-app items via `appSectionItemsByGroup` + group labels; add “Other apps” section label; update DESIGN_GUIDE clean-hierarchy rule; unit tests on grouping/order; e2e still open menu and hit same links. Desktop rail stays icon list (no group labels).

**Other ways:** Flat reorder only (fails A2); mega accordion of apps (heavier); search-as-nav (DESIGN_GUIDE forbids).  
**Best practices:** Repo `appSectionItemsByGroup`; P&P long-nav (inventory → amalgamate mental model → clearer parents); DESIGN_GUIDE context-first menu.

## Solution pieces

### 1. Grouped current-app panel in `MoneyAppMenu`

##### What is this?
Replace flat `AppSectionNavPanel` map with grouped sections using existing helpers/labels.

##### Why do we need this?
This is the A2 delta. Skipping leaves flat scan cost.

##### How to do this?
`visibleAppSectionItems` → `appSectionItemsByGroup` → `MenuSectionLabel` + links per group. Order = `APP_NAV_GROUP_ORDER` (browse → review → capture → configure). Keep `showAppHeading` false for current app (groups replace app title).

**Alternatives:** Invent new group names (reject — data already there); CSS-only visual dividers without labels (weaker mental model).

### 2. “Other apps” label + footer unchanged

##### What is this?
Label the peer-app jump band; keep Workspace footer (Kiosk, Help, Settings, auth).

##### Why do we need this?
Separates place (apps) from tasks (current app) — P&P category map.

##### How to do this?
`MenuSectionLabel` in `OtherAppsJumpLinks` (or wrapper). Exact copy: **Other apps**.

### 3. DESIGN_GUIDE + tests

##### What is this?
Align docs with labeled groups; unit/e2e coverage.

##### Why do we need this?
Avoid doc/code drift; prevent flat-list regression.

##### How to do this?
Update “Clean hierarchy” / item-order rows in DESIGN_GUIDE Navigation assessment. Extend `lib/app-section-nav.test.ts`; soft-assert group labels in one baby hamburger e2e if cheap.

## Navigation Assessment notes (for Design)

| Framework step | Finding (this product) |
|----------------|------------------------|
| Persona inventory | Full-access owner sees Money/Investments/Loans/Baby + shell. Day-to-day often one app. |
| Low-value rank | Optional Money tabs already off by default (good cut). No whole-app cut this pass. Capture logs earn rows (Baby). One-action pages already use heading CTAs — keep. |
| Overloaded pages | Not drawer’s job; breadcrumbs for depth (DESIGN_GUIDE Wide vs deep). |
| Categories | Keep four task groups; **show labels** (A2). Other apps = jump only. Footer = workspace. |
| Navigation budget | Group labels reduce reorientation cost without adding hops. |
| Controversial | Search out; no product split; place vs flow OK (footer secondary). |

## Decision lean (for Design)

| Approach | Note |
|----------|------|
| Render existing groups + Other apps label | Prefer — matches A2; smallest change |
| Flat reorder only | Reject vs A2 |
| New IA / cut apps | Out of scope this pass |

## Reusable patterns

| Pattern | Where | Why |
|---------|-------|-----|
| `appSectionItemsByGroup` | `lib/app-section-nav.ts` | Already unit-tested shape |
| `MenuSectionLabel` | `money-section-tabs.tsx` | Same chrome as today |
| `openAppMenu` | `e2e/helpers/shell.ts` | Keep hamburger e2e green |
| DESIGN_GUIDE long-nav table | `docs/DESIGN_GUIDE.md` | Update subtitle rule |

## System shape candidates

| Shape | Why |
|-------|-----|
| Client-only menu render | No API/DB; config already client/shared module |
| Rail unchanged | Icons remain shell registry; groups are drawer-only |

## Constraints and risks

- Gate A2 HTML is visual SoT — Build must match group order/labels.
- DESIGN_GUIDE currently forbids subtitle headers — must update in same change.
- Baby e2e asserts many hamburger paths — labels must not break link roles/names.
- `APP_NAV_GROUP_ORDER` is browse→review→capture→configure; DESIGN_GUIDE prose “Review → Capture → Browse…” is stale — reconcile to code order.

## Settled

- Gate A2: grouped Baby drawer HTML approved
- Has API no / Has DB no
- Group labels visible; Other apps labeled; footer secondary
- Desktop rail: no group headers this pass

## Open questions

- None blocking Design (rail sync = labels/href order only if drift; groups drawer-only).

## Clear enough to design?

yes
