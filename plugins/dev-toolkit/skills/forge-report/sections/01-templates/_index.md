# 01-templates — 5 report templates

Pick the one that matches your task type. If unsure, `decision-summary` is the safest default.

| File | When to use |
|------|-------------|
| `build-summary.md` | Created/built something new (PR, feature, plugin, file) |
| `audit-summary.md` | Reviewed/audited code, security, architecture |
| `decision-summary.md` | Made + recorded a product/architecture decision |
| `incident-summary.md` | Debugged or resolved an incident |
| `migration-summary.md` | Refactored, migrated, modernised |

## Common structure

All templates share these sections (from `02-required-sections/`):

1. TL;DR (top)
2. Type-specific body (varies)
3. Not done (intentional)
4. Reversibility
5. Drift risks
6. Next steps
7. Cycle metadata (tool calls, files, time)

## Template selection rule

If a task spans multiple types (e.g. "audit + fix" = audit + build) — use the one whose **next step** is most actionable for the reader.
