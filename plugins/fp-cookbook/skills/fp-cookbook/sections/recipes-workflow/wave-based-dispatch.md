# Wave-Based Parallel Sub-Agent Dispatch

## Цель

Build multiple plugin files in parallel using file-isolated sub-agents,
achieving zero merge conflicts (proven pattern across Sprint A-O).

## The pattern

```
Wave 1: agents A, B, C work on disjoint file sets simultaneously
Wave 2: agents D, E, F pick up remaining files
Rule: no two agents touch the same file path
```

## Команда

```bash
# Step 1 — declare affected_files in PRD (enables bucketing)
# (see affected-files-frontmatter.md)

# Step 2 — dispatch via MCP
forgeplan_dispatch(agents=4, status="active")
# Returns: 4 file-isolated buckets

# Step 3 — each sub-agent gets one bucket
# Agent prompt structure:
# "You are building ONLY these files: [bucket]. Do not touch other paths."
```

## Пример (Sprint O — PRD-041 fp-cookbook)

```
Wave 1 (parallel):
  Agent A → sections/getting-started/ (3 recipe files)
  Agent B → sections/recipes-prd/ (4 recipe files)
  Agent C → sections/recipes-evidence/ (3 recipe files)
  Agent D → sections/recipes-workflow/ (3 recipe files)

Wave 2 (parallel):
  Agent E → sections/recipes-multiplugin/ (3 recipe files)
  Agent F → sections/recipes-ai-pair/ (3 recipe files)
  Agent G → sections/troubleshooting/ (5 recipe files)
  Agent H → sections/cli-cheatsheet/ (2 ref files)

Result: 0 merge conflicts, all files delivered
```

## File isolation rules

| Rule | Why |
|------|-----|
| Each agent owns ≥1 directory, never a partial directory | Avoids _index.md conflicts |
| SKILL.md and plugin.json reserved for orchestrator | These files reference all sections |
| Declare buckets BEFORE dispatching | Don't let agents self-assign |
| Wave 2 starts only after Wave 1 completes | Dependency on shared scaffolding |

## Common errors

| Error | Fix |
|-------|-----|
| Two agents both write `_index.md` | Assign entire section dirs, not individual files |
| `forgeplan_dispatch` returns serial | Missing `## Affected Files` in PRD; add it first |
| Agent overwrites another agent's file | Pre-assign explicit "DO NOT TOUCH" lists in prompts |

## Refs

- PRD-041 (active) — Sprint O wave dispatch with 4 parallel agents
- EVID-068 (active) — Sprint O delivery verification
- `affected-files-frontmatter.md` — prerequisite: declaring affected_files
