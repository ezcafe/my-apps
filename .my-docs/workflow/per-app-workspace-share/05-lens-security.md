# Security lens: per-app-workspace-share

**Result:** clean
**Updated:** 2026-09-21

| OWASP | Status | Note |
|-------|--------|------|
| A01 | pass | Owner-only member APIs; app grant on Money/Baby/active/list |
| A02 | N/A | |
| A03 | pass | Zod + Drizzle |
| A04 | pass | Fail closed without grant |
| A05 | pass | same-origin CSRF |
| A06 | N/A | |
| A07 | pass | Session required |
| A08 | pass | Tx membership+grants |
| A09 | pass | Rate-limit; avoid logging raw email at info |
| A10 | N/A | |

Source: https://owasp.org/Top10/
