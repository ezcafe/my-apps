# ADR-001: Apple Wallet as a shared parallel notify channel

**Status:** Accepted · **Date:** 2026-10-05

my-apps needs PassKit issue, web service, and APNs for Telegram-like lock-screen alerts, but Baby is only the first event source and shell Settings owns subscribe UI. We chose a shared `lib/apple-wallet` (thin `app/api/apple/**`) with per-user workspace subscribers: one serial per `(workspace, user)`, multi-device via registrations, and workspace-level latest message text with a subscriber `updatedAt` bump on each notify. Rejected Baby-only nesting (Settings would call into Baby; reuse harder) and per-subscriber latest copies (same event text for all caregivers). Grill Round 1 settled this grain; Gate B still approves the full design package.
