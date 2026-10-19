# ADR-004: Baby kiosk default inject (write-back once)

**Status:** Superseded by [ADR-006](ADR-006-kiosk-removed-redirect-money.md) · **Date:** 2026-10-18 · **Superseded:** 2026-10-19

Money kiosk widgets never inject new `defaultEnabled` ids into saved `kiosk_widgets` lists. For the three baby widgets we need day-one glance for returning parents without fighting Settings off. We chose a **one-time write-back**: when a non-empty stored list omits those ids and `kioskLayout.babyDefaultsInjected` is not true, merge the three ids, set the flag, and persist; null prefs still use registry defaults; `[]` stays empty and does not inject. Rejected resolve-merge-only because turning a baby widget off would reappear on every resolve.
