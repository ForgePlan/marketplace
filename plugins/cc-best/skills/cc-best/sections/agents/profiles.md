# Agent profiles — the CRUD-R-A matrix

Every agent that touches a structured-artifact store maps to **exactly one** profile. The profile fixes the model default and the set of tools the agent must not call. Mixing profiles in one agent means it can no longer be safely composed in a pipeline — refuse, and split it into two agents.

The matrix maps each operation on an artifact (Create / Read / Update / Review / Activate) to a profile.

## The five profiles

| Profile | Role | Produces | Denies (the load-bearing part) |
|---|---|---|---|
| **A** Creator | makes a new artifact | a draft artifact | Write/Edit/NotebookEdit + `forgeplan_activate` |
| **B** Reviewer | audits one artifact, records a verdict | an EVIDENCE artifact (PASS/CONCERNS/BLOCKER) | Write/Edit/NotebookEdit + `activate` + `reason` + `claims` + `memory_retain` |
| **C** Read-only | researches, returns synthesis | a handoff, no persistence | all mutations (forgeplan + hindsight writes) |
| **C-coder** | writes source code | code changes under `src/` | forgeplan mutations only — Write/Edit/Bash are **allowed** |
| **D** Maintainer | fixes an existing artifact in place | an updated artifact | `forgeplan_new` + Write/Edit + `activate` + `reason` |

## Rule — the profile is the separation-of-duty boundary

The two invariants the matrix exists to enforce:

1. **The creator never activates its own artifact.** Profile A makes drafts; activation is the orchestrator's / gate's call. This is why `forgeplan_activate` is denied for A, B, and D.
2. **The writer of code never records the verdict on it.** Profile C-coder writes the change; a separate Profile B reviewer reads the frozen result and produces the EVIDENCE. Generator ≠ verifier — see `when-to-use.md`.

Profile C-coder is the deliberate exception: it *is* allowed Write/Edit/Bash (it writes real source files), and denies only the artifact-store mutations. Recognise it by that inverted shape.

## Example — picking a profile from "what does it produce?"

```
What does the agent produce?
  new artifact (PRD/RFC/ADR/SPEC)      → Profile A   (adr-architect, specification)
  a verdict + findings on one artifact → Profile B   (code-reviewer, guardian, tester)
  a synthesis returned to caller       → Profile C   (research-analyst)
  source code under src/               → Profile C-coder (coder)
  a fix to metadata/links of an artifact → Profile D (artifact-maintainer)
  a side effect on the world (deploy)  → STOP — that's orchestrator territory, not an agent
```

The last branch matters: an agent that pushes, deploys, or sends a message is not an agent — surface it as an approval gate in the orchestrating skill.

## The B-orchestrator sub-profile

A narrow sub-profile of B for **strategic routers** (the `smith` master-orchestrator). Like Profile B it writes no source, mutates no artifact, activates nothing. Unlike a standard reviewer it does NOT audit one artifact and does NOT produce an EVIDENCE — it reads *broad* project state (health + blocked + stale + git) and returns a **Markdown routing plan** naming which downstream agents to dispatch.

It additionally denies `forgeplan_new`/`update`/`link` (no artifact creation) and `claim`/`release` (it claims no single artifact). Keep the set tiny — ideally one general router. More than 3-4 orchestrator agents across a marketplace is a smell; orchestration logic belongs in skills, not in a proliferation of agents.

## Trap — the "does everything" agent

The most common profile mistake is one agent that creates an artifact, reviews it, and activates it. That agent has no separation of duty — it can rubber-stamp its own work, which is exactly the failure the matrix prevents. Symptom: its `disallowedTools` is short or empty because "it needs everything". Fix: split it along the matrix — one Profile A creator, one Profile B reviewer, and let the orchestrator activate.

## Related

- `tools-and-denylist.md` — the exact denied-tool set for each profile + why
- `frontmatter.md` — the model default each profile uses
- `examples.md` — `coder` (C-coder) and `guardian` (B-gate) dissected
- `when-to-use.md` — the "side effect → orchestrator, not agent" rule in full
