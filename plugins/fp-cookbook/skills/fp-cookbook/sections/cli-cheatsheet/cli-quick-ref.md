# Forgeplan CLI Quick Reference

All `forgeplan <command>` commands. Requires `forgeplan` ≥ v0.31.0.

## Workspace

| Command | Synopsis | Example |
|---------|----------|---------|
| `forgeplan init` | Initialise `.forgeplan/` in current dir | `forgeplan init` |
| `forgeplan health` | Check workspace + MCP connectivity | `forgeplan health` |
| `forgeplan version` / `--version` | Show CLI version | `forgeplan --version` |

## Artifact creation

| Command | Synopsis | Example |
|---------|----------|---------|
| `forgeplan new prd "title"` | Create PRD artifact (status=draft) | `forgeplan new prd "Feature X"` |
| `forgeplan new evidence "title"` | Create EVID artifact | `forgeplan new evidence "Sprint P verification"` |
| `forgeplan new adr "title"` | Create ADR artifact | `forgeplan new adr "Choose DB engine"` |
| `forgeplan new rfc "title"` | Create RFC artifact | `forgeplan new rfc "API contract v2"` |
| `forgeplan new note "title"` | Create NOTE artifact | `forgeplan new note "Research findings"` |

## Artifact lifecycle

| Command | Synopsis | Example |
|---------|----------|---------|
| `forgeplan validate ID` | Validate artifact body completeness | `forgeplan validate PRD-013` |
| `forgeplan activate ID` | Transition artifact to active | `forgeplan activate PRD-013` |
| `forgeplan deprecate ID` | Mark artifact deprecated | `forgeplan deprecate ADR-002` |
| `forgeplan supersede ID by=NEW` | Supersede by another artifact | `forgeplan supersede ADR-004 by=ADR-005` |

## Querying

| Command | Synopsis | Example |
|---------|----------|---------|
| `forgeplan list` | List all artifacts | `forgeplan list` |
| `forgeplan list --status draft` | Filter by status | `forgeplan list --status active` |
| `forgeplan list --kind prd` | Filter by kind | `forgeplan list --kind evidence` |
| `forgeplan get ID` | Full artifact detail | `forgeplan get PRD-026` |
| `forgeplan search "query"` | Text search across all artifacts | `forgeplan search "R_eff cascade"` |

## Scoring & analysis

| Command | Synopsis | Example |
|---------|----------|---------|
| `forgeplan score ID` | Compute R_eff for artifact | `forgeplan score PRD-033` |
| `forgeplan health` | Workspace overview + anomaly count | `forgeplan health` |
| `forgeplan drift ID` | Check if dependent files changed since create | `forgeplan drift ADR-005` |
| `forgeplan stale` | List potentially stale artifacts | `forgeplan stale` |

## Links

| Command | Synopsis | Example |
|---------|----------|---------|
| `forgeplan link SRC TGT --relation REL` | Create link between artifacts | `forgeplan link EVID-069 PRD-013 --relation informs` |
| `forgeplan unlink SRC TGT --relation REL` | Remove link (v0.31.0+) | `forgeplan unlink EVID-033 PRD-021 --relation based_on` |

## Routing

| Command | Synopsis | Example |
|---------|----------|---------|
| `forgeplan route "description"` | Risk assessment + depth suggestion | `forgeplan route "add new plugin"` |

## Relations cheat-sheet

```
supersedes : newer → older    informs : evidence → PRD
refines    : child → parent   based_on: dependent → dependency
```
