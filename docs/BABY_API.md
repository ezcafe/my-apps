# Baby Care API (for external / Watch clients)

Machine-oriented contract for clients that log baby activities (Apple Watch, companion apps, scripts).

**Source of truth in code**

| Concern | Path |
|---------|------|
| GraphQL schema | [`lib/graphql/baby-typeDefs.ts`](../lib/graphql/baby-typeDefs.ts) |
| HTTP entry | `POST` [`app/api/graphql/baby/route.ts`](../app/api/graphql/baby/route.ts) |
| Validators (Zod) | [`lib/validators/baby.ts`](../lib/validators/baby.ts) |
| Quick-care service | [`features/baby/server/quick-care.ts`](../features/baby/server/quick-care.ts) |
| Care events | [`features/baby/server/care-events.ts`](../features/baby/server/care-events.ts) |
| Payload types | [`db/schema/baby.ts`](../db/schema/baby.ts) |
| Web query documents | [`lib/baby-query-options.ts`](../lib/baby-query-options.ts) |

General money/automation API notes: [`docs/API.md`](API.md).

---

## 1. Endpoint

```http
POST {BASE_URL}/api/graphql/baby
Content-Type: application/json
```

- **POST only** (other methods → `405`).
- Body shape:

```json
{
  "query": "… GraphQL document …",
  "variables": { }
}
```

- `BASE_URL` = app origin (e.g. `https://your-app.example` or `http://127.0.0.1:3000`).
- Rate limit: ~60 req/min per user (`BABY_GRAPHQL_RPM` / `MONEY_GRAPHQL_RPM`).
- Response may include `x-request-id`. GraphQL errors put `extensions.requestId` and `extensions.code`.

There is **no** Baby REST resource tree for care logging. Use GraphQL.

---

## 2. Authentication

### Supported methods

| Method | Works for Baby? | Notes |
|--------|-----------------|-------|
| Browser session cookie + Baby workspace | **Yes** | Web UI |
| Bearer `mny_…` with **Baby Care** app grant | **Yes** | Settings → API tokens → toggle Baby (and/or Money) |
| Bearer without Baby grant | **No** | Money-only token cannot call Baby GraphQL |

### Create a token (pairing — preferred)

1. Sign in on a laptop → **Settings → API tokens**.
2. Under **Device pairing**, select apps (**Money** and/or **Baby Care**), optionally allow write, then tap **Generate code** (short code, ~10 minutes).
3. **Watch:** connect screen → enter the code → **Save & connect**.  
   **Scripts / this laptop:** tap **Reveal on this device** to get `mny_…` once (same one-time code).
4. Redeem is `POST /api/watch/pair/redeem` → `{ baseURL, token }`. Token name looks like **API pairing · …**; prior tokens are not auto-revoked (use the list to revoke).

### Advanced: paste URL & token on Watch

If you already have a Bearer token (e.g. revealed above), on Watch use **Advanced: paste URL & token**.

```http
Authorization: Bearer mny_<secret>
```

- Token is bound to one `workspace_id`.
- Mutations need the **write** scope.
- Session GraphQL still needs matching `Origin` (CSRF). Bearer skips Origin checks.
- Pairing mint: `POST /api/watch/pair` with `{ "apps": ["baby"], "scopes": ["read","write"] }` (session, same-origin). Redeem: `POST /api/watch/pair/redeem` (public, rate-limited). Grants come from the code row, not the redeem body.
- `POST /api/tokens` still exists for automation; Settings UI uses pairing only.

### Implication for Apple Watch

Prefer **pairing code** so you do not type long URLs or secrets on the Watch. Do not rely on session cookies from the Watch alone.

---

## 3. Workspace model

- App key: `"baby"`.
- One **baby profile per workspace** (`ensureBabyProfile` / `babyProfile`).
- Session callers resolve workspace via Baby workspace cookie / user default ([`lib/workspace-baby.ts`](../lib/workspace-baby.ts)).
- Bearer callers use the token’s bound `workspace_id` when the token’s `apps` grant includes `baby`.

Always call `ensureBabyProfile` once after auth if you create events (web home does this implicitly via services).

---

## 4. What Watch should call (80/20)

Prefer the **home quick path** (same as `/baby` web home):

| Goal | Operation |
|------|-----------|
| Status (last feed/sleep/diaper, open nap, bottle chips) | Query `babyHomeQuickStatus` |
| Log breast / formula / pump amount / sleep toggle / diaper | Mutation `babyQuickCare` |
| Open nap only | Query `babyOpenSleep` |

