# Code review log

**Overall Result:** clean  
(file-top alone never pays Review clean)

## Adversarial

**Result:** clean

- GraphQL 17 dual CJS/ESM hazard addressed via `makeExecutableSchema` + Yoga `getEnveloped` test helpers; production `yoga.fetch` stays on Yoga’s instance.
- Unused removals (`rate-limiter-flexible`, `d3-shape`) backed by package.json assertions; no dynamic-import false positives found.
- `maskedErrors` now production-only — clearer test/dev errors; prod still masks.
- Armor peers resolved via graphql override to 17; graphql-request peer warning absorbed by override.
- No Critical/Major for this uplift.

## Quality

**Result:** clean

- Bump order matches Design (GraphQL → Next → rest → unused).
- Planned tests present and green; verify bar green.
- eslint: new react-hooks compiler rules from Next 16.4 set to warn (documented) until a dedicated cleanup; prefer-const e2e fix included.
- `@graphql-tools/schema` added as direct dep for stable schema construction.
- No Critical/Major.

## Merged

**Result:** clean

Adv + Quality clean. Lens api + db both clean (merge-findings). No open Critical/Major across review or lenses.
