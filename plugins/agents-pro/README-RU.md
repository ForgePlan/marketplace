[English](README.md) | [Русский](README-RU.md)

# agents-pro

Профессиональные специалисты: security, архитектура, creative, research, инфраструктура.

## Установка

```
/plugin install agents-pro@ForgePlan-marketplace
```

## Smith — мастер-оркестратор (новое в v1.10.0+)

> Маршрутизирует 12 контекстов к нужной методологии и последовательности дispatch — эквивалент BMAD Master в экосистеме ForgePlan.

Smith — это агент **Profile B-orchestrator** (новый подпрофиль, см. AGENT-AUTHORING-GUIDE L1162-1268). Единственный агент в маркетплейсе, который читает состояние проекта, классифицирует задачу в один из 12 контекстов и рекомендует методологию и последовательность dispatch. Тело агента живёт в `agents-pro`; четыре пользовательских скилла (`/smith`, `/smith-bootstrap`, `/smith-plan`, `/smith-routing`) живут в `fpl-skills`.

| Компонент | Где |
|---|---|
| Агент `smith` | `plugins/agents-pro/agents/smith.md` (этот плагин) |
| 4 скилла `/smith*` | `plugins/fpl-skills/skills/smith*/` (соседний плагин) |
| Routing-мозг (12 контекстов × 27 методологий) | `plugins/fpl-skills/skills/smith/routing-map.md` |
| 5 шаблонов (smith-plan / smith-bootstrap / smith-handoff / post-mortem / routing-decision) | `plugins/fpl-skills/templates/` |

> [!TIP]
> Smith требует установки И `agents-pro`, И `fpl-skills`. Smith выбирает **какая** методология и какие агенты применимы; специалисты-исполнители делают саму работу.

Полное руководство: [`docs/SMITH-RU.md`](../../docs/SMITH-RU.md).

Триггер-фразы: `smith`, `кузнец`, `что дальше`, `scrum master`, `master orchestrator`.

## Агенты

### Security (4)
| Агент | Описание |
|-------|----------|
| **security-expert** | OWASP Top 10, threat modeling, STRIDE/DREAD, zero-trust |
| **injection-analyst** | Анализ prompt injection, jailbreak detection |
| **pii-detector** | Поиск PII/secrets: API keys, credentials, compliance |
| **claims-authorizer** | ABAC/RBAC авторизация, policy enforcement |

### Architecture (6)
| Агент | Описание |
|-------|----------|
| **architect-reviewer** | Ревью архитектуры: coupling, cohesion, scalability |
| **microservices-architect** | Микросервисы: service mesh, event-driven, saga |
| **ddd-domain-expert** | DDD: bounded contexts, aggregates, event storming |
| **adr-architect** | ADR: MADR 3.0, decision records |
| **distributed-systems-expert** | Raft, PBFT, CRDT, gossip protocols |
| **goal-planner** | GOAP planning, A* search, OODA loop |

### Creative (4)
| Агент | Описание |
|-------|----------|
| **ui-designer** | UI/UX design, design systems |
| **prompt-engineer** | Prompt engineering, LLM optimization |
| **documentation-engineer** | Documentation as code |
| **api-docs-engineer** | OpenAPI spec generation |

### Research (5)
| Агент | Описание |
|-------|----------|
| **research-analyst** | Информационный поиск, synthesis |
| **search-specialist** | Advanced retrieval |
| **ml-developer** | ML/AI: sklearn, training pipelines |
| **code-analyzer** | Code quality metrics, 5-domain analysis |
| **memory-specialist** | HNSW, vector quantization, hybrid search |

### Infrastructure (2)
| Агент | Описание |
|-------|----------|
| **mcp-developer** | MCP server/client разработка |
| **platform-engineer** | IDP, GitOps, Backstage |

## Лицензия

MIT
