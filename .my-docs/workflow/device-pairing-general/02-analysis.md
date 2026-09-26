# Analysis: General device pairing (replace manual token create)

**Result:** done  
**Note:** main-thread fallback — usage limit after Task retry. Simple mode (no skim/01b).

## Deep dive (required)

### Overall

#### What is this?
Make **short-code pairing** the only Settings way to mint API credentials for any client (Watch, scripts, web tools). Remove the manual Create token form. Before Generate code, user picks apps (Money / Baby Care) and access options.

#### Why do we need this?
Two create paths confuse users; Watch pairing is Baby-only; scripts still need the long form. One pairing flow covers all clients with explicit app grants.

#### How to do this?
- Extend mint body with `apps` (+ `scopes` / write flag); persist on pairing row; redeem creates `mny_…` with those grants.
- Generalize Settings card copy; merge app pickers into pairing UI; drop `TokenCreateForm`.
- Keep token list + revoke.
- **Other ways:** Keep both forms (rejected — ask removes create form); mint returns `mny_…` directly without code (loses Watch typing path).
- **Best practices:** Reuse `createApiTokenForUser`, `SHAREABLE_WORKSPACE_APP_KEYS`, hash codes, TTL, rate limits, same-origin mint.

### Solution pieces

#### 1. Persist apps (+ scopes) on pairing code (DB)

##### What is this?
Store selected apps (and read/write scopes) on `watch_pairing_code` at mint; redeem reads them when creating the token.

##### Why do we need this?
Today redeem hardcodes `apps: ["baby"]`. Without columns, Money/multi-app cannot work.

##### How to do this?
- Add `apps` jsonb + `scopes` jsonb (or text[]) on `watch_pairing_code`; migration `0045_…`.
- **Other ways:** encode apps in the code alphabet (fragile); separate mint endpoints per app (worse UX).
- Best practices: validate with `parseShareableWorkspaceAppKeys`; require ≥1 app.

#### 2. Mint / redeem API contract

##### What is this?
`POST /api/watch/pair` accepts `apps`, optional `workspaceId`, optional `scopes`; redeem creates token from stored grants.

##### Why do we need this?
UI and Watch/scripts share one contract.

##### How to do this?
- Extend `watchPairMintSchema`; service insert/redeem use stored apps/scopes.
- Token name: see Decision 1 (provisional).
- Auto-revoke prior same-name tokens: see Decision 2.
- **Keep** `POST /api/tokens` for now (API/scripts); **remove UI only** — or Design may deprecate later.
- Best practices: assert workspace access for each selected app; same OWASP as current pair routes.

#### 3. Settings UI — general pairing + remove create form

##### What is this?
Rename Watch pairing → general pairing; app checkboxes (+ write) before Generate; remove `TokenCreateForm` / reveal-on-create modal from create path.

##### Why do we need this?
Matches Outcome; Money/Baby selection before mint.

##### How to do this?
- Move app/write (and optional workspace) controls into pairing card; keep list+revoke in `ApiTokenSettings`.
- **Web clients getting `mny_…`:** see Decision 3 — pairing only shows short code today; Watch redeems. Scripts/Postman need a redeem path or “use on this device”.
- Best practices: DESIGN_GUIDE; disable Generate until ≥1 app; skeleton parity if layout changes.

#### 4. Docs + light Watch copy

##### What is this?
Update `docs/BABY_API.md` and Settings/help text; MyBaby README if “Watch pairing” wording changes.

##### Why do we need this?
Docs still say Watch-only + Baby-only mint.

##### How to do this?
- Pairing primary for all clients; document apps selection; advanced paste remains on Watch.

## Decision candidates (for Design)

### Decision 1 — Token display name on redeem
- **Option 1:** Fixed name `API pairing` (or `Device pairing`)
- **Option 2:** `API pairing · <local datetime>`
- **Option 3:** Keep `Apple Watch` always (mismatches web/scripts)
- **Provisional recommendation:** Option 2 — readable in list; unique enough.

### Decision 2 — Revoke prior tokens on redeem
- **Option 1:** Stop auto-revoke; user revokes from list (multi-device friendly)
- **Option 2:** Keep revoke-by-fixed-name (one active pairing token)
- **Provisional recommendation:** Option 1 — general multi-client use.

### Decision 3 — How web/scripts get `mny_…`
- **Option 1:** “Reveal on this device” button — calls redeem with shown code, shows `mny_…` once (same as old modal)
- **Option 2:** Document only: scripts `POST /api/watch/pair/redeem` with the code
- **Option 3:** Mint also returns token to browser (breaks “code typed on device” model; weaker)
- **Provisional recommendation:** Option 1 + Option 2 docs — covers Postman and Watch.

### Decision 4 — Write checkbox
- **Option 1:** Keep Allow write (default on) like old form
- **Option 2:** Always read+write
- **Provisional recommendation:** Option 1.

## Reusable patterns (prefer in Design)

| Pattern | Path | Use for |
|---------|------|---------|
| App checkboxes + write | `components/api-token-settings.tsx` | Move into pairing card |
| Pairing card | `components/watch-pairing-settings.tsx` | Rename/generalize |
| Mint/redeem service | `lib/watch-pairing-service.ts` + `watch-pairing-db.ts` | Persist apps/scopes |
| Token create | `lib/api-token-service.ts` | Redeem creates token |
| Shareable apps | `lib/workspace-shareable-apps.ts` | Validate apps |
| Validators | `lib/validators/watch-pair.ts`, `api-token.ts` | Mint body |

## System shape candidates

1. **Settings (session)** → mint with apps → DB row → client redeem → `api_token` row → Bearer on GraphQL/REST.
2. Unchanged auth enforcement via existing token apps/scopes checks.

## Has API / Has DB

| Flag | Recommendation | Why |
|------|----------------|-----|
| **Has API** | **yes** | Mint body + docs; optional reveal = same redeem |
| **Has DB** | **yes** | New columns on `watch_pairing_code` |

## Risks

- Breaking Watch if redeem still expects Baby-only without UI selecting baby by default.
- Orphan tokens if we stop auto-revoke (mitigate: clear list UI).
- Leaving `POST /api/tokens` may confuse API docs vs UI — note in docs “prefer pairing”.

## Open questions (non-blocking — Design uses provisional picks)

1. Confirm Decisions 1–4 provisional recommendations.
2. Optional table rename `watch_pairing_code` → `device_pairing_code` this pass? **Recommend no** (keep table name; change UI copy only).

## Clarity check

Instructions are clear enough to design with provisional Decisions 1–4. Parent may lock those at Design without another user pause unless rejected.
