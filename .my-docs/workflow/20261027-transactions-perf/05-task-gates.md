# Task gates (from measure)

**Source:** `05-measure-notes.md` (read-path ranked spans).

| Task | Gate | Decision |
|------|------|----------|
| 3 — COUNT/`hasMore` | `list.count` in top read spans | **APPLY** |
| 4 — defer SSR summary | Grill default (not COUNT-gated) | **APPLY** |
| 6 — targeted invalidation | post-mutation list refetch top span | **SKIP** — harness has no mutation refetch span |

Measure link: [05-measure-notes.md](./05-measure-notes.md)
