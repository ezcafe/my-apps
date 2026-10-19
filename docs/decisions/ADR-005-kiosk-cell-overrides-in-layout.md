# ADR-005: Kiosk cell overrides nest in kiosk_layout

**Status:** Superseded by [ADR-006](ADR-006-kiosk-removed-redirect-money.md) · **Date:** 2026-10-19 · **Superseded:** 2026-10-19

Per-cell Resize and Source prefs must persist with the same authenticated preferences PATCH as board chrome (ADR-003). We chose to nest cell overrides (size token + 1–3 same-topic source ids, keyed by registry widget id) inside the existing `kiosk_layout` jsonb rather than add a `kiosk_cells` column, so Settings and `/kiosk` stay one object and migration stays a type/Zod extend. Rejected a separate column because it splits the board prefs story for little gain while the jsonb column already holds layout flags (including ADR-004 inject).