Optional **simple form** mutations (detail pages):

| Goal | Operation |
|------|-----------|
| One-shot feed | `createBabyFeed` |
| One-shot diaper | `createBabyDiaper` |
| Start / end sleep | `startBabySleep` / `endBabySleep` |

Skip for a minimal Watch MVP: growth, vaccines, Telegram, Insights series.

---

## 5. Time and day window rules

- All optional timestamps are **ISO-8601 with offset** (Zod `datetime({ offset: true })`).
  - Good: `2026-09-22T20:15:00.000+07:00`
  - Bad: `2026-09-22T13:15:00.000Z` is OK (Z is an offset); bare `2026-09-22` is **not** OK for event times.
- `birthDate` on profile is a **calendar date string** (`YYYY-MM-DD`), not a datetime.

### `babyHomeQuickStatus` day window

Half-open local calendar day:

- `dayFrom` = local midnight  
- `dayTo` = next local midnight  
- Window must be ≤ ~26 hours and `dayFrom < dayTo`

Helper used by web: [`lib/baby-home-day-window.ts`](../lib/baby-home-day-window.ts) → `babyLocalDayWindow(now)`.

### Quick-care time truth table

| Action | `occurredAt` | `endedAt` |
|--------|--------------|-----------|
| `FORMULA` / `PUMP_AMOUNT` insert | used if set, else server now | ignored |
| `BREAST` timer save (duration leg) | server now (do not rely on client backdate) | ignored |
| `DIAPER` | used if set, else now | ignored |
| `SLEEP` **start** | used if set, else now | ignored |
| `SLEEP` **end** | ignored | used if set, else now |
| Auto `endNap` before another action | — | `endedAt` else `occurredAt` else now |

---

## 6. Enums and payloads

### Care event `type`

`feed` | `diaper` | `sleep`

### Feed `method` (create / payload)

`breast_l` | `breast_r` | `formula` | `pump` | `pump_l` | `pump_r`

Rules:

- `pump_l` / `pump_r` → `durationSec` required  
- `pump` (amount) → `amountMl` required  
- Optional `legs[]` for multi-part sessions (max 8)

### Diaper

| Field | Values |
|-------|--------|
| `kind` | `wet` \| `dirty` \| `mixed` \| `dry` |
| `color` | `yellow` \| `brown` \| `green` \| `black` \| `white_pale` \| `red_bloody` |
| `texture` | `soft` \| `seedy` \| `mushy` \| `watery` \| `hard` \| `formed` |
| `amount` | `smear` \| `medium` \| `blowout` |

`color` / `texture` / `amount` only for `dirty` or `mixed`. On `babyQuickCare` dirty/mixed, if amount omitted the **server writes `medium`**.

### Quick-care action `kind`

`BREAST` | `FORMULA` | `PUMP_AMOUNT` | `SLEEP` | `DIAPER`

Timer `side` values: `breast_l` | `breast_r` | `pump_l` | `pump_r` | `pump_both`  
(`pump_both` is a client timer side; amount pump uses `PUMP_AMOUNT` + `amountMl`.)

### Event `source`

Persisted as `web` | `telegram` only today. External/Watch callers still go through GraphQL as the logged-in user; stored source defaults to **`web`**. Do not invent a new source string until the schema enum is extended.

### Sleep

- At most **one open sleep** per baby (`endedAt == null`). Second start → `CONFLICT`.
- `endBabySleep` / quick-care sleep end closes the open row (optional `eventId`).

---

## 7. `babyQuickCare` (primary write)

Idempotent home chain. Prefer this for Watch one-tap logging.

### Input

```graphql
input BabyQuickCareInput {
  action: BabyQuickActionInput!
  breastRunning: BabyQuickBreastInput   # null if no running timer to stop/switch
  feedSessionEventId: ID                # merge into open/grace feed session
  clientRequestId: String!              # 8–64 chars; durable exactly-once replay
  occurredAt: String
  endedAt: String
}

input BabyQuickActionInput {
  kind: BabyQuickActionKind!
  side: String                          # BREAST required
  amountMl: Float                       # FORMULA / PUMP_AMOUNT required
  diaperKind: BabyDiaperKind            # DIAPER required
  diaperColor: BabyDiaperColor
  diaperTexture: BabyDiaperTexture
  diaperAmount: BabyDiaperAmount
}
```

