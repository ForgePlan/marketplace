# Task / Sub-Agent Dispatch Patterns

## Цель

Write effective sub-agent dispatch prompts that result in correct,
self-contained deliverables with no ambiguity about scope.

## Dispatch anatomy

A good dispatch prompt has 5 parts:

```
1. Identity tag    — who this agent is (profile + task-id)
2. Scope           — exactly which files/artifacts to touch
3. Context         — what RFC/PRD to read for spec
4. Hard constraints — what NOT to do (other files, forgeplan mutations)
5. Return format   — what to output when done
```

## Команда (using Agent tool)

```
Agent({
  subagent_type: "coder",
  prompt: `
You are Profile C-coder / coder-task-042.

SCOPE: Write ONLY these files:
  plugins/fp-cookbook/skills/fp-cookbook/sections/getting-started/*.md
  (3 recipe files: install-forgeplan-cli.md, init-workspace.md, first-prd-walkthrough.md)

SPEC: Read PRD-013 via forgeplan_get(id="PRD-013"). Section content guidance
      in the 'getting-started/' subsection of the prompt.

CONSTRAINTS:
  - Do NOT touch any file outside sections/getting-started/
  - Do NOT call forgeplan_activate, forgeplan_new, forgeplan_validate
  - Each recipe: 40-80 LOC, uniform structure (Цель/Команда/Пример/Common errors/Refs)

RETURN: file list + total LOC for your section.
  `
})
```

## Anti-patterns in dispatch prompts

| Anti-pattern | Why bad | Fix |
|---|---|---|
| "Do whatever is needed" | Agent expands scope | List exact files |
| No CONSTRAINTS section | Agent calls forbidden tools | Always include what NOT to do |
| Missing return format | Agent outputs free prose | Specify structured return |
| One agent for 20+ files | Too large, context overflows | Use waves: 4-6 files per agent |

## Пример good vs bad

```
BAD:  "Build the getting-started section for fp-cookbook."
GOOD: "Write exactly 3 files in sections/getting-started/: 
       install-forgeplan-cli.md, init-workspace.md, first-prd-walkthrough.md.
       Each 40-80 LOC. Do not touch other directories."
```

## Refs

- PRD-025 (active) — multi-agent dispatch architecture
- PRD-026 (active) — 17 forgeplan-aware agents + profile specs
- `profile-selection.md` — choose the right profile before dispatching
