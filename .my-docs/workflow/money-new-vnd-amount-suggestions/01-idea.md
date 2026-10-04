# Idea: VND amount suffix suggestions on money/new

## Problem

On `/money/new`, amount chips show recent amounts from the last 90 days. For VND, people often type a short number (e.g. `25`) and need quick help to make thousands or millions. Recent-amount chips do not help that typing pattern.

## User / audience

Money workspace users with workspace currency **VND** who create expense / income / transfer transactions on money/new.

## Outcome

When currency is VND and the user has typed an amount:

1. Hide the existing recent-amount suggestions.
2. Show two suggestions labeled `000` and `000.000`.
3. Tapping a suggestion **appends** zeros to the typed digits (Decision 1 Option 1).

Non-VND currencies keep today’s recent-amount chips.

## Metric

On money/new with VND: with a non-empty amount, recent chips are gone; `000` and `000.000` chips are visible and usable. With other currencies, recent chips still work as today.

## Sources (primary)

| Claim / topic | Primary source (path, URL, or API) | Notes |
|---------------|--------------------------------------|-------|
| Amount field + recent chips UI | `components/money-transaction-form.tsx` (`MoneyAmountField` `recentSlot`) | Recent amounts · last 90 days |
| Shared amount field shell | `components/money-amount-field.tsx` | `recentSlot` below input |
| money/new page entry | `app/(shell)/money/(tabs)/new/page.tsx` | Hosts transaction form |
| VND format / parse | `lib/format-money.ts` | 0 fraction digits; vi-VN style formatting |

## Has UI

**yes**

## Lean / skip hints

- **Copy/token-only?** no
- **UI notes for Design:** Only the amount suggestion row under Amount on money/new (and any shared form path that uses the same recentSlot). Match existing dashed chip styling. No new page chrome.

## 80/20 UI (day-to-day)

### Main user goals

- Enter a VND amount fast when logging a transaction
- Submit the transaction without fighting number entry

### Vital few (high-impact ~20%)

- Type short major digits → expand to thousands / millions with one tap
- Keep non-VND recent-amount behavior unchanged

### Primary UI — core actions dominant

- **Important info / action #1 (always visible):** Amount input
- **Important info / action #2 (always visible):** VND suffix chips (`000`, `000.000`) when typing; else recent amounts for other currencies
- **Core action placement:** chips directly under Amount (existing `recentSlot`)
- **Secondary actions:** recent-amount history for VND (hidden while this mode is active)

### Top user journey to optimize

Open money/new → pick kind/account → type amount digits → tap `000` or `000.000` → continue category/save

### Sensible defaults

- Only switch chip mode when currency is VND and amount input is non-empty (per ask: “when user input the amount”)
- Empty amount: no VND suffix chips (and no recent chips unless product later says otherwise — confirm in Design)

## Non-goals

- Changing parse/store of amount minor units beyond filling the major input string
- New API or DB for suggestions
- Changing non-VND recent-amount behavior
- Redesigning the whole money/new form

## Assumptions to attack

- Chip labels are literally `000` and `000.000` (vi-VN thousand separators use `.`)
- Tap applies relative to the current typed digits (Decision 1)
- Applies wherever this form’s Amount recentSlot is shown for non-loan kinds (same as today)

## Success criteria

- VND + typed amount → suffix chips only
- VND + empty amount → no misleading suffix chips (or settled empty-state rule)
- Non-VND → recent amounts unchanged
- Existing amount field styling / a11y patterns reused

## Settled decisions

1. **Decision 1 Option 1:** Append zeros. Chip labels stay `000` / `000.000`. Fill the input with plain digits (no thousand dots) so `parseMajorToMinor` keeps working (`25` + `000` → `25000`, not `25.000` — JS `parseFloat` would treat `.` as a decimal).

## Open questions

1. Empty amount: show nothing vs hint chips — Design may settle; prefer nothing until user types.
