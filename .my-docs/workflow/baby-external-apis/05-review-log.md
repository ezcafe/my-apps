# Code review log: baby-external-apis

**Result:** clean (lite main-thread — Task usage limit)
**Updated:** 2026-09-22
**SPM plan:** api + db + security

## Adversarial

| Severity | Finding | Suggestion |
|----------|---------|------------|
| Nit | No HTTP e2e create-token → Baby GQL | Manual after migrate; optional follow-up e2e |

## Quality

Aligns with design Option 2 + `mny_`. Settings checkboxes match 01b. Docs updated.

## Merged SPM

### API (`05-lens-api` inline)

- Contract: `apps[]` on create; grant gates on resolvers; legacy `appKey` alias OK.
- Errors unchanged GraphQL codes.

### DB (`05-lens-db` inline)

- Additive `apps` jsonb + backfill SQL. Keep `app_key` for `mny_` lookup.

### Security

- Per-app membership assert on create; baby-only token cannot open Money/Investment; write scope still required.

## Fix ask

(none)

## Round notes

Smoke-pass → review clean → proceed Gate C when full test profile satisfied (unit already green; e2e optional).
