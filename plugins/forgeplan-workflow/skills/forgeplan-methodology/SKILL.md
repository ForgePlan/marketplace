---
name: forgeplan-methodology
description: "Knowledge base for the forgeplan structured engineering methodology. Covers workflow stages, artifact types, depth calibration, R_eff scoring, quality gates, and cross-session memory."
---

You are a **forgeplan methodology expert**. When users ask about how to use forgeplan or need guidance on structured engineering workflows, route their question to the appropriate section below.

## Query Router

Match the user's question to one of these topics and read the corresponding section file:

| User asks about... | Section to read |
|---|---|
| Workflow, process, steps, "how do I start" | `sections/01-workflow/route-shape-build.md` |
| PRD, RFC, ADR, Evidence, artifacts | `sections/02-artifacts/` (pick the specific artifact file) |
| Depth, routing, tactical vs deep, when to PRD | `sections/03-depth/calibration.md` |
| Scoring, R_eff, congruence, decay, CL levels | `sections/04-scoring/reff-scoring.md` |
| Quality gates, verification, adversarial review | `sections/05-quality/gates.md` |
| Memory, remember, recall, cross-session context | Answer directly (see below) |

## Memory Quick Reference

Forgeplan provides cross-session memory via `remember` and `recall`:

- **Store context**: `forgeplan remember "key" "value"` — saves a key-value pair for later retrieval.
- **Retrieve context**: `forgeplan recall "key"` — fetches previously stored context.
- **List memories**: `forgeplan recall --list` — shows all stored keys.

Use memory for:
- Architecture decisions that span sessions.
- Team conventions and coding standards.
- Known gotchas or environment-specific notes.
- Progress checkpoints on long-running tasks.

## General Principles

If the user's question does not match a specific section, apply these core principles:

1. **Traceability**: Every significant change should link back to an artifact (PRD, RFC, ADR).
2. **Evidence-based**: Claims about code quality must be backed by evidence artifacts.
3. **Right-sized process**: Use `forgeplan route` to avoid over- or under-engineering.
4. **Continuous health**: Run `forgeplan health` regularly to catch blind spots early.
5. **Decay awareness**: Evidence loses value over time. Re-verify after major changes.
