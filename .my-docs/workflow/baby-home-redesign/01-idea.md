# Idea: Baby home for fast night care

## Problem

The current Baby home shows recent care first, then sends the caregiver to separate forms. At night, logging a breast feed, formula feed, sleep, or diaper takes too many steps and asks the caregiver to read more than needed.

The new home should make the most common actions large, clear, and usable with one hand at 3AM. It must also prevent an unclear gesture or accidental tap from saving the wrong care event.

## User / audience

The main user is a tired mother or other caregiver feeding and changing a baby at night. A second caregiver may use the same family workspace.

## Outcome

The caregiver can log breast feeding, formula, sleep, and diaper care from the Baby home without opening a form:

- The first row has large left-breast and right-breast buttons.
- Pressing a breast button starts its timer. Its title shows the running time.
- Pressing the same button again stops the timer and records the feed.
- Pressing the other breast while a timer is running saves the current side, then starts the other side.
- The second row has three large buttons, in order: formula bottle, sleep, diaper.
- Formula amount is picked from a fixed ml list with visible + / − controls. Pressing the center of the button records the shown amount.
- Sleep works like breast: press to start a running timer in the button title; press again to record the sleep session.
- Diaper result is wet, dirty, or mixed. The same + / − pattern changes the result. Pressing the center records the shown result.
- The third row gives a quick answer to: what was the last feed, how long ago was it, when was the last sleep, and when was the last diaper?
- Idle care buttons show a **next-due** subtitle (`next in …` / overdue) from the last event plus an age guide interval. Running breast/sleep show elapsed time only.
- The screen is easy to scan in low light, in English and Vietnamese.

## Metric

In a low-light usability check, at least 90% of breast, formula, sleep, and diaper logging attempts are completed correctly within 5 seconds, without opening another page or correcting the saved event.

## Non-goals

What we will **not** build in this pass:

- A medical formula calculator or feeding advice.
- New pump, measurement, vaccine, timeline, or insight features.
- Charts or long history on the home page.
- A replacement for the existing full forms and edit flow.
- A shared live timer across other caregivers’ devices.
- Undo after a successful quick save.
- Changes to Telegram logging.

## Settled after Gate 1 (2026-09-11)

- **Breast switch:** Save the running side, then start the other side.
- **Timer persistence:** Survive lock and reload on the device that started it. Do not sync the live timer to another phone.
- **Formula amounts (Gate 1 list):** Superseded by Analyze Q7 and the Design decision: `+` / `−` walk the **age band in steps of 10 and clamp at the band edges**. An explicit **Custom** control opens a **modal** for an exact ml value (whole ml, 10–300). Default = mid-band; after save return to the age default.
- **Diaper:** Default wet. Cycle order: wet → dirty → mixed → wet.
- **Undo:** None. Disable the control while saving so a second press cannot create a duplicate.
- **Sleep:** Large sleep button on row 2, after the bottle, before diaper. Press starts a timer in the title; press again records the session. **Server open nap** (Analyze Q1 = A).
- **Home links:** Drop the four home CTAs; full forms including measurement stay in the Baby menu (Analyze Q2 = B).
- **Value change (formula and diaper):** Visible + / − stepper on the large control. Center tap saves. Long-press + / − repeats. Drag is not the primary control.
- **Auto-finalize (2026-09-12):** Nap or diaper saves an open breast timer first. Feed (breast/formula) or diaper ends an open nap first. Formula while breast running: **save breast, then formula** (Q8 = A). Diaper with both open: breast → nap → diaper.
- **Row 3 guide (Q6 = A+C):** Feed line shows time ago + `n/N today`; ml band only on the bottle control.

## Settled after the Design draft (2026-09-12)

Decisions the user made on the Design options. These override anything above that disagrees with them.

- **Architecture: Option B.** Home reads everything from one new server query, `babyHomeQuickStatus`. The pure `lib/` rules for the steppers, the breast timer, and auto-finalize stay on the client.
- **Auto-finalize order: confirmed.** One order everywhere — save breast → end nap → pressed action.
- **Custom ml: modal.** The `+` / `−` band stepper stays on multiples of 10 inside the age band and clamps at the edges. An explicit **Custom** control opens a modal for an exact whole-ml value between 10 and 300. Confirm sets the value on the card; the centre tap still does the saving. After a successful save the value returns to the age default.
- **Stale breast timer: confirmed at 6 hours.** Flagged and still saveable, never silently dropped.
- **Missing birth date: prompt, do not just fall back.** Home shows a quiet line asking for the birthday (dismissible for 7 days) and the birthday is **editable on `/baby/settings`** through a new `updateBabyProfile` mutation. Home stays fully usable while it is unset: fallback band 60–150 ml with default 120, and the feed count shows `n today` with no `/N`.
- **Feed count is exact.** The server counts today's feeds in SQL, so there is no `n+ today` partial wording.

