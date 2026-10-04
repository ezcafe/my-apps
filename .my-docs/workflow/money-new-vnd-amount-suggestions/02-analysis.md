# Analysis: money-new-vnd-amount-suggestions

**Updated:** 2026-10-04  
**Mode:** simple  
**Has UI:** yes  
**Has API:** no — client-only chip UI; no route/validator change  
**Has DB:** no — no schema / query change  
**Grill recommended?** no — frontier empty after settled picks below

## Deep dive — overall

### What is this?

On money/new Amount (`MoneyTransactionForm` → `MoneyAmountField` `recentSlot`), when workspace currency is **VND** and the user has typed an amount, replace recent-amount chips with two suffix chips: `000` and `000.000`. Tap appends zeros to the typed digits and fills plain digits into the input.

### Why do we need this?

VND amounts are large; people type short majors (`25`) and need a fast path to thousands / millions. Recent-history chips do not match that typing habit. Skipping leaves slow digit entry and unused recent chips for the common VND path.

### How to do this?

Branch `recentSlot` in `components/money-transaction-form.tsx`:

1. If `defaultCurrency === "VND"` and trimmed `amountMajor` has digits → show suffix chips (hide `topAmounts`).
2. Else keep today’s recent-amount chips (`topAmounts.length > 0 && kind !== "loan"`).
3. On tap: normalize typed digits → append `000` or `000000` → `setAmountMajor` plain string (no grouping dots).

**Other ways:** (a) preview chips with full values (rejected — Decision 1 Option 1); (b) change `parseMajorToMinor` to accept vi-VN grouping (out of scope / riskier); (c) new shared component (optional, not required for one call site).

**Best practices:** Reuse existing dashed chip classes; keep fill compatible with `parseMajorToMinor` (`lib/format-money.ts` uses `parseFloat` after stripping `,` only — `.` is decimal). Match DESIGN_GUIDE chip radius / `fx-press`.

## Solution pieces (≤5)

### 1. VND recentSlot branch

- **What:** Conditional UI under Amount for VND vs recent amounts.
- **Why:** Product ask — hide existing suggestions for VND while typing.
- **How:** In `recentSlot`, compute `showVndSuffix = defaultCurrency === "VND" && hasTypedAmount && kind !== "loan"`. Render two buttons or recent list.
- **Other ways:** Move logic into `MoneyAmountField` — rejected; field is a dumb shell (`recentSlot` only).
- **Best practice:** Keep presentation in the form that owns `amountMajor` / currency.

### 2. Append helper (pure)

- **What:** `appendVndAmountSuffix(majorInput, suffixZeros)` → plain digit string.
- **Why:** Unit-testable; avoids parse bugs from thousand dots.
- **How:** Strip to digits (ignore `.` `,` spaces); if empty return `""`; append `"000"` or `"000000"`; return digits only. Labels stay `000` / `000.000`.
- **Other ways:** String-concat without strip — fragile if user pasted formatted text.
- **Best practice:** Pure helper + unit tests before UI wiring (repo TDD rule).

### 3. Empty / loan / non-VND parity

- **What:** Rules when chips show.
- **Why:** Avoid misleading zeros on empty; loans already hide amount recent chips.
- **How:** Empty VND → no suffix chips (settled). Loan → no amount chips (unchanged). Non-VND → recent amounts unchanged.
- **Other ways:** Always show suffix chips when VND even if empty — weaker (user said “when user input”).

### 4. Hint copy

- **What:** Short helper line under Amount for VND suffix mode.
- **Why:** Recent mode says “Tap a recent amount…”.
- **How:** e.g. `Tap to add zeros` (or similar short line). Keep muted `text-sm`.
- **Other ways:** No hint — slightly less clear.

### 5. Tests

- **What:** Unit tests for append helper; light render/assert for chip branch if cheap.
- **Why:** Catch `25.000` parse trap; lock VND vs non-VND behavior.
- **How:** New unit file next to helper or extend `format-money` / form-related tests. E2E optional for lite profile if tasks say so.

## Spike notes

| Topic | Finding |
|-------|---------|
| Parse safety | `parseMajorToMinor("25.000")` → `parseFloat` → **25** (wrong). Must fill `25000`. |
| Call site | Only `money-transaction-form.tsx` uses recent amount chips via `recentSlot`. |
| Page host | `app/(shell)/money/(tabs)/new/page.tsx` lazy-loads the form. |
| VND fractions | `getCurrencyFractionDigits("VND") === 0`; major == minor scale. |

## Design tree (frontier)

### Settled

- Decision 1 Option 1 — append zeros; chip labels `000` / `000.000`
- Fill plain digits only (no grouping separators)
- Show suffix chips only when VND + typed amount + not loan
- Empty amount → no suffix chips
- Has API = no; Has DB = no
- Change lives in form `recentSlot` + small pure helper

### Open frontier

- (empty)

### Blocked

- None

## Reusable patterns

- `MoneyAmountField` + `recentSlot` chip row classes in `money-transaction-form.tsx`
- `parseMajorToMinor` / `minorToMajorInput` in `lib/format-money.ts`
- Dashed suggestion buttons (`rounded-[var(--radius-sm)]`, `fx-press`)

## System shape candidates

- **Client-only branch** in existing form (recommended)
- Shared `VndAmountSuffixChips` component — only if a second call site appears

## Are instructions clear enough to design?

Yes. No blocking gaps in What / Why / How.
