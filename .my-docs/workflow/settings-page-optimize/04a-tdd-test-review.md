# TDD test-case review: settings-page-optimize

**Result:** needs more tests  
**Round:** 1  
**Updated:** 2026-09-26  
**Note:** main-thread fallback — usage limit

## Planned / existing test cases reviewed

| Task | Scenario | Covered in 04-tasks? |
|------|----------|----------------------|
| 1 | Not searching → single active category | yes |
| 1 | Searching → matching list | yes |
| 1 | Browse never multi-pane via stale `all` | yes |
| 2 | Layout wires helper / not always all sections | yes |
| 2 | Existing filterSettingsCategories stay green | yes |
| 2 | Hash selects category without sibling sections | **partial** |
| 3 | Loading skeleton one pane only | yes |
| 3 | Money/Investments/Loans loadings if stacked | yes (check) |
| 4 | Optional e2e hash Appearance without Danger | yes optional |

## Gaps → fold into `04-tasks.md`

| Sev | Task | Add |
|-----|------|-----|
| Major | 1 | Unit: clear-search path — given previous active `workspaces`, after search then clear, visible is workspaces (not all) |
| Enhancement | 2 | Unit/source: hash id `api-tokens` resolves active to api-tokens |

## Fix ask (folded into 04-tasks)

See Task 1–2 TDD bullets updated below in `04-tasks.md`.

## Round notes

- After fold → ready for Gate B.