### Result

```graphql
type BabyQuickCareResult {
  steps: [BabyQuickCareStepResult!]!   # ordered writes this press
  replayed: Boolean!                   # true = same clientRequestId returned stored result
  openSleep: BabyCareEvent             # current open nap after chain
}
```

Step names you may see: `saveBreast` | `endNap` | `startNap` | `createFormula` | `createPumpAmount` | `createDiaper`.  
`wrote`: `insert` | `update` (feed session merge).

### Client rules

1. Generate a new `clientRequestId` per user press (UUID without dashes is fine).  
2. On unknown network failure, **retry the same** `clientRequestId` + same body → `replayed: true`, no double write.  
3. Server owns step order (may auto-end nap before feed/diaper).  
4. Running breast/pump: send `breastRunning: { side, durationSec }` when stopping/switching; omit/null when starting fresh.

### Minimal mutation document

```graphql
mutation BabyQuickCare($input: BabyQuickCareInput!) {
  babyQuickCare(input: $input) {
    replayed
    openSleep { id type occurredAt endedAt }
    steps {
      step
      wrote
      event { id type occurredAt endedAt payload }
    }
  }
}
```

### Example variables

**Wet diaper**

```json
{
  "input": {
    "action": { "kind": "DIAPER", "diaperKind": "wet" },
    "clientRequestId": "watch-7f3c9a12b4e801"
  }
}
```

**Formula 120 ml**

```json
{
  "input": {
    "action": { "kind": "FORMULA", "amountMl": 120 },
    "clientRequestId": "watch-a1b2c3d4e5f607"
  }
}
```

**Start left breast** (no running timer)

```json
{
  "input": {
    "action": { "kind": "BREAST", "side": "breast_l" },
    "clientRequestId": "watch-breast-start-01"
  }
}
```

**Stop left breast** (timer running 95s)

```json
{
  "input": {
    "action": { "kind": "BREAST", "side": "breast_l" },
    "breastRunning": { "side": "breast_l", "durationSec": 95 },
    "clientRequestId": "watch-breast-stop-01"
  }
}
```

**Toggle sleep** (start if no open nap; end if open — server decides)

```json
{
  "input": {
    "action": { "kind": "SLEEP" },
    "clientRequestId": "watch-sleep-01"
  }
}
```

---

## 8. Status read

```graphql
query BabyHomeQuickStatus($dayFrom: String!, $dayTo: String!) {
  babyHomeQuickStatus(dayFrom: $dayFrom, dayTo: $dayTo) {
    lastFeed { id type at endedAt payload summary }
    lastSleep { id type at endedAt payload summary }
    lastDiaper { id type at endedAt payload summary }
    lastPump { id type at endedAt payload summary }
    openSleep { id type occurredAt endedAt }
    feedsToday
    birthDate
    latestWeightKg
    recentBottleMl
  }
}
```

`recentBottleMl`: up to 3 distinct formula ml values, newest first — use for bottle chip defaults.

---

## 9. Simple mutations (optional)

### Feed

```graphql
mutation CreateBabyFeed($input: CreateBabyFeedInput!) {
  createBabyFeed(input: $input) { id type occurredAt payload }
}
```

```json
{
  "input": {
    "method": "formula",
    "amountMl": 120,
    "occurredAt": "2026-09-22T20:15:00.000+07:00"
  }
}
```

### Diaper

```graphql
mutation CreateBabyDiaper($input: CreateBabyDiaperInput!) {
  createBabyDiaper(input: $input) { id type occurredAt payload }
}
```

```json
{
  "input": {
    "kind": "dirty",
    "color": "yellow",
    "texture": "seedy",
    "amount": "medium"
  }
}
```

### Sleep

```graphql
mutation StartBabySleep($input: StartBabySleepInput) {
  startBabySleep(input: $input) { id occurredAt endedAt }
}

mutation EndBabySleep($input: EndBabySleepInput) {
  endBabySleep(input: $input) { id occurredAt endedAt }
}

query BabyOpenSleep {
  babyOpenSleep { id type endedAt }
}
```

---

## 10. Errors

GraphQL `errors[].extensions.code` (see [`lib/graphql/map-service-error.ts`](../lib/graphql/map-service-error.ts)):

