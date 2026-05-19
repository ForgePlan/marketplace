# agents-pro

Professional specialist agents: security experts, architecture reviewers, creative tools, research analysts, infrastructure engineers, and **forgeplan-aware canonical pipeline agents** (PRD-026, B2 paradigm).

## Installation

```bash
/plugin install agents-pro@ForgePlan-marketplace
```

## Agents (28)

Legend: ⚙ = forgeplan-aware (B2 paradigm — `disallowedTools` denylist + canonical pipeline profile A/B/C/D).

### Forgeplan canonical pipeline (12 agents, all ⚙)

| Agent | Profile | Description |
|-------|:-------:|-------------|
| `artifact-author` ⚙ | A (generic) | Generic Profile A creator for any forgeplan artifact kind (primary `forgeplan_generate`, fallback `forgeplan_new` + manual body) |
| `artifact-maintainer` ⚙ | D (NEW) | In-place metadata maintenance on EXISTING artifacts — congruence_level, evidence_type, broken links, status changes |
| `artifact-reviewer` ⚙ | B (generic) | Artifact health audit — schema completeness, link graph health, freshness/decay, R_eff trust |
| `adr-architect` ⚙ | A | Architecture Decision Records using MADR 3.0 format |
| `architect-reviewer` ⚙ | B | RFC fitness review against parent PRD — modular boundaries, coupling, data-flow, blast radius |
| `brief-intake` ⚙ | A | First-touch intake — raw idea → structured Brief NOTE artifact |
| `evidence-recorder` ⚙ | B (fallback) | Generic Profile B EVIDENCE recorder for phases without kind-specialist |
| `goal-planner` ⚙ | A | GOAP decomposition — PRD/EPIC → set of RFC tasks via `forgeplan_decompose` |
| `guardian` ⚙ | B-gate | Pre-activation gate — binary verdict PASS/CONCERNS/BLOCKER from full EVID chain |
| `research-analyst` ⚙ | C (read-only) | Read-only research — internal context + external prior art, never persists state |
| `security-expert` ⚙ | B | Security audit — OWASP/STRIDE/CWE findings as EVIDENCE artifact |
| `system-dev` ⚙ | B (staff) | Staff/principal-level final auditor — long-term maintainability, blast radius, system-wide review |

### Security (3 specialists, non-canonical)

| Agent | Description |
|-------|-------------|
| `claims-authorizer` | Claims-based ABAC/RBAC policies, fine-grained permissions, audit trails |
| `injection-analyst` | Prompt injection and jailbreak detection with 6-type threat taxonomy |
| `pii-detector` | PII and credential scanning with API key regexes and compliance mapping |

### Architecture (3 specialists, non-canonical)

| Agent | Description |
|-------|-------------|
| `ddd-domain-expert` | Bounded contexts, aggregate design, domain modeling, context mapping |
| `distributed-systems-expert` | Consensus protocols (Raft, PBFT, Paxos), CRDTs, gossip protocols |
| `microservices-architect` | Microservice design, service boundaries, resilience, operational excellence |

### Creative (4)

| Agent | Description |
|-------|-------------|
| `api-docs-engineer` | OpenAPI 3.0 spec generation and maintenance |
| `documentation-engineer` | Information architecture, API docs, tutorials, reference guides |
| `prompt-engineer` | Prompt design, optimization, few-shot/CoT patterns, A/B testing |
| `ui-designer` | Design systems, interaction patterns, visual hierarchy, accessibility |

### Research (4 specialists, non-canonical)

| Agent | Description |
|-------|-------------|
| `code-analyzer` | Code quality analysis across quality, performance, security, architecture, and tech debt |
| `memory-specialist` | HNSW indexing, vector quantization, hybrid search with RRF fusion |
| `ml-developer` | End-to-end ML workflows: preprocessing, training, tuning, evaluation |
| `search-specialist` | Advanced information retrieval, query optimization, knowledge discovery |

