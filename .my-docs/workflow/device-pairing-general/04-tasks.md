# Tasks: device-pairing-general

**TDD:** Red tests first per task. Prefer unit; e2e when UI wiring.

## Task 1 — Migration + schema apps/scopes (S)

**Acceptance:**
- `watch_pairing_code.apps` and `.scopes` jsonb not null
- Migration `0045_*` + journal; Drizzle schema updated
- Existing rows get DEFAULT apps `["baby"]` and scopes `["read","write"]` (safe backfill)

**TDD:**
- Schema/migration SQL test or journal presence test (match repo style)

## Task 2 — Mint/redeem service + validators (M)

**Acceptance:**
- Mint requires ≥1 shareable app; stores apps/scopes
- Redeem creates token with stored apps/scopes and name `API pairing · …`
- No auto-revoke of prior tokens
- Assert baby/money access for selected apps

**TDD (red first):**
- Unit: mint rejects empty apps
- Unit: mint throws FORBIDDEN when app access assert fails for a selected app
- Unit: redeem uses stored apps/scopes (mock deps)
- Unit: createWatchToken receives expected name pattern / apps
- Unit: redeem does **not** auto-revoke prior tokens (revoke deps unused / not called)

## Task 3 — API routes mint body (S)

**Acceptance:**
- `POST /api/watch/pair` parses apps/scopes; 400 on bad body
- Redeem unchanged request shape

**TDD:**
- Validator unit: empty apps / unknown app key fail
- Validator unit: `apps: ["money"]` + `scopes: ["read"]` pass
- Validator unit tests for mint schema

## Task 4 — Settings UI pairing general + remove create form (M)

**Acceptance:**
- No TokenCreateForm / Create token button
- Pairing section: general title/copy; app checkboxes; write checkbox; Generate disabled without apps
- After mint: show code; **Reveal on this device** redeems and shows `mny_…` once (modal)
- Copy warns code is **one-time** (Reveal or Watch — first wins)
- After successful Reveal: hide/disable Reveal; show code as used / clear mint state appropriately
- Token list + revoke remain
- Skeleton parity if settings loading mirrors this block

**TDD:**
- Component source/contract tests (existing watch-pairing-settings.test style)
- Source: `api-token-settings` has no Create token / TokenCreateForm
- Source: pairing card includes one-time warning and Reveal control testid
- Optional e2e: generate with baby selected (lite profile — add if tasks require)

## Task 5 — Docs (S)

**Acceptance:**
- `docs/BABY_API.md` (and help snippets if mirrored): pairing primary for all clients; apps selection; prefer over POST /api/tokens UI
- Light MyBaby README wording if it says Watch-only Baby grant

**TDD:**
- Doc assertion test if repo has hardening-docs / BABY_API tests

## Task order

1 → 2 → 3 → 4 → 5 (4 can parallel 5 after 3)
