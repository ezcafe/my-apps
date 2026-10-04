# Code review: money-new-vnd-amount-suggestions

**Review profile:** lite  
**SPM plan:** none

## Adversarial test review

**Result:** clean

| Check | Note |
|-------|------|
| Helper units real | Append / strip / empty / successive — assert outputs |
| Parse trap locked | `25.000` → 25 documented |
| Form wiring | Source contract for import + titles + suffixes — not mock theater |
| Gaps | No Critical/Major |

**Fix ask:** none

## Quality review

**Result:** clean

| Check | Note |
|-------|------|
| Design UI locks | Labels `000` / `000.000`; hint; dashed chips; a11y group |
| Idea #1/#2 | Amount + VND shortcuts while typing |
| System design | Pure helper + recentSlot branch |
| Skeleton | No layout section added — CLS N/A |
| Nit | `recentSlot` IIFE is a bit dense — Enhancement, deferred (lite) |

**Fix ask:** none (Enhancement deferred)

## Merged SPM

N/A — SPM plan none

## Round notes

- main-thread fallback — adversarial + quality (usage limits on Tasks)
- Smoke was smoke-pass before this review
