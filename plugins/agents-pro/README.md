# agents-pro

Professional specialist agents: security experts, architecture reviewers, creative tools, research analysts, and infrastructure engineers.

## Installation

```bash
/plugin install agents-pro@ForgePlan-marketplace
```

## Agents (21)

### Security (4)

| Agent | Description |
|-------|-------------|
| `security-expert` | OWASP Top 10 detection, secret scanning, threat modeling (STRIDE/DREAD), compliance auditing |
| `claims-authorizer` | Claims-based ABAC/RBAC policies, fine-grained permissions, audit trails |
| `injection-analyst` | Prompt injection and jailbreak detection with 6-type threat taxonomy |
| `pii-detector` | PII and credential scanning with API key regexes and compliance mapping |

### Architecture (6)

| Agent | Description |
|-------|-------------|
| `adr-architect` | Architecture Decision Records using MADR 3.0 format |
| `architect-reviewer` | System design validation, pattern assessment, scalability analysis |
| `ddd-domain-expert` | Bounded contexts, aggregate design, domain modeling, context mapping |
| `distributed-systems-expert` | Consensus protocols (Raft, PBFT, Paxos), CRDTs, gossip protocols |
| `goal-planner` | Goal-Oriented Action Planning (GOAP) with A* search and OODA loop |
| `microservices-architect` | Microservice design, service boundaries, resilience, operational excellence |

### Creative (4)

| Agent | Description |
|-------|-------------|
| `api-docs-engineer` | OpenAPI 3.0 spec generation and maintenance |
| `documentation-engineer` | Information architecture, API docs, tutorials, reference guides |
| `prompt-engineer` | Prompt design, optimization, few-shot/CoT patterns, A/B testing |
| `ui-designer` | Design systems, interaction patterns, visual hierarchy, accessibility |

### Research (5)

| Agent | Description |
|-------|-------------|
| `code-analyzer` | Code quality analysis across quality, performance, security, architecture, and tech debt |
| `memory-specialist` | HNSW indexing, vector quantization, hybrid search with RRF fusion |
| `ml-developer` | End-to-end ML workflows: preprocessing, training, tuning, evaluation |
| `research-analyst` | Information gathering, synthesis, source evaluation, actionable intelligence |
| `search-specialist` | Advanced information retrieval, query optimization, knowledge discovery |

### Infrastructure (2)

| Agent | Description |
|-------|-------------|
| `mcp-developer` | Model Context Protocol server/client implementation, JSON-RPC 2.0 |
| `platform-engineer` | Internal developer platforms, self-service infrastructure, GitOps |

## Usage

After installation, agents are available via the `@agent-name` syntax:

```
@security-expert Review this code for OWASP Top 10 vulnerabilities
@architect-reviewer Evaluate the architecture of this project
@prompt-engineer Optimize this system prompt for accuracy
```

## License

MIT
