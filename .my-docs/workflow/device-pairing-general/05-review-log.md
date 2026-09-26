# Code review log: device-pairing-general

**Result:** clean  
**Round:** 1  
**Updated:** 2026-09-26  
**Review profile:** lite  
**Note:** main-thread (usage limit). SPM: api+db+security.

## Adversarial

- Empty apps rejected (schema + service).
- FORBIDDEN when app access fails.
- Redeem grants from row only; no apps on redeem body.
- One-time consume; Reveal and Watch race → first wins (UI copy).
- No auto-revoke pile-up risk accepted by design.
- Secrets not logged in new UI paths.

**Result:** clean

## Quality

- Matches design Option 1: Device pairing, apps/write, Reveal, list-only ApiTokenSettings.
- System design: mint → row → redeem → token.
- Patterns: deps service + Settings cards.
- Skeleton: settings loading is shell-level; pairing block not in loading.tsx — OK (no dedicated skeleton for this card before).

**Result:** clean

## Merged SPM

### API lens (`05-lens-api.md`)

- Mint body apps/scopes; 403 FORBIDDEN; redeem unchanged body — OK.
- Path still `/api/watch/pair` — documented.

### DB lens (`05-lens-db.md`)

- Migration DEFAULT backfill then NOT NULL — applied.
- jsonb apps/scopes on schema — OK.

### Security lens (`05-lens-security.md`)

- Same-origin mint; rate limits; hashed codes; grants not client-chosen on redeem — OK.
- Reveal uses public redeem from session browser — acceptable (code is the secret).

**Merged Fix ask:** none

## Round notes

- Smoke pass → review clean → lite test pass → Gate C.
