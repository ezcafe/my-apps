# Lens: security — baby-log-money-new-form

**Result:** clean
**Round:** 2
**Updated:** 2026-09-19

## Findings

| Id | Severity | Location | Finding | Suggestion |
|----|----------|----------|---------|------------|
| — | — | — | None open. Prior S1 closed by Zod unit rejecting `kind: "vaccine"` on `createBabyGrowthSchema`. | — |

## OWASP coverage (security lens only)

| OWASP | Status (pass / fail / N/A) | Note |
|-------|----------------------------|------|
| A01 | pass | `createBabyGrowth` / `createBabyVaccine` (and list/update/delete) still go through `requireBabyWriteWorkspace` / `requireBabyWorkspace`; services filter `workspaceId` (+ id). Cross-workspace vaccine id → `NOT_FOUND`. Deleting Vaccines page does not weaken API authz. |
| A02 | N/A | No new secrets or crypto. Vaccine name stays in workspace-scoped vaccine table; Growth UI does not put vaccine name in URL. |
| A03 | pass | Drizzle parameterized inserts; Zod on create paths. `kind: String!` in GraphQL is still constrained by `babyGrowthKindSchema` (no `vaccine`). React text for chip labels / toasts; no `dangerouslySetInnerHTML` on Growth capture. |
| A04 | pass | UI sentinel `vaccine` ≠ `baby_growth` kind; Save routes via `babyGrowthSaveMutationTarget` → `createBabyVaccine`. Server rejects forged growth kind `vaccine`; CI locks that via `lib/validators/baby.test.ts`. Empty name/dose blocked client + Zod. Redirect destination is fixed (not user-controlled). |
| A05 | pass | Permanent redirects only: `/baby/vaccines` and `/baby/vaccines/:path*` → `/baby/growth?kind=vaccine` (no open redirect). Same pattern for measure → growth. |
| A06 | N/A | No new npm dependencies in this draft. |
| A07 | pass | Same Baby session + membership gate; writes use `requireBabyWriteWorkspace`. |
| A08 | pass | Client chip→mutation map is not trusted alone; Zod + PG enum enforce growth kinds. Vaccine writes use separate schema/table. |
| A09 | pass | Growth save path does not log vaccine names; errors go to existing care toasts via `notify.error`. |
| A10 | N/A | No outbound fetch of user URLs; fixed `POST /api/graphql/baby` only. |

Source: https://owasp.org/Top10/

## Round notes

- **Re-verify after Fix:** Prior S1 (Enhancement) — missing Zod unit for forged `kind: "vaccine"` on `createBabyGrowth` — is **fixed**. Test `rejects forged kind vaccine (UI sentinel, not a growth DB kind)` in `lib/validators/baby.test.ts` asserts `safeParse` fails; suite green (49 pass).
- **Scope:** Growth + vaccine merge, `?kind=` preselect, deleted Vaccines route/page, fixed redirects, GraphQL create growth/vaccine, workspace scope. Compared to `03-design.md` Security / OWASP.
- **Design ↔ code:** Matches. Abuse cases covered: empty vaccine fields; forge growth `vaccine` rejected (schema + unit); deleted `/baby/vaccines` → fixed Growth deep link; mutations stay workspace-scoped. No Critical/Major/Enhancement remain.
- **`?kind=`:** Allowlisted chips only; unknown → Weight. Not an open redirect or authz bypass.
- **No Critical / Major / Enhancement.** Result **clean**.
