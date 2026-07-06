# agents-pro

Professional specialist agents: security experts, architecture reviewers, creative tools, research analysts, infrastructure engineers, and **forgeplan-aware canonical pipeline agents** (PRD-026, B2 paradigm).

## Installation

```bash
/plugin install agents-pro@ForgePlan-marketplace
```

## Smith — master orchestrator (NEW v1.10.0+)

> Routes 14 contexts to the right methodology + dispatch sequence — the "BMAD Master" of the ForgePlan ecosystem.

Smith is a **Profile B-orchestrator** (new sub-profile per AGENT-AUTHORING-GUIDE L1162-1268). It is the only agent in the marketplace that reads project state, classifies the task into 1 of 14 contexts, and recommends a methodology + dispatch sequence. The smith agent body lives in `agents-pro`; its 4 user-facing skills (`/smith`, `/smith-bootstrap`, `/smith-plan`, `/smith-routing`) live in `fpl-skills`.

| Component | Where |
|---|---|
| `smith` agent | `plugins/agents-pro/agents/smith.md` (this plugin) |
| 4 `/smith*` skills | `plugins/fpl-skills/skills/smith*/` (sibling plugin) |
| Routing brain (14 ctx × 29 methodologies) | `plugins/fpl-skills/skills/smith/routing-map.md` |
| 5 templates (smith-plan / smith-bootstrap / smith-handoff / post-mortem / routing-decision) | `plugins/fpl-skills/templates/` |

> [!TIP]
> Smith requires BOTH `agents-pro` AND `fpl-skills` to be installed. Smith picks **which** methodology + agents apply; downstream specialists execute.

Full guide: [`docs/SMITH.md`](../../docs/SMITH.md).

For context on how smith and the canonical pipeline agents (Profile A creators, Profile B reviewers, guardian gate) integrate into the complete workflow, see the [Process Reference (EN)](../../docs/process-from-idea-to-delivery-EN.md) / [(RU)](../../docs/process-from-idea-to-delivery-RU.md).

Trigger phrases: `smith`, `кузнец`, `что дальше`, `scrum master`, `master orchestrator`.

## Agents (30)

Legend: ⚙ = forgeplan-aware (B2 paradigm — `disallowedTools` denylist + canonical pipeline profile A/B/C/D).

### Forgeplan canonical pipeline (14 agents, all ⚙)

| Agent | Profile | Description |
|-------|:-------:|-------------|
| `smith` ⚙ | B-orchestrator | **Master orchestrator** — routes 14 contexts to methodology + dispatch sequence; never writes code or activates artifacts (see [Smith section](#smith--master-orchestrator-new-v1100) above) |
| `artifact-author` ⚙ | A (generic) | Generic Profile A creator for any forgeplan artifact kind (primary `forgeplan_generate`, fallback `forgeplan_new` + manual body) |
| `artifact-maintainer` ⚙ | D (NEW) | In-place metadata maintenance on EXISTING artifacts — congruence_level, evidence_type, broken links, status changes |
| `artifact-reviewer` ⚙ | B (generic) | Artifact health audit — schema completeness, link graph health, freshness/decay, R_eff trust |
| `adr-architect` ⚙ | A | Architecture Decision Records using MADR 3.0 format |
| `architect-reviewer` ⚙ | B | RFC fitness review against parent PRD — modular boundaries, coupling, data-flow, blast radius |
| `brief-intake` ⚙ | A | First-touch intake — raw idea → structured Brief NOTE artifact |
| `evidence-recorder` ⚙ | B (fallback) | Generic Profile B EVIDENCE recorder for phases without kind-specialist |
| `evidence-gatherer` ⚙ | B (research) | Trust Calculus evidence collector — searches 20-30 sources across 5+ categories, scores F+G+R per hypothesis, writes a canonical EVID; dispatched by `adr-architect` / `/decision` / `guardian` when an existing hypothesis scores below threshold |
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

The 14 forgeplan-aware agents in this pack implement the **B2 paradigm** — `disallowedTools` denylist (not `tools:` allowlist) — to work around Claude Code's MCP propagation bug (#53865) where wildcard entries in subagent tools silently strip the entire MCP server.

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
# Master orchestrator (picks methodology + dispatch sequence)
Task({ subagent_type: "smith", prompt: "Plan next move for current session state" })

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
- **v1.8.1** (Sprint E) — Profile B agents patched with Step 9b sentinel emit instruction (organic `<<NEEDS_ACTIVATION>>` emission per PRD-032 + PRD-033)
- **v1.10.0+** (EPIC-002, 2026-05-26) — **Smith master-orchestrator agent added** — first Profile B-orchestrator sub-profile in the marketplace; 12-context routing matrix + 27 methodology cards (4 user-facing skills live in `fpl-skills`). See [Smith section](#smith--master-orchestrator-new-v1100) and [`docs/SMITH.md`](../../docs/SMITH.md).
- **v1.12.0** (current) — EPIC-003 guardian Step 5 verdict-matrix rows + `evidence-gatherer` Trust Calculus agent in the canonical pipeline (30 agents total, 14 forgeplan-aware).

For complete change history, see [`forgeplan-marketplace/CLAUDE.md`](../../CLAUDE.md) § Sprint A-E session.

## Profile B sentinel emission (Sprint E)

Profile B reviewer agents in this pack (`artifact-reviewer`, `architect-reviewer`, `evidence-recorder`, `guardian`, `security-expert`, `system-dev`) emit `<<NEEDS_ACTIVATION: EVID-XXX>>` as first line of their return value to the orchestrator when an EVIDENCE artifact is complete + R_eff>0. This closes the canonical pipeline activate step automatically — no manual cleanup needed.

Full spec: `plugins/fpl-skills/AGENT-AUTHORING-GUIDE.md` → "Profile B Step 9b — Surface NEEDS_ACTIVATION sentinel".

## License

MIT
