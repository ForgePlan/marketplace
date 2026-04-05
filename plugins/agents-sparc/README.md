# agents-sparc

SPARC development methodology agents: orchestrator with quality gates, plus 4 phase specialists (specification, pseudocode, architecture, refinement/TDD).

## Installation

```bash
/plugin install agents-sparc@ForgePlan-marketplace
```

## SPARC Methodology

```
S -> Specification  -> Requirements, constraints, acceptance criteria
P -> Pseudocode     -> Algorithms, data structures, complexity analysis
A -> Architecture   -> System design, components, infrastructure
R -> Refinement     -> TDD red-green-refactor, optimization
C -> Completion     -> Integration, validation, deployment
```

## Agents (5)

| Agent | Description |
|-------|-------------|
| `sparc-orchestrator` | Master coordinator -- manages phase flow, enforces quality gates, delegates to phase specialists |
| `specification` | Requirements analysis, constraint identification, acceptance criteria definition |
| `pseudocode` | Algorithm design, data structure selection, complexity analysis |
| `architecture` | System design, component architecture, infrastructure planning, security architecture |
| `refinement` | TDD red-green-refactor, code optimization, performance tuning, error handling |

## Usage

After installation, agents are available via the `@agent-name` syntax:

```
@sparc-orchestrator Guide the development of a new authentication service through all SPARC phases
@specification Define requirements for a payment processing module
@architecture Design the system architecture for a real-time chat service
@refinement Apply TDD to implement and optimize this feature
```

## License

MIT
