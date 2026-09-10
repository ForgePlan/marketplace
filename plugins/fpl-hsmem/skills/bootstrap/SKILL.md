---
name: bootstrap
description: |
  One-time seeding of a bank for a project that has just been activated: set the bank's persona,
  ingest the formal artifacts that already exist, and create a small starter set of knowledge pages.
  Not the technical wiring — that is the setup CLI — but the layer that decides what this bank is
  for before it accumulates thousands of facts nobody chose.
  EN: Seed a new bank — mission, existing PRDs/RFCs/ADRs, two or three starter pages. Use on a fresh
  project or when memory_status shows an empty bank in an active repo. Run /fpl-hsmem:audit-bank
  first if the bank is NOT empty: bootstrap assumes it is starting from nothing.
  RU: Засеять новый банк — миссия, существующие PRD/RFC/ADR, две-три стартовые страницы. Для нового
  проекта или когда в активном репозитории банк пуст. Если банк НЕ пуст, сперва прогнать
  /fpl-hsmem:audit-bank: bootstrap исходит из того, что начинает с нуля.
  Triggers: "set up memory for this project", "bootstrap hindsight", "initialize memory",
  "seed the bank", "новый проект память", "настрой память для проекта", "засей банк",
  "инициализируй hindsight"
hindsight-tools: [memory_status, memory_get_current_bank, memory_set_mission, document_ingest_file, mental_model_create, mental_model_list, bank_config_get, directive_create]
extra-tools: [Read, Glob]
allowed-tools: mcp__hindsight__memory_status, mcp__plugin_fpl-hsmem_hindsight__memory_status, mcp__hindsight__memory_get_current_bank, mcp__plugin_fpl-hsmem_hindsight__memory_get_current_bank, mcp__hindsight__memory_set_mission, mcp__plugin_fpl-hsmem_hindsight__memory_set_mission, mcp__hindsight__document_ingest_file, mcp__plugin_fpl-hsmem_hindsight__document_ingest_file, mcp__hindsight__mental_model_create, mcp__plugin_fpl-hsmem_hindsight__mental_model_create, mcp__hindsight__mental_model_list, mcp__plugin_fpl-hsmem_hindsight__mental_model_list, mcp__hindsight__bank_config_get, mcp__plugin_fpl-hsmem_hindsight__bank_config_get, mcp__hindsight__directive_create, mcp__plugin_fpl-hsmem_hindsight__directive_create, Read, Glob
---

# Bootstrap project memory

One-time setup for a Hindsight bank when a project is newly activated.
This is not the technical wiring (`.mcp.json`, hooks — that's done by
`setup.js`); this is the **memory seeding** layer.


## Model tier

**This skill asks for tier B.**

Choosing the mission and the first pages sets what this bank collects for its
whole life. Cheap to redo on day one, expensive once thousands of facts have been extracted under
the wrong instruction — which is why the tier is set by the decision, not by the number of calls.

`model:` values like `opus` / `sonnet` / `haiku` are Claude Code names, not the
requirement. On another runtime substitute whatever serves this tier there, and when you cannot
tell, miss **upward**. Saving cost means giving a skill less work, not a weaker model.

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