| Code | Meaning | Watch handling |
|------|---------|----------------|
| `UNAUTHORIZED` | No session / user | Re-auth |
| `FORBIDDEN` | No Baby workspace / no write scope | Show setup needed |
| `NOT_FOUND` | Missing event (e.g. end sleep with none) | Refresh open sleep |
| `CONFLICT` | Open sleep already exists | Refresh; show End |
| `BAD_REQUEST` | Validation | Fix payload |
| `SERVICE_UNAVAILABLE` / `DB_UNAVAILABLE` | DB down before commit | Safe to clear pending / retry later |
| Network / HTTP 429 | Rate limit / transport | Retry same `clientRequestId` for quick-care |

HTTP 403 with “Cross-origin request blocked” = CSRF (session without matching `Origin`).

---

## 11. curl smoke tests (session)

Replace cookie / origin for your env. Bearer examples will work **only after** Baby API tokens ship.

```bash
# Profile
curl -sS "$AUTH_URL/api/graphql/baby" \
  -H "Content-Type: application/json" \
  -H "Origin: $AUTH_URL" \
  -H "Cookie: …" \
  -d '{"query":"query { babyProfile { id displayName birthDate } }"}'

# Quick wet diaper
curl -sS "$AUTH_URL/api/graphql/baby" \
  -H "Content-Type: application/json" \
  -H "Origin: $AUTH_URL" \
  -H "Cookie: …" \
  -d '{
    "query":"mutation($input: BabyQuickCareInput!){ babyQuickCare(input:$input){ replayed steps{ step wrote event{ id type } } } }",
    "variables":{
      "input":{
        "action":{"kind":"DIAPER","diaperKind":"wet"},
        "clientRequestId":"cli-smoke-diaper-001"
      }
    }
  }'
```

---

## 12. Full operation catalog

### Queries

| Field | Purpose |
|-------|---------|
| `babyProfile` | Profile + birthDate |
| `babyTimeline(from,to,cursor,limit)` | Paginated care/growth timeline |
| `babyOpenSleep` | Indexed open nap |
| `babyHomeQuickStatus(dayFrom,dayTo)` | Home one-shot status |
| `babyGrowthEntries(…)` | Growth/health rows |
| `babyVaccines(…)` | Vaccine list |
| `babyTelegramLink` | Linked Telegram chat |
| `babySyncConfig` | Poll interval minutes |
| `babyInsightsSeries(from,to)` | Charts / KPIs |

### Mutations

| Field | Purpose |
|-------|---------|
| `ensureBabyProfile(displayName)` | Create profile if missing |
| `updateBabyProfile(input)` | Set/clear `birthDate` |
| `createBabyFeed` / `createBabyDiaper` | Direct care creates |
| `startBabySleep` / `endBabySleep` | Nap start/end |
| `babyQuickCare` | Idempotent home chain |
| `updateBabyEvent` / `deleteBabyEvent` | Edit/delete care |
| `createBabyGrowth` / `updateBabyGrowth` / `deleteBabyGrowth` | Growth |
| `createBabyVaccine` / `updateBabyVaccine` / `deleteBabyVaccine` | Vaccines |
| `linkBabyTelegramChat` / `unlinkBabyTelegramChat` | Telegram |

Full SDL: [`lib/graphql/baby-typeDefs.ts`](../lib/graphql/baby-typeDefs.ts).

---

## 13. Watch implementation checklist

1. **Auth gate** — Create a Settings API token with **Baby Care** checked; store `mny_…` on device.  
2. **Wire** — `POST /api/graphql/baby`, JSON GraphQL, `Authorization: Bearer mny_…`.  
3. **MVP ops** — `babyHomeQuickStatus` + `babyQuickCare` only.  
4. **Idempotency** — Persist `clientRequestId` until success or definite no-commit.  
5. **Timers** — Keep breast/pump start times on-device; send `durationSec` on stop.  
6. **Open nap** — Disable Start (or show End) when `openSleep != null`.  
7. **Timestamps** — Always ISO with offset when backdating.  
8. Money GraphQL needs the **Money** grant on the same token (or a separate money-only token).

---

## 14. Related product notes

- Web home planning helper: [`lib/baby-quick-care-plan.ts`](../lib/baby-quick-care-plan.ts) (`planBabyQuickCare`).  
- Day window helper: [`lib/baby-home-day-window.ts`](../lib/baby-home-day-window.ts).  
- External-token feature idea (not implemented): [`.my-docs/workflow/baby-external-apis/01-idea.md`](../.my-docs/workflow/baby-external-apis/01-idea.md).
