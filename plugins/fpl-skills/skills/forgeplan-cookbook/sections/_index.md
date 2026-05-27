# Flat tool index — all 66 MCP tools + 82 CLI subcommands

Alphabetical, with one-line description + section reference. Use this when you know the tool name and need to find which cookbook section covers it. For use-case-driven lookup, use the main `SKILL.md` Quick router.

## A

| Tool | Description | Section |
|---|---|---|
| `forgeplan_activate` | draft → active (with MUST validation gate) | [`01`](01-lifecycle.md) |
| `forgeplan_activity` | query activity log (JSONL audit) | [`09`](09-activity-and-audit.md) |
| `forgeplan_activity_stats` | aggregate activity stats per tool | [`09`](09-activity-and-audit.md) |
| `forgeplan_anomalies` | detect 9 anomaly kinds (severity + tier) | [`04`](04-pipeline-health.md) |

## B

| Tool | Description | Section |
|---|---|---|
| `forgeplan_blindspots` | decisions without evidence + orphan artifacts | [`04`](04-pipeline-health.md) |
| `forgeplan_blocked` | blocked artifacts + unmet dependencies | [`04`](04-pipeline-health.md) |

## C

| Tool | Description | Section |
|---|---|---|
| `forgeplan_calibrate` | suggest depth from content | [`03`](03-quality-gates.md) |
| `forgeplan_capture` | LLM-classify decision → Note or ADR | [`06`](06-ai-driven-commands.md) |
| `forgeplan_claim` | claim artifact for exclusive work | [`07`](07-multi-agent-coordination.md) |
| `forgeplan_claims` | list live claims | [`07`](07-multi-agent-coordination.md) |
| `forgeplan_contradictions` | detect cross-artifact contradictions | [`04`](04-pipeline-health.md) |
| `forgeplan_coverage` | code-module decision coverage | [`04`](04-pipeline-health.md) |
| `forgeplan_coverage_business` | DM extract score (issue #287) | [`04`](04-pipeline-health.md) |

## D

| Tool | Description | Section |
|---|---|---|
| `forgeplan_decay` | evidence-decay impact on R_eff | [`04`](04-pipeline-health.md) |
| `forgeplan_decompose` | LLM: PRD → RFC tasks | [`06`](06-ai-driven-commands.md) |
| `forgeplan_delete` | soft delete (30-day recoverable) | [`01`](01-lifecycle.md) |
| `forgeplan_deprecate` | active/stale → deprecated with reason | [`01`](01-lifecycle.md) |
| `forgeplan_discover_complete` | close brownfield session | [`08`](08-brownfield-discovery.md) |
| `forgeplan_discover_finding` | report finding mid-session | [`08`](08-brownfield-discovery.md) |
| `forgeplan_discover_start` | open brownfield discovery session | [`08`](08-brownfield-discovery.md) |
| `forgeplan_dispatch` | parallel-safe work plan for N agents | [`07`](07-multi-agent-coordination.md) |
| `forgeplan_drift` | affected files changed after decision | [`04`](04-pipeline-health.md) |

## E

| Tool | Description | Section |
|---|---|---|
| `forgeplan_estimate` | multi-grade effort estimate | [`03`](03-quality-gates.md) |
| `forgeplan_export` | export workspace to JSON | [`09`](09-activity-and-audit.md) |

## F

| Tool | Description | Section |
|---|---|---|
| `forgeplan_fpf_check` | which FPF rules match an artifact | [`10`](10-fpf-knowledge-base.md) |
| `forgeplan_fpf_list` | list all KB sections | [`10`](10-fpf-knowledge-base.md) |
| `forgeplan_fpf_rules` | list active rules + filters | [`10`](10-fpf-knowledge-base.md) |
| `forgeplan_fpf_search` | search KB (keyword + semantic) | [`10`](10-fpf-knowledge-base.md) |
| `forgeplan_fpf_section` | get section by ID | [`10`](10-fpf-knowledge-base.md) |

## G

| Tool | Description | Section |
|---|---|---|
| `forgeplan_generate` | LLM: generate artifact from description | [`06`](06-ai-driven-commands.md) |
| `forgeplan_get` | read full artifact + body | [`01`](01-lifecycle.md) |
| `forgeplan_graph` | mermaid dependency graph | [`02`](02-discovery-and-search.md) |
| `forgeplan_guard` | check session-phase transition | [`05`](05-session-and-phase.md) |

## H

| Tool | Description | Section |
|---|---|---|
| `forgeplan_health` | full project health dashboard | [`04`](04-pipeline-health.md) |
| `forgeplan_hypothesis_promote` | move HYP through verification states | [`08`](08-brownfield-discovery.md) |
| `forgeplan_hypothesis_status` | query HYP lifecycle state | [`08`](08-brownfield-discovery.md) |

## I

| Tool | Description | Section |
|---|---|---|
| `forgeplan_import` | import workspace from JSON | [`09`](09-activity-and-audit.md) |
| `forgeplan_ingest` | mapping-driven plugin-output ingestion | [`09`](09-activity-and-audit.md) |
| `forgeplan_init` | initialise .forgeplan/ workspace | [`09`](09-activity-and-audit.md) |
| `forgeplan_interview_packet_draft` | brownfield interview (STUB, plugin-deferred) | [`08`](08-brownfield-discovery.md) |
| `forgeplan_interview_packet_ingest` | brownfield interview (STUB, plugin-deferred) | [`08`](08-brownfield-discovery.md) |

## J

| Tool | Description | Section |
|---|---|---|
| `forgeplan_journal` | chronological decision timeline | [`02`](02-discovery-and-search.md) |

## L

| Tool | Description | Section |
|---|---|---|
| `forgeplan_link` | typed relation between two artifacts | [`01`](01-lifecycle.md) |
| `forgeplan_list` | filter by kind / status | [`02`](02-discovery-and-search.md) |

## N

| Tool | Description | Section |
|---|---|---|
| `forgeplan_new` | create new artifact from template | [`01`](01-lifecycle.md) |

## O

| Tool | Description | Section |
|---|---|---|
| `forgeplan_order` | topological order + cycle detection | [`02`](02-discovery-and-search.md) |
| `forgeplan_orphans` | brownfield orphans (issue #287) | [`04`](04-pipeline-health.md) |

## P

| Tool | Description | Section |
|---|---|---|
| `forgeplan_phase` | read artifact lifecycle phase | [`05`](05-session-and-phase.md) |
| `forgeplan_phase_advance` | set artifact lifecycle phase | [`05`](05-session-and-phase.md) |
| `forgeplan_playbook_list` | list discoverable playbooks | [`11`](11-playbooks.md) |
| `forgeplan_playbook_run` | execute playbook (security gates: yes + allow_shell) | [`11`](11-playbooks.md) |
| `forgeplan_playbook_show` | show one playbook's parsed struct | [`11`](11-playbooks.md) |
| `forgeplan_playbook_validate` | structural validation | [`11`](11-playbooks.md) |
| `forgeplan_plugins_doctor` | health-check installed plugins | [`12`](12-plugins-registry.md) |
| `forgeplan_plugins_info` | details for one plugin | [`12`](12-plugins-registry.md) |
| `forgeplan_plugins_list` | list detected plugins | [`12`](12-plugins-registry.md) |
| `forgeplan_progress` | checkbox progress in artifact bodies | [`02`](02-discovery-and-search.md) |

## R

| Tool | Description | Section |
|---|---|---|
| `forgeplan_reason` | LLM: FPF ADI hypotheses (S10) | [`06`](06-ai-driven-commands.md) |
| `forgeplan_release` | release artifact claim | [`07`](07-multi-agent-coordination.md) |
| `forgeplan_release_notes` | Keep-a-Changelog notes from git refs | [`13`](13-release-notes.md) |
| `forgeplan_restore` | recover soft-deleted artifact | [`01`](01-lifecycle.md) |
| `forgeplan_review` | validate + lifecycle checklist | [`03`](03-quality-gates.md) |
| `forgeplan_route` | LLM/rules: depth + pipeline suggestion | [`06`](06-ai-driven-commands.md) |

## S

| Tool | Description | Section |
|---|---|---|
| `forgeplan_score` | compute R_eff (weakest-link) | [`03`](03-quality-gates.md) |
| `forgeplan_search` | BM25 + semantic + graph expansion | [`02`](02-discovery-and-search.md) |
| `forgeplan_session` | current methodology session phase | [`05`](05-session-and-phase.md) |
| `forgeplan_stale` | artifacts with expired valid_until | [`04`](04-pipeline-health.md) |
| `forgeplan_status` | counts by kind + status | [`04`](04-pipeline-health.md) |
| `forgeplan_supersede` | active → superseded with replacement | [`01`](01-lifecycle.md) |

## U

| Tool | Description | Section |
|---|---|---|
| `forgeplan_undo_last` | reverse last destructive op | [`01`](01-lifecycle.md) |
| `forgeplan_unlink` | remove typed relation | [`01`](01-lifecycle.md) |
| `forgeplan_update` | update metadata or body (⚠️ literal-string only) | [`01`](01-lifecycle.md) + [`14`](14-mcp-safety-warnings.md) |

## V

| Tool | Description | Section |
|---|---|---|
| `forgeplan_validate` | schema check (MUST / SHOULD / COULD) | [`03`](03-quality-gates.md) |

## CLI-only (no MCP surface yet)

| Command | Purpose | Section |
|---|---|---|
| `forgeplan ci-assign-id` | CI atomic assigner (PROB-060) | [`09`](09-activity-and-audit.md) |
| `forgeplan embed` | generate embeddings for semantic search | [`09`](09-activity-and-audit.md) |
| `forgeplan git-sync` | sync git pull/merge to LanceDB | [`09`](09-activity-and-audit.md) |
| `forgeplan log` | change log / audit trail | [`09`](09-activity-and-audit.md) |
| `forgeplan mcp install` | wire MCP server into Claude / Cursor / Windsurf | (AGENTS.md) |
| `forgeplan migrate` | schema migrations | [`09`](09-activity-and-audit.md) |
| `forgeplan migrate-secrets` | import LLM keys (PRD-077) | [`09`](09-activity-and-audit.md) |
| `forgeplan promote` | Hindsight memory → full artifact | [`09`](09-activity-and-audit.md) |
| `forgeplan recall` | search saved memories | [`09`](09-activity-and-audit.md) |
| `forgeplan reconcile-ids` | fix identity drift | [`09`](09-activity-and-audit.md) |
| `forgeplan reindex` | rebuild LanceDB from .md files | [`09`](09-activity-and-audit.md) |
| `forgeplan remember` | save memory for later recall | [`09`](09-activity-and-audit.md) |
| `forgeplan renew` | extend stale artifact validity | [`09`](09-activity-and-audit.md) |
| `forgeplan reopen` | new draft + deprecate old | [`09`](09-activity-and-audit.md) |
| `forgeplan scan` | scan codebase for modules | [`09`](09-activity-and-audit.md) |
| `forgeplan scan-import` | import existing docs as artifacts | [`09`](09-activity-and-audit.md) |
| `forgeplan serve` | start MCP server (stdio) | (AGENTS.md) |
| `forgeplan setup-skill` | install /forge skill | (smith-bootstrap Step 1b) |
| `forgeplan tag` / `untag` | add / remove tag | (TBD) |
| `forgeplan tree` | ASCII artifact hierarchy | (TBD) |
| `forgeplan watch` | sync .forgeplan/ to LanceDB live | [`09`](09-activity-and-audit.md) |
