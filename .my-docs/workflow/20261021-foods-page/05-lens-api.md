# Lens

**Lens:** api  
**Result:** clean

## Findings

| Severity | Area | Finding | Suggestion |
|----------|------|---------|------------|
| — | CSRF | Same-origin on POST/PATCH/DELETE + analysis/retry | Applied |
| Enhancement | Idempotency | Create not Idempotency-Key protected | OK for log UX (duplicates allowed) |
| Nit | Errors | Uses `{ error, code, details? }` via api-http | Matches repo |

## API checklist

| Item | Pass |
|------|------|
| Typed I/O (Zod) | yes |
| One error shape | yes |
| Edge validation | yes |
| Bounded lists (`from`/`to`) | yes |
| Naming | yes |
| Auth / workspace scope | yes |
| Design match | yes |
