# agents — STUB

> **Status**: not yet authored. Coming in **RFC-006**.

This section will cover:

- Frontmatter canon (`name` / `description` / `model` / `color` / `disallowedTools`) per the B2 paradigm
- Five canonical profiles: A (creator), B (reviewer), C-coder (source-file writer), D (maintainer), and gate
- When to use each profile and how to recognise misuse
- Real production examples (annotated from `agents-pro`, `agents-core`, `forgeplan-brownfield-pack`)

Until shipped, see:

- `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` — canonical pattern document (~1100 lines)
- Existing agents in `plugins/agents-pro/agents/` for reference frontmatters
- LR-1..LR-8 lint rules in `scripts/validate-all-plugins.sh` for enforced invariants
