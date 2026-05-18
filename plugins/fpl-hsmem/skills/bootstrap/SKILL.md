---
name: bootstrap
description: Initialize Hindsight memory for a new project. Sets the bank mission, ingests existing formal artifacts (PRDs, RFCs, ADRs), and creates a small starter set of mental models. Use when the user says "set up memory for this project", "bootstrap hindsight here", "initialize Hindsight for <repo>", or when memory_status shows an empty bank in an active project.
allowed-tools: mcp__hindsight__memory_status, mcp__hindsight__memory_get_current_bank, mcp__hindsight__memory_set_mission, mcp__hindsight__document_ingest_file, mcp__hindsight__mental_model_create, mcp__hindsight__mental_model_list, Read, Glob
---

# Bootstrap project memory

One-time setup for a Hindsight bank when a project is newly activated.
This is not the technical wiring (`.mcp.json`, hooks — that's done by
`setup.js`); this is the **memory seeding** layer.

## Stop conditions

Skip and report if any of these are true:
- `memory_status` returns "unreachable" — tell the user to start Hindsight first
- `mental_model_list` already shows pages — the bank is initialized, only
  proceed if the user confirms re-bootstrap
- `cwd` is not a real project root — ask the user to confirm

## Steps

### 1. Sanity check
- `memory_get_current_bank` → confirm the bank ID with the user
- Read top of `README.md` / project's `CLAUDE.md` if present to understand
  the project's purpose
- Confirm with the user the proposed bank mission (one sentence)

### 2. Set mission
- `memory_set_mission` with the one-sentence description.
  Example: "ForgePlan workflow tooling — focus on memory, plugin, and
  marketplace decisions."

### 3. Ingest formal artifacts (if they exist)
Look for these locations and ingest each found file:
- `forge/prds/*.md`
- `forge/rfcs/*.md`
- `forge/adrs/*.md` or `docs/decisions/*.md`
- `docs/architecture.md` (top-level only)

For each: `document_ingest_file(path)`.
**Skip:** archived/old folders, generated docs, vendor folders.

### 4. Create starter mental models (2-3 max)
Propose to the user 2-3 mental models that fit this project. Examples:
- `decisions-log` — "What architectural / product decisions have we made and why?"
- `tech-debt` — "What technical debt have we identified but not yet addressed?"
- `team-conventions` — "What conventions / patterns are specific to this codebase?"
- `incident-history` — "What incidents have we hit and how were they resolved?" (for ops-heavy projects)

Only create what the user confirms. Less is more — empty mental models
create noise; full ones come from real conversation history.

### 5. Summary
Print a one-line summary:
```
Bootstrap complete:
- Mission set
- N documents ingested
- M mental models created
- Bank ready for auto-recall / auto-retain
```

## What NOT to do

- Don't ingest the entire codebase — Hindsight is for conversation
  history, not for storing code (use `Read` / `Grep` for code).
- Don't create mental models the user didn't approve.
- Don't ingest secrets, `.env` files, or credentials.
- Don't re-run on an already-initialized bank without explicit confirmation.
