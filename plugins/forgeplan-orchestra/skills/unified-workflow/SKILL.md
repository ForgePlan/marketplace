---
name: unified-workflow
description: "Agentic RAG router for the Forgeplan + Orchestra + Claude Code unified workflow knowledge base. Routes questions to the correct section."
---

# Unified Workflow Knowledge Base

## Router

When the user asks about the unified workflow, route to the correct section file based on their need.

| Need | Section File |
|------|-------------|
| How the 3 systems work together | 01-architecture/bounded-contexts.md |
| Setting up a new project from scratch | 02-setup/greenfield.md |
| Migrating an existing project | 02-setup/brownfield.md |
| Custom fields reference (Artifact, Type, Depth, Phase, Sprint, Branch) | 03-fields/custom-fields.md |
| What to do in situation X (daily scenarios, playbook) | 04-playbook/scenarios.md |
| Solo developer configuration | 05-configs/solo.md |
| Small team (2-5) configuration | 05-configs/small-team.md |
| Medium team (5-15) configuration | 05-configs/medium-team.md |

## How to Use

1. Read the user's question.
2. Match it to the closest "Need" in the table above.
3. Read the corresponding section file for detailed guidance.
4. If the question spans multiple sections, read all relevant files.
5. Synthesize an answer from the section content — do not invent guidance not present in the files.

## Section Index

- **01-architecture/** — Bounded contexts, what lives where, key principles
- **02-setup/** — Greenfield (from scratch) and brownfield (migration) setup guides
- **03-fields/** — Custom fields reference, Status-Phase mapping, what NOT to add
- **04-playbook/** — Daily workflow scenarios, prohibitions, Inbox Pattern
- **05-configs/** — Configuration guides for solo, small team, and medium team setups
