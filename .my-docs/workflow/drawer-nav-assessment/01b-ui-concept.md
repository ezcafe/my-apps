# UI concept: drawer-nav-assessment

**Result:** done

## Primary surface

Mobile shell hamburger drawer (`MoneyAppMenu`) — phone / `<lg` viewport. Example context: **Baby Care** (longest section list).

## Align with Gate A (80/20)

| Item | From 01a / idea | How concept honors it |
|------|-----------------|------------------------|
| #1 always visible | Current-app destinations | Grouped list first (Browse → Review → Capture → Configure) |
| #2 always visible | Other apps jump | Short “Other apps” band after separator |
| Secondary | Page actions, Help, Kiosk, Settings, Sign out | Optional page-actions top; Workspace footer |
| Journey | Open → current group → tap | No flat dump; group labels reduce scan cost |

## Chrome source of truth

| Element | Real labels / behavior |
|---------|------------------------|
| Trigger | `Open {app} menu` / icon button `size-10` |
| Panel | Popover, `max-h ~70dvh`, `min-w ~20rem`, `p-1.5`, scroll body + sticky-feel footer |
| Baby items | Home, Insights, Activities, Log feed/pump/nap/diaper/growth, Settings |
| Other apps | Money, Investments, Loans (when on Baby) |
| Workspace | Kiosk, Help, Settings, Sign out |
| Tokens | quiet/teal, `radius-sm` rows, muted section labels |

## Proposed delta (vs today)

| Today | Proposed |
|-------|----------|
| Flat current-app list (no group labels) | Same links, ordered by `APP_NAV_GROUP_ORDER`, with **Browse / Review / Capture / Configure** labels |
| Other apps unlabeled band | Explicit **Other apps** section label |
| Groups exist only in `lib/app-section-nav.ts` | Groups visible in drawer UI |
| Desktop rail unchanged in this HTML | Design pass: rail label/order sync; HTML focuses drawer |

## ui-refs

| File | Source | Preview URL |
|------|--------|-------------|
| `ui-refs/_proposed-drawer-baby.html` | html-prototype | http://127.0.0.1:8765/_proposed-drawer-baby.html |

**Fidelity checklist:** size (phone + popover scale), positions (bands/order), texts (exact product labels), chrome (quiet tokens, row shape). Delta = group labels + Other apps label only.

## Out of concept

- Global search in drawer
- Splitting products
- Reworking every in-page layout
- Changing route URLs
