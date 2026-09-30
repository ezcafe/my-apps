# Grill: deps-uplift-latest

**Result:** frontier-empty  
**HITL:** auto · user-first picks  
**Mode:** simple

## Round 1 — frontier

❓ **Q1** — **Fresh Next 16.3.7 family this run?**  
Include `next` / `eslint-config-next` / `@next/bundle-analyzer` / `@next/swc-darwin-arm64` even though latest is <1 week old?

➡️ Recommended: **yes** — user-first: framework patches reduce known bugs/security lag; keep Next family version-aligned.

❓ **Q2** — **Defer majors this run?**  
Defer `graphql` 17, `graphql-scalars` 2, `dotenv` 18, and `pnpm` 10→12?

➡️ Recommended: **yes defer** — user-first: keep the common path green; majors need separate migration PRs with guides.

❓ **Q3** — **React 19.3 + Zod 4.6 + matching types?**  
Bump with the stale safe set?

➡️ Recommended: **yes** — user-first: same major lines; Zod 4.6 is additive/fixes (primary notes); React types must match.

### Auto-picks (user-first)

- Q1 yes — framework health before strict age gate  
- Q2 defer majors — avoid breaking GraphQL stack / tooling in one ops PR  
- Q3 yes — stay current on intended majors  

Logged: `auto-pick — Grill Q1–Q3 — user-first: ship safe + Next/React/Zod; system: one lockfile PR, majors later`

## Scenario stress-test

1. **Wrong latest tag:** bumping `next-auth` to npm latest v4 would downgrade Auth.js v5 beta → **exclude**; stay on `5.0.0-beta.*`.
2. **Next/SWC skew:** bumping `next` without `@next/swc-darwin-arm64` → optional native mismatch → **keep versions equal**.
3. **Zod 4.6 lazy error maps:** code that mutates `z.config()` between `safeParse` and reading `.error` could change messages → **smoke unit**; no intentional API use of that pattern expected.

## Glossary / ADR

- **ADR skipped** — reversible version pins; not surprising architecture.
- Glossary: no new project domain terms.

## Settled (for Design)

| Item | Choice |
|------|--------|
| Stale safe patch/minor set | uplift |
| Next 16.3.7 family + fresh same-major minors (react-query, csv-parse, `@types/node`) | uplift |
| React 19.3 + `@types/react*` + Zod 4.6 | uplift |
| graphql 17 / graphql-scalars 2 / dotenv 18 / pnpm 12 | **defer** (non-goals) |
| next-auth | stay v5 beta |
| Has API / Has DB | no / no |
