# Idea: General device pairing (replace manual API token create)

## Problem

Settings has two ways to get API credentials: a long **manual Create token** form and a **Watch pairing** short code that only grants Baby. Users who want Money (or both) still use the hard form. Pairing is labeled Watch-only even though the same code exchange works for any client.

## User / audience

Workspace owners who connect Apple Watch, scripts, web tools, or other devices via API tokens.

## Outcome

- Manual **Create API token** form is removed from Settings.
- One **pairing** section (general wording, not Watch-only) is the way to mint a short code.
- Before **Generate code**, the user selects apps (Money / Baby Care, at least one) and any needed access options (e.g. write).
- Redeeming the code creates a normal `mny_…` API token with those grants for Watch, web, or other clients.
- Token list + revoke remain.

## Metric

User can mint a pairing code with Money-only, Baby-only, or both; redeem yields a token with matching apps; Settings no longer offers the manual create form.

## Has UI

**yes**

## Lean / skip hints

- **Lean UI concept?** yes (simple mode skipped A2)
- **Copy/token-only?** no — layout + controls change

## 80/20 UI (day-to-day)

### Main user goals

1. Pick which apps the new token may access.
2. Generate a short code; copy/enter it on the client.
3. See existing tokens and revoke them.

### Must-have controls

- App checkboxes (Money, Baby Care) — at least one required
- Generate code button (disabled until valid selection)
- Shown code + expiry
- Token list + revoke (keep)

### Out of day-to-day UI

- Manual name/workspace/create form fields (removed; workspace can default or stay as a light selector if needed)
- Advanced CSRF/rate-limit internals

## Scope

- Settings API tokens tab: remove create form; generalize pairing card; app (and read/write if kept) pickers before generate
- Mint API: accept selected apps (+ scopes); persist on pairing row until redeem
- Redeem: create token with stored apps/scopes; generalize token naming
- Docs (`BABY_API.md` / help) and light Watch copy if labels change
- Keep list + revoke

## Non-goals

- New client UIs outside Settings (Watch app UI redesign beyond copy if any)
- Changing how GraphQL/REST authorize existing tokens
- Per-device management beyond revoke-by-name / list
- Adding non-shareable apps beyond Money / Baby

## Risks / open questions

- Token name: keep `Apple Watch` vs generic name (e.g. `API pairing` / user-visible label) when used by web scripts
- Whether workspace selector stays on pairing card or always uses default workspace
- Whether read/write checkbox stays (old form had it) — user asked for Money/Baby; Design decides
- Migration: store apps (and scopes) on `watch_pairing_code` (or rename table later — optional)
