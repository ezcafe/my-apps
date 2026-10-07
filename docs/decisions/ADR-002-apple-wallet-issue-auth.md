# ADR-002: Apple Wallet pass issue auth

**Status:** Accepted · **Date:** 2026-10-05

Pass download must be owned by a signed-in user, but QR Add often happens on another device without that session cookie. We chose session-authenticated Add-on-this-device plus a short-lived issue token in the QR URL. Rejected always-token (worse one-tap UX) and public unauthenticated issue (wrong for multi-user workspaces).