## Settled after Gate 2 pause — next-due timers (2026-09-12)

User picks: **1A / 2A / 3A / 4A**.

- **Meaning:** Countdown from last event + age guide interval. Show `next in …`; when past due show overdue (e.g. `1h overdue`).
- **Intervals:** Age-band frequencies for feed, sleep (awake time), and diaper (table below). Caregiver-facing guide, not medical advice. Solids/meal guidance is a **non-goal** on home buttons.
- **Layout:** Subtitle under the main label/icon/value. While breast or sleep is **running**, show elapsed only (not next).
- **Feed where:** The **same** next-feed countdown on Left breast, Right breast, and bottle.
- **Due target:** Use the **earlier** bound of each range (start of the window) so night care is nudged sooner.
- **Next feed clock:** Last feed `at` (any method) + interval. Newborn (0–1 mo): breast last → 2h; formula last → 3h; **pump, missing, or unknown method → same non-split feed interval as older bands** (`feedDefaultMinMs` in `03`). Older bands: one feed interval. No last feed → hide next-feed subtitles.
- **Next sleep clock:** Awake time since last sleep **ended**. Napping now → elapsed only. Never had an ended nap → hide next-sleep.
- **Next diaper clock:** Last diaper `at` + interval. No last diaper → hide next-diaper.
- **No birthDate:** Hide all next-due subtitles; keep the birth-date prompt. Do not invent age.
- **Over 3 years:** Hold the 1–3y band (do not invent a new table).

### Age frequency table (earlier bound = due)

| Age | Feed interval | Sleep (awake before nap) | Diaper interval |
|-----|---------------|--------------------------|-----------------|
| 0–1 month | Breast 2h · Formula 3h · else default feed | 50 min | 2h |
| 1 month (to <2 mo) | 2.5h | 60 min | 2h |
| 2 months (to <3 mo) | 2.5h | 1.5h | 2h |
| 3–4 months | 3.5h | 1.5h | 3h |
| 5 months (to <6 mo) | 4h | 2h | 3h |
| 6 months (to <7 mo) | 4h | 2h | 3h |
| 7–12 months | 4h | 3h | 3h |
| 1–3 years | 3h | 5h | 4h |
| over 3 years | hold 1–3y | hold 1–3y | hold 1–3y |

**Where day bounds live:** frequency day bounds and care intervals are defined in `03-design.md` and implemented in **`lib/baby-next-due.ts`**. They are a **separate lookup** from the ml age bands in `lib/baby-age-guide.ts` (those use different day cuts, e.g. 7 / 28 / 61). Do not merge the two tables.

## Promises we are making (clarified after design review round 1, tightened after round 2 — 2026-09-12)

These spell out success criteria that were too vague to test. They do not change any Gate 1 or Option B decision.

- **Exactly one, per press — with no time limit.** One press records one set of care rows. Two fast taps, a slow network retry, a page reload mid-save, or a retry the next morning must not create a second feed, nap, or diaper. Three guards: a synchronous in-flight lock on the device, a pending record that holds the whole press before the request leaves, and a request id whose **result the server stores** in the same transaction as the care rows. A second arrival of that id returns the first result and writes nothing. Round 1 promised this with a 10-minute lookup, which was really "exactly once if you retry fast enough"; round 2 made it durable.
- **A press is never silently lost either.** If the outcome of a press is unknown — the response never came back — home shows one quiet line offering **Try again** or **Discard**. Try again resends the exact same press, so it can only ever land once. Discard writes nothing. **We promise no duplicates, not no misses:** a discarded press is a save the caregiver has to make again, which is the safe direction when there is no Undo.
- **A very old unconfirmed press is not retried.** A press whose outcome is still unknown after 30 minutes stops offering Try again, because a retry is recorded at the time it lands. The line then points at the timeline instead.
- **Order holds even with two caregivers.** The fixed order — save breast → end nap → pressed action — is decided and run **on the server against current data**, inside one transaction. **Every** path that can start or end a nap, including the existing full sleep form, runs one at a time per family behind the same lock. If the other caregiver starts a nap one second before the press lands, that nap is still ended before the pressed action. The whole chain either commits together or nothing commits.
- **"Today" and "age" mean local calendar days, and today rolls over on its own.** Today's feed count covers the caregiver's local day from midnight up to (not including) the next local midnight. A home page left open through midnight moves to the new day by itself, so it never shows yesterday's count. Age is the number of whole calendar days between the birthday and today in the caregiver's own timezone — not elapsed 24-hour blocks — so daylight-saving changes never shift the age band.
- **The birthday is a real calendar date.** `2026-02-30` and `2023-02-29` are rejected, `2024-02-29` is accepted. The same rule is used by the server check and by the age calculation.
- **The family chat hears exactly what it hears today.** A feed, a diaper, and a started nap are announced. An **ended** nap is not — the app has never announced one, and the quick-log page does not change that.