### Infrastructure (2)

| Agent | Description |
|-------|-------------|
| `mcp-developer` | Model Context Protocol server/client implementation, JSON-RPC 2.0 |
| `platform-engineer` | Internal developer platforms, self-service infrastructure, GitOps |

## Forgeplan-aware agent layer (PRD-026)

The 12 forgeplan-aware agents in this pack implement the **B2 paradigm** — `disallowedTools` denylist (not `tools:` allowlist) — to work around Claude Code's MCP propagation bug (#53865) where wildcard entries in subagent tools silently strip the entire MCP server.

Each agent has a **canonical profile** dictating its forgeplan surface:

| Profile | Identity | Forgeplan operations allowed |
|---------|----------|-------------------------------|
| **A** Creator | Creates new artifacts | `forgeplan_new`, `_update`, `_link`, `_validate`, `_generate`, `_get`, `_list`, `_search`; denies `_activate` |
| **B** Reviewer | Audits, produces EVIDENCE | `forgeplan_new` (EVID kind), `_update`, `_link`, `_validate`, `_get`, `_list`, `_search`; denies `_activate/_reason/_claims/_release/memory_retain` |
| **C** Read-only | Research, no state mutation | `forgeplan_get`, `_list`, `_search`, `_health`; denies ALL mutations |
| **C-coder** | Source files only | Source mutations via Write/Edit/Bash; denies all forgeplan mutations |
| **D** Maintainer | Fix existing artifacts | `forgeplan_update`, `_link`, `_validate`, `_get`, `_list`, `_search`; denies `_new`, `_activate`, `_reason`, Write/Edit |

See [AGENT-AUTHORING-GUIDE.md](../fpl-skills/AGENT-AUTHORING-GUIDE.md) for full authoring conventions and the 5 canonical profiles documentation.

## Usage

After installation, agents are available via the `Task` tool with `subagent_type`:

```
# Canonical pipeline
Task({ subagent_type: "artifact-author", prompt: "Create PRD for ..." })
Task({ subagent_type: "artifact-reviewer", prompt: "Audit PRD-026 health" })
Task({ subagent_type: "guardian", prompt: "Gate check PRD-026 for activation" })

# Domain specialists
Task({ subagent_type: "security-expert", prompt: "Review codebase for OWASP Top 10" })
Task({ subagent_type: "architect-reviewer", prompt: "Review RFC-003 fitness" })
Task({ subagent_type: "prompt-engineer", prompt: "Optimize this system prompt" })
```

## Version history

- **v1.8.0** (current, 2026-05-19) — Sprint B canonical-lint compliance
  - All 16 non-canonical specialists migrated to canonical pattern: `model: sonnet/opus`, hex colors, bilingual EN/RU/Triggers descriptions
  - Forgeplan-aware agents include methodology citation as first line of description (BMAD-Brief / MADR 3.0 / FPF-Decompose / CRUD-R-A profile labels)
  - Closed marketplace-wide lint warnings 121 → 0 (LR-1..LR-3 pass)
- **v1.8.1** (in-flight, Sprint E) — Profile B agents patched with Step 9b sentinel emit instruction (organic `<<NEEDS_ACTIVATION>>` emission per PRD-032 + PRD-033)

For complete change history, see [`forgeplan-marketplace/CLAUDE.md`](../../CLAUDE.md) § Sprint A-E session.

## Profile B sentinel emission (Sprint E)

Profile B reviewer agents in this pack (`artifact-reviewer`, `architect-reviewer`, `evidence-recorder`, `guardian`, `security-expert`, `system-dev`) emit `<<NEEDS_ACTIVATION: EVID-XXX>>` as first line of their return value to the orchestrator when an EVIDENCE artifact is complete + R_eff>0. This closes the canonical pipeline activate step automatically — no manual cleanup needed.

Full spec: `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` → "Profile B Step 9b — Surface NEEDS_ACTIVATION sentinel".

## License

MIT
