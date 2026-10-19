# ADR-006: Retired /kiosk redirects permanently to Money home

**Status:** Accepted · **Date:** 2026-10-19

Kiosk (and kiosk-only weather) is fully removed. Old bookmarks must not 404 or open Add transaction. We chose permanent redirects of `/kiosk` and `/kiosk/:path*` to `/money` (Money shell home / registry href), matching other retired URL moves in `next.config.ts`. Rejected `/money/new` (root entry is a write form, not Money home) and temporary redirects (the feature will not return). Supersedes ADR-003, ADR-004, and ADR-005 — layout/widget/inject prefs no longer exist.
