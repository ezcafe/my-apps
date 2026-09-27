# UI concept: chart-interaction-parity

**Result:** done  
**Updated:** 2026-09-27  
**Tier:** lean  
**Preview:** `http://127.0.0.1:8765/_proposed-chart-interactions.html`

## Alignment

| Source | Honored? |
|--------|----------|
| Gate A 80/20 | yes — hover / legend toggle / modal drill; secondary in modal |
| `02-skim.md` | yes — reuse ChartShell, ChartLegendList, Money modal chrome |

## Primary surface

One Insights chart card (Money-like chrome) showing the three deltas other domains must match:

1. **Hover tooltip** — floating label + value near pointer  
2. **Legend toggle** — pressed = visible; muted + strike = hidden  
3. **Click → drill modal** — title for slice; filtered table; Close / optional Open detail  

## Visual rules (Build must match)

- Card: `rounded-[var(--radius-md)]`, hairline border, quiet surface  
- Legend rows: `rounded-[var(--radius-sm)]`, color dot + label + value  
- Modal: existing Modal pattern (title, table, footer actions)  
- No new chart types or card reorder  

## HTML ui-refs

| File | URL |
|------|-----|
| `ui-refs/_proposed-chart-interactions.html` | `http://127.0.0.1:8765/_proposed-chart-interactions.html` |

## Out of concept (Analyze/Design)

- Exact Loans/Investments/Baby row columns  
- Whether pattern-finder gets click this pass  
- New GQL fields vs client compose for Loans installments  