## Age formula guidance (settled for Design — 2026-09-12)

Caregiver-facing guide (not medical advice), from baby `birthDate`. Row 3: last feed timing plus today’s feed count vs guide max. Bottle: current age-band +/− list, plus a custom-value path.

## Assumptions to attack

| Assumption | Must be true? | Fastest way to kill it | If false, what changes? |
|------------|---------------|------------------------|-------------------------|
| The night actions on home are breast, formula, sleep, and diaper. | Yes — Gate 1 | Watch one normal night and count each action. | Move a rare action off the home page. |
| Visible + / − on the large control is safer than drag for one-handed night use. | Yes — working pick | Test 10 formula changes and 10 diaper changes at low brightness with the intended phone. | Switch to a snap picker or add drag as a shortcut. |
| One press on the center can safely save formula, diaper, or stop a timer. | Yes | Run 20 realistic attempts and count accidental or duplicate saves. | Require a stronger save gesture (Gate 1 rejected Undo). |
| The age-band range plus a Custom modal covers every real bottle for this baby. | Yes — settled 2026-09-12 | Compare the band with real bottles for a week and count how often Custom is needed. | Widen the band, or move Custom from a modal to something faster. |
| The latest care data is enough for the 3AM check. | Yes | Ask the caregiver to answer “what happened last?” from a simple mock in under 3 seconds. | Change the labels, order, or details before build. |
| Only one breast timer should run for a baby at once. | Yes — Gate 1 | Switch sides during a feed and confirm the first side was saved. | Would need two live timers (rejected). |
| A running timer only needs to stay on the device that started it. | Yes — Gate 1 | Start a timer, lock the phone, reload, then open the workspace on another device. | Shared live timer is out of this pass. |

## What we should not build

- Do not invent a “doctor recommended” amount from the baby’s age or weight.
- Do not make drag the only way to change a value; + / − must work with touch, keyboard, and assistive technology.
- Do not hide save failures or reset a timer before the feed or sleep is safely recorded.
- Do not add dense text, small targets, or gesture-only hints that are hard to use at night.
- Do not expand this pass into a full Baby navigation or data-model redesign.

## Success criteria

