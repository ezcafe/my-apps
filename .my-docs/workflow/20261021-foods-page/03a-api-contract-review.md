# API contract review: 20261021-foods-page

**Result:** clean  
**Round:** 1  
**Updated:** 2026-10-21

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| Enhancement | contracts | POST create response bundles `{ entry, analysis }` — document `analysis.status` discriminated union (`ok` \| `error`) so UI can branch without guessing. | Add response Zod / TS type in Build T4. |
| Enhancement | practice | LLM is untrusted third party — validate/parse with Zod; never return raw model text as HTML. | Already implied in Design AI module; keep in T2 tests. |
| Nit | naming | Paths `/api/foods/entries` plural — matches REST plural nouns. | — |

**API checklist:** typed I/O · one error shape · edge validation · pagination · additive fields · naming · idempotency · matches repo patterns

**Checklist notes (pass / gap):**

- **Typed I/O:** pass — Design lists methods + payloads; Zod at route edge (T1/T4).
- **One error shape:** pass — match existing feature routes (401/403/404/422); no stack traces.
- **Edge validation:** pass — foodType preset allowlist; mealSlot enum; note max length (Build: e.g. 280).
- **Pagination:** pass for v1 — calendar `from`/`to` date range bounds list (not unbounded).
- **Additive fields:** pass — greenfield.
- **Naming:** pass — camelCase JSON; plural resources.
- **Idempotency:** Enhancement deferred — create is not idempotent by key; acceptable for log UX (duplicate taps = two entries, allowed by D1).
- **Auth / ownership:** pass — `requireFoodsContext`; entry updates scoped by workspaceId.
- **LLM failures:** pass — D2: HTTP 200 on entry save with `analysis.status=error`; dedicated retry route.
- **Repo patterns:** pass — thin `app/api/foods/**` → `features/foods/server`.
- **Tasks catch mistakes:** pass — Planned tests cover schema, auth, parse, e2e mock LLM.

## Fix ask for my-dev-flow-design

(none)

## Deferred Enhancements (do not block clean)

- Document analysis discriminated union on write responses.
- Optional Idempotency-Key for create if double-submit becomes a problem.

Zero Critical; zero open Major → **clean**.
