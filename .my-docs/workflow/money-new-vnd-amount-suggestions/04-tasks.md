# Tasks: money-new-vnd-amount-suggestions

**TDD:** Red tests first per task. Unit required for helper; e2e optional (lite profile — skip unless wiring needs UI proof).

## Task 1 — Append helper + unit tests (S)

**Acceptance:**
- Pure helper e.g. `appendVndAmountSuffix(majorInput: string, suffix: "000" | "000000"): string`
- Strips non-digits from input; if no digits → `""`
- Appends the chosen zero run; returns digits only
- Exported for tests (place under `lib/` next to money helpers)

**Tests (TDD — create):**
- Unit: `"25"` + `"000"` → `"25000"`
- Unit: `"25"` + `"000000"` → `"25000000"`
- Unit: `"25.000"` / `"25,000"` strip then + `"000"` → `"25000000"` (digits `25000` + `000`)
- Unit: `""` / `"   "` → `""`
- Unit: `"0"` + `"000"` → `"0000"`
- Unit: successive append `"25"` + `"000"` → `"25000"` then + `"000"` → `"25000000"`

## Task 2 — Wire VND recentSlot branch (S)

**Acceptance:**
- In `components/money-transaction-form.tsx` `recentSlot`:
  - VND + typed amount + not loan → suffix chips only (hide `topAmounts`)
  - Else → existing recent-amount UI unchanged
- Chip labels exact: `000`, `000.000`
- Tap calls helper + `setAmountMajor`
- Hint: `Tap to add zeros` (or Design wording) in VND mode
- UI locks: same chip classes / group a11y as Design

**Tests (TDD — create):**
- Unit or source contract: form imports/uses `appendVndAmountSuffix`
- Prefer small render test if cheap: VND + value `"25"` markup includes `000` and `000.000` and does not show recent-amount aria label; non-VND still can show recent path when `topAmounts` present (mock as needed). If form is too heavy to render, source assertions + helper coverage are enough — note in smoke.

## Task 3 — Regression sanity (S)

**Acceptance:**
- Non-VND recent chips behavior unchanged when data present
- Loan kind still hides amount suggestion row
- `parseMajorToMinor` of filled values yields expected minor for VND (`25000` → 25000)

**Tests (TDD):**
- Unit: `parseMajorToMinor("25000", "VND") === 25000`
- Unit: `parseMajorToMinor("25.000", "VND") !== 25000` documented as why we fill plain digits (assert equals 25) — keeps the trap visible

## Task order

1 → 2 → 3
