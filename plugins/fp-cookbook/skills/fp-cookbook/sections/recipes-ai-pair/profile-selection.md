# Profile Selection: CRUD-R-A Matrix

## Цель

Choose the right forgeplan agent profile so the sub-agent has the correct
tool permissions and doesn't attempt forbidden operations (e.g., Profile B
trying to call `forgeplan_activate`).

## The 5 profiles

| Profile | Approach | Can Write Code? | Can Mutate Forgeplan? | Typical agents |
|---------|----------|:--------------:|:--------------------:|----------------|
| **A** Creator | Creates new artifacts | No (denies Write/Edit) | forgeplan_generate + forgeplan_new | artifact-author, adr-architect, goal-planner |
| **B** Reviewer | Audits + writes EVID | No (denies Write/Edit) | forgeplan_new EVID only | code-reviewer, evidence-recorder, security-expert |
| **C** Read-only | Research, synthesis | No | No mutations | research-analyst |
| **C-coder** | Source files only | Yes | No forgeplan mutations | coder |
| **D** Maintainer | Update existing artifact | No (denies Write/Edit) | forgeplan_update on existing | artifact-maintainer |

## Decision tree

```
Authoring a new PRD/ADR/RFC?            → Profile A
Reviewing code or writing Evidence?     → Profile B
Research / read-only analysis?          → Profile C
Writing/editing source files?           → Profile C-coder
Editing an existing artifact body?      → Profile D
```

## Команда

```bash
# Dispatch a Profile A agent to author a PRD
Agent({
  subagent_type: "artifact-author",
  prompt: "Create PRD for feature X per the following spec: ..."
})

# Dispatch a Profile C-coder to implement files
Agent({
  subagent_type: "coder",
  prompt: "Implement files per RFC-NNN. Write sections/getting-started/*.md only."
})
```

## What happens when wrong profile used

| Wrong choice | Failure mode |
|---|---|
| Profile B tries `forgeplan_activate` | Tool denied — artifact stays draft (Anomaly #7) |
| Profile A tries `Write` source file | Tool denied — no code written |
| Profile D calls `forgeplan_new` | Denied — D can only update existing |
| C-coder calls `forgeplan_validate` | Denied — no forgeplan mutations |

## Refs

- PRD-026 (active) — 17 canonical forgeplan-aware agents, B2 paradigm
- ADR-005 (active) — orchestrator + agent profile decisions
- `AGENT-AUTHORING-GUIDE.md` in fpl-skills plugin — canonical profile spec
