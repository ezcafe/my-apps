# Light repo skim: extract-reusable-code

**Result:** done
**Updated:** 2026-09-22
**Size:** keep ≤ ~40 lines (cap) — short tables (≤5 rows each)
**Purpose:** constraints only — ground Gate A2 / UI concept / Analyze in what already exists. Not a full analysis.

## Project shape (1–3 sentences)

Next.js app with shell + feature isolation (Money, Baby, Investments, Loans). Shared UI lives in `components/ui/` + DESIGN_GUIDE tokens; feature chrome and helpers often duplicate across `lib/*-app-header*`, skeletons, and `lib/api-*` context modules (some already share `lib/api-http`).

## Related existing UI / screens

| Path | What it does | Reuse? |
|------|--------------|--------|
| `components/ui/*` | Design-system primitives | Extend first |
| `lib/*-app-header.ts` | Per-feature header config | High dup candidate |
| `components/*-page-skeleton.tsx` | Feature loading shells | High dup candidate |
| `components/money-page-header.tsx` | Money page chrome | Pattern source |
| `docs/DESIGN_GUIDE.md` | Tokens, radii, motion | Must match |

## Related APIs / data

| Path or route | Notes |
|---------------|-------|
| `lib/api-http.ts` | Shared HTTP helpers (post-hardening) |
| `lib/api-{money,baby,investment,loans}.ts` | Feature context — similar shape |
| `lib/http-idempotency.ts` | Shared idempotency (do not re-litigate) |
| `docs/ARCHITECTURE.md` | Shell vs feature vs shared; pagination dialects stay separate |

## Hard constraints (do not fight)

1. DESIGN_GUIDE / clean-minimal — no new look; concentric radii; skeleton parity.
2. Feature isolation — no Money-only logic in fake “shared” modules.
3. Do not unify pagination dialects in this pass (ARCHITECTURE follow-up).
4. Sibling `app-api-db-hardening` is separate; do not block on its Gate C.

## Risks if we ignore the repo

- Invented UI mocks fail Gate A2; visual drift on extract.
- Over-abstract headers/skeletons break feature-specific CTAs.
- Touching public API contracts without setting Has API.

## Enough for UI concept / Analyze?

yes — lean UI concept: real screenshots of existing chrome (header + skeleton parity), not a new product screen.
