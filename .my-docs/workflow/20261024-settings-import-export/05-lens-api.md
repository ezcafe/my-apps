# Lens: API (settle-gen:1)

**Result:** clean  
**Updated:** 2026-10-26

## Checklist

| Item | Verdict |
|------|---------|
| Path contracts `/export/all`, `/import/all/preview\|commit` | Pass — static `all` routes; `all` ∉ kind enums |
| Error shape `export_too_large` / flat `{ error, code }` | Pass |
| Idempotency-Key on Import-all commit | Pass — Money/Baby/Loans |
| Auth: read export / write import + CSRF | Pass |
| Investments Export all only (no ZIP import) | Pass |
| Hyrum: no second Export-all path | Pass |

## Findings

None Critical/Major.
