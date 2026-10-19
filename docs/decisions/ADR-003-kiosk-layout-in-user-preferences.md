# ADR-003: Kiosk layout prefs live in user_preferences

**Status:** Superseded by [ADR-006](ADR-006-kiosk-removed-redirect-money.md) · **Date:** 2026-10-13 · **Superseded:** 2026-10-19

Kiosk already persists widget on/off in `user_preferences.kiosk_widgets`, and layout (fullscreen vs grid columns + focus) is part of how the user watches the board across phone, tablet, and wall displays. We chose to store layout beside widgets via the same authenticated preferences PATCH (nested `kioskLayout`) so Settings and `/kiosk` stay one story. Rejected browser-local-only layout because device drift and Settings vs board mismatch would undermine the glance job; migration/API cost is accepted. Grill Round 1 settled this; Gate B still approves the full design package.
