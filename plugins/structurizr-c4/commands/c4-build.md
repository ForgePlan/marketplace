---
name: c4-build
description: Discover a system from code and documents, then build evidence-based Structurizr C4 views with saved layout and local exports.
argument-hint: "<system, source paths and architecture questions>"
---

Apply this plugin's `skills/structurizr-c4/SKILL.md` to the user's request:

$ARGUMENTS

Locate the skill through the current runtime's skill catalog; the relative fallback `../skills/structurizr-c4/SKILL.md` resolves against this command's actual file, never the project cwd or a fixed cache version. Read its `references/forgeplan.md` first.
Delegate to `structurizr-c4:structurizr-architect` when that Claude role is available; otherwise use the current client's native architecture-scoped worker with portable `structurizr-c4`.
Preserve the assigned workspace and IDs; deliver the full native contract and actual report path. Do not silently overwrite a report or substitute Mermaid when verification is unavailable.