- [ ] The first row shows two large controls with clear left-breast and right-breast names and icons.
- [ ] Pressing an idle breast control starts a visible elapsed timer inside that control.
- [ ] Pressing the same running control again records exactly one feed with the correct side and duration, then returns it to its idle state.
- [ ] Pressing the other breast while a timer is running saves the current side and starts the other side.
- [ ] A running breast or sleep timer survives phone lock and page reload on the same device.
- [ ] The second row shows three large controls in order: formula, sleep, diaper.
- [ ] The formula control opens at the age-band default and shows the band range. With no birth date on file it opens at 120 ml with the 60–150 fallback range.
- [ ] Visible + / − changes the formula amount by 10 and stops at the band edges. Long-press repeats. Center press records exactly one formula feed with the shown amount.
- [ ] A **Custom** control on the bottle opens a modal where an exact whole-ml value between 10 and 300 can be typed. Confirm only sets the value; the center press still does the saving. After a successful save the amount returns to the age default.
- [ ] Home asks for the baby's birthday while it is unset, and the birthday can be set or changed on `/baby/settings`.
- [ ] Pressing idle sleep starts a visible elapsed timer in that control. Pressing again records exactly one sleep session and returns it to idle.
- [ ] The diaper control shows one clear result: wet, dirty, or mixed. Default is wet.
- [ ] Visible + / − cycles diaper in order wet → dirty → mixed → wet. Center press records exactly one diaper event with the shown result.
- [ ] Save progress, success, and failure are clear. Repeated presses while saving do not create duplicate events, and a retry of the same press does not either, however long the gap. A failed chain leaves nothing saved. There is no Undo toast.
- [ ] A press whose outcome is unknown (reload or network drop mid-save) shows one quiet line with **Try again** and **Discard**. Try again resends the same press with the same values; it can never save twice.
- [ ] A home page left open across local midnight shows the new day's feed count without a manual reload.
- [ ] Idle Left breast, Right breast, and bottle show the **same** next-feed subtitle (`next in …` or overdue) from the last feed + age interval; hide when there is no last feed or no birth date.
- [ ] Idle sleep shows next-nap from awake time since last sleep **ended**; while napping, shows elapsed only.
- [ ] Idle diaper shows next-diaper from last diaper + age interval; hide when there is no last diaper or no birth date.
- [ ] The third row shows the last feed type or side, time since the last feed, last sleep, and last diaper in a form the caregiver can scan in under 3 seconds.
- [ ] Empty and load-failure states still leave safe logging actions available.
- [ ] The page works with one hand, large touch targets, low brightness, light and dark themes, English and Vietnamese, keyboard input, and a screen reader.
- [ ] The existing full forms and history remain reachable for detailed entry and corrections.

## Open questions (non-blocking)

1. For the third row, should “last sleep” mean when sleep started, when it ended, or how long ago it ended? Working assumption: time since last sleep **ended**, plus a live “sleeping now” state if a timer is running.
2. Should the last-feed summary show breast side, formula amount, both when present, and the exact clock time as well as “time ago”? Working assumption: type/side (or ml), plus time ago, large enough to read at 3AM. Clock time can be secondary.
3. Must the layout work equally on tablets and desktop, or is phone-first enough? Working assumption: phone-first, still usable on larger screens with the same large controls.
4. Can a breast timer and a sleep timer run at the same time? Working assumption: yes, they are independent.

## Value control recommendation (Gate 1 follow-up)

Vertical drag on a 1/3-width button is easy to confuse with a save tap, and Gate 1 has no Undo. Formula has nine snap amounts; diaper has three states. Both need the same one-hand pattern.

### Option A — Vertical drag / flick on the whole button
- **What it is:** Slide up or down on the large control to change ml or diaper result; tap to save.
- **Example:** Thumb slides up on the bottle from 120 to 150, then taps to record.
- **Pros:** Matches the first idea; few taps when jumping several steps.
- **Cons:** Easy to save by mistake; hard with a screen reader; imprecise on a narrow third-row button.

### Option B — Visible + / − on the control, center tap saves (recommended)
- **What it is:** The large control has + above the value and − below it. Center (icon + number) saves. Long-press + / − walks the list. Keyboard and screen reader use the same + / −.
- **Example:** Bottle shows 120 ml; tap + twice → 140; tap the bottle icon/number to record. Diaper shows wet; tap + → dirty; tap the diaper icon to record.
- **Pros:** Change and save are separate. Works one-handed with a thumb. Same pattern for bottle and diaper. Safe without Undo. Meets the accessibility non-goal.
- **Cons:** Jumping from 60 to 150 needs several taps or a long-press. Three buttons in one row leave less width for + / −.

### Option C — Snap picker wheel inside the control
- **What it is:** A short vertical wheel of allowed values inside the button; flick to snap; tap center to save.
- **Example:** Wheel shows 110 / **120** / 130; flick to 80; tap center to record.
- **Pros:** Fast jumps. Discrete snaps match the ml list.
- **Cons:** Fiddly at 3AM; easy to overshoot; weaker for only three diaper states; harder for keyboard and screen reader unless + / − is added anyway.

### Recommendation

**Pick B.** Keep change and save as two different targets. Use the same + / − pattern on bottle and diaper. Long-press covers large jumps. Do not use drag as the primary control.

**Settled (2026-09-12):** B was picked. The bottle card also gets one extra control — a **Custom** chip that opens a modal for an exact ml value — because the + / − stepper stays inside the age band and cannot reach an odd amount like 95 ml.
