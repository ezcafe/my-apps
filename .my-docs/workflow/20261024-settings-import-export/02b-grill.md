# Grill log

**Result:** frontier-empty

**clarity-check ok — grill**

**Grill open** = ¬Notes `grill-skip` ∧ (no `02b` ∨ Result ≠ `frontier-empty`) (incl. template **`pending`** alone — does not close). **Closed** on Notes `grill-skip` (parent-only) **or** Result `frontier-empty` only — Result `skipped` does **not** close.

## Design tree (reopened — design-backloop)

- Intent locked (ideation): per-feature Import/Export; all records + all child settings pages; core `/settings` out.
- Gate A / skim / Analyze paid.
- Round 1 settled (user **"yes"** = accept all five recommendations).
- **Backloop (2026-10-26):** user chose **Option A** + **backloop this run** — add per-feature **Export all** / **Import all** on each feature Import/Export hub. Prior R1 decisions stay unless a new frontier overrides them.
- Round 2 settled (user **"yes"** = accept all six Export all / Import all recommendations) → frontier empty.

## Round log

### Round 1 — frontier (settled)

❓ **Q1** - **v1 entity kinds**: Lock v1 to these include/exclude lists?

- **Money:** export + settings entry for existing import kinds only (accounts, categories, merchants, tags, budgets, transactions, rules, recurrence).
- **Baby:** care events, growth, vaccines, profile — **exclude** telegram link secrets and quick-care replay rows.
- **Loans:** loans + schedule installments (+ pay status) — **exclude** push subscription endpoints.
- **Investments:** statement import (existing) + export instruments + trade journal — **exclude** quote cache tables; no new non-statement import in v1.

➡️ **Yes** — use that include/exclude set for v1.

**Settled:** Yes (user accepted recommendation).

---

❓ **Q2** - **File format**: Use **CSV** for Money-style tabular kinds (aligned with existing Money import), and keep Investments **statement** formats as today — no JSON archive in v1?

➡️ **Yes** — CSV (+ existing statement parsers); defer JSON archive.

**Settled:** Yes — CSV (+ existing Investment statement formats); no JSON archive in v1.

---

❓ **Q3** - **Import merge policy**: Default to **append / create** with preview + confirm; upsert only when a stable natural key is already defined for that kind; never silent full replace?

➡️ **Yes** — append/create + preview; no silent replace.

**Settled:** Yes — append/create + preview+confirm; upsert only with stable natural key; never silent full replace.

---

❓ **Q4** - **Money settings IA**: Add an **Import / Export** settings category on the Money hub **and** Import + Export actions on each entity child settings page (children deep-link to the same wizard/export as today)?

➡️ **Yes** — hub category + child entry points; one implementation.

**Settled:** Yes — Money Import/Export hub category AND Import+Export on each entity child page (deep-link same wizard/export). Same pattern for other features’ hubs (and children where entity pages exist).

---

❓ **Q5** - **Ship phasing**: Design and implement **all four features** in one delivery (not Money-first then follow-ups)?

➡️ **Yes** — one ship covering Money, Baby, Loans, Investments under the locked v1 kinds.

**Settled:** Yes — one delivery for all four features under locked v1 kinds.

---

### Round 2 — frontier (settled — design-backloop: Export all / Import all)

❓ **Q1** - **Export-all package**: For each feature hub, **Export all** returns one **ZIP** of the same per-kind CSVs already used for single-kind export (filenames = kind, e.g. `accounts.csv`)? Keep single-kind CSV downloads unchanged. No JSON archive.

➡️ **Yes** — ZIP of per-kind CSVs; reuse existing serializers; Investments ZIP = `instruments.csv` + `trade-journal.csv` only.

**Settled:** Yes (user accepted recommendation).

---

❓ **Q2** - **Export-all size limits**: Apply the **same** buffered row/byte caps **per kind** inside the ZIP; if **any** kind would exceed → **`413` `export_too_large`** for the whole Export-all (no partial ZIP). Plus a modest ZIP byte ceiling (env-tunable, default ~ same family as single export max bytes × kind count, e.g. 5 MiB × kinds capped).

➡️ **Yes** — per-kind caps first; fail whole Export-all on any kind over cap; no partial ZIP.

**Settled:** Yes (user accepted recommendation).

---

❓ **Q3** - **Import-all UX**: Hub **Import all** accepts one **ZIP** of those CSVs → multi-kind preview (per-kind ok/error counts) → one confirm that commits kinds in a **fixed dependency order**. Missing files = skip that kind (warn). Unknown filenames = reject preview. Per-kind Import wizards stay as today.

➡️ **Yes** — ZIP upload → multi-kind preview → ordered commit; missing optional; unknown rejected.

**Settled:** Yes (user accepted recommendation).

---

❓ **Q4** - **Commit order (locked lists)**: Use these orders (deps first)?

- **Money:** accounts → categories → merchants → tags → budgets → rules → recurrence → transactions  
- **Baby:** profile → care → growth → vaccines  
- **Loans:** loans → installments  
- **Investments Import all:** **not** a ZIP of instruments/journal (still no CSV import for those). Hub **Import all** deep-links the **existing statement import** wizard only (same as “Open wizard”). Export all still ZIPs instruments + trade journal.

➡️ **Yes** — those orders; Investments Import all = statement wizard only.

**Settled:** Yes (user accepted recommendation).

---

❓ **Q5** - **Partial failure on Import-all commit**: Commit kinds **in order inside one feature workspace RLS session**; on first kind hard-fail → **stop**, keep earlier kinds committed, return which kind failed (no silent full rollback across kinds). Preview still required before any write.

➡️ **Yes** — stop on first hard-fail; earlier kinds stay; report failed kind.

**Settled:** Yes (user accepted recommendation).

---

❓ **Q6** - **UI placement**: On each feature Import/Export hub, put **Export all** + **Import all** as a top actions row **above** the existing per-kind list. Child entity pages stay per-kind only (no Export/Import all on children).

➡️ **Yes** — hub top row only; children unchanged.

**Settled:** Yes (user accepted recommendation).

## Frontier

(empty)

## Settled decisions

1. **v1 kinds** — Money: 8 existing import kinds + export. Baby: care/growth/vaccines/profile (excl. telegram secrets + quick-care). Loans: loans + installments (+ pay status; excl. push). Investments: keep statement import; export instruments + trade journal (excl. quote cache); no new non-statement import.
2. **Format** — CSV for tabular kinds; Investments statement formats unchanged; no JSON archive in v1.
3. **Merge** — append/create + preview+confirm; upsert only with stable natural key; never silent full replace.
4. **IA** — Import/Export hub category per feature; Money (and peers with entity children) also expose Import+Export on child pages deep-linking one implementation.
5. **Phasing** — one ship for Money + Baby + Loans + Investments under locked kinds.
6. **Export all** — ZIP of per-kind CSVs; single-kind CSV unchanged; Investments ZIP = instruments + trade-journal.
7. **Export-all caps** — same per-kind row/byte caps; any over → whole `413 export_too_large`; no partial ZIP.
8. **Import all** — ZIP → multi-kind preview → ordered commit; missing file = skip+warn; unknown filename = reject; per-kind wizards stay.
9. **Import-all order** — Money: accounts→categories→merchants→tags→budgets→rules→recurrence→transactions; Baby: profile→care→growth→vaccines; Loans: loans→installments; Investments Import all = statement wizard only (no instruments/journal CSV import).
10. **Import-all partial failure** — stop on first hard-fail; earlier kinds stay; report failed kind.
11. **UI** — Export all / Import all top row on feature hubs only; children stay per-kind.
