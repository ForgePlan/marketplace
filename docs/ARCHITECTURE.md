[English](ARCHITECTURE.md) | [Русский](ARCHITECTURE-RU.md)

# ForgePlan Architecture: 4 Systems, 4 Layers

## Overview

ForgePlan ecosystem consists of 4 complementary systems, each operating at its own level:

```
Orchestra    — WHERE is the task?  (tracking, sync, inbox)
Forgeplan    — WHAT to do?         (PRD, evidence, lifecycle)
FPF          — HOW to think?       (decompose, evaluate, reason)
SPARC        — HOW to code?        (spec -> pseudo -> arch -> refine -> complete)
```

No overlaps. Each system does one thing well.

---

## Layer 1: Orchestra (Task Tracking)

**Purpose**: Track WHERE tasks are in the pipeline.

| Field | Values |
|-------|--------|
| Status | Backlog -> To Do -> Doing -> Review -> Done |
| Phase | Shape -> Validate -> Code -> Evidence -> Done |

**Tools**: `/sync`, `/session`, Orchestra MCP server

---

## Layer 2: Forgeplan (Project Lifecycle)

**Purpose**: Define WHAT to build and track progress through the methodology.

**Cycle**: Route -> Shape -> Build -> Audit -> Evidence -> Activate

| Stage | What happens | Artifact |
|-------|-------------|----------|
| Route | Determine task depth (Tactical/Standard/Deep) | - |
| Shape | Describe what we're building | PRD |
| Build | Implement the code | Code |
| Audit | Review quality | Findings |
| Evidence | Document what was built/verified | Evidence |
| Activate | Mark PRD as complete | - |

**Tools**: `forgeplan health`, `forgeplan route`, `forgeplan new prd`, `/forge-cycle`, `/forge-audit`

---

## Layer 3: FPF (Structured Thinking)

**Purpose**: HOW to think through complex problems.

| Mode | When to use | Output |
|------|------------|--------|
| `/fpf decompose` | Break system into bounded parts | Context table + Mermaid diagram |
| `/fpf evaluate` | Compare alternatives with evidence | F-G-R scores + decision matrix |
| `/fpf reason` | Debug or analyze a problem | 3+ hypotheses -> test -> conclude |
| `/fpf lookup` | Find an FPF concept | Definition + examples |

**Knowledge base**: 224 FPF specification sections + 4 applied patterns

---

## Layer 4: SPARC (Structured Coding)

**Purpose**: HOW to code a feature through 5 sequential phases.

### SPARC Phases

```
S — Specification    -> What to build? Requirements, constraints, acceptance criteria
P — Pseudocode       -> How to build? Algorithms, data structures, complexity
A — Architecture     -> Where to build? System design, components, Mermaid diagrams
R — Refinement       -> How to improve? TDD red-green-refactor, performance tuning
C — Completion       -> Ready? Integration, deployment, documentation
```

### Quality Gates

| Phase | Agent | Quality Gate |
|-------|-------|-------------|
| S | specification | Requirements complete, acceptance criteria defined |
| P | pseudocode | Algorithm chosen, complexity evaluated |
| A | architecture | Components defined, boundaries clear |
| R | refinement | Tests green, coverage > 80% |
| C | (orchestrator) | Everything integrated, docs ready |

### Agents

The `agents-sparc` plugin provides 5 agents:
- `sparc-orchestrator` — coordinates all phases, enforces quality gates
- `specification` — requirements analysis specialist
- `pseudocode` — algorithm design specialist
- `architecture` — system design specialist
- `refinement` — TDD and code optimization specialist

---

## How They Work Together

### SPARC vs Forgeplan

No conflict. Different levels:

| | Forgeplan | SPARC |
|--|----------|-------|
| Level | Project management (WHAT) | Code development (HOW) |
| Cycle | Route->Shape->Build->Audit->Evidence | Spec->Pseudo->Arch->Refine->Complete |
| Artifacts | PRD, RFC, ADR, Evidence | Code, tests, diagrams |
| Scope | Entire project lifecycle | One sprint/feature |

### Integration Flow

```
Forgeplan:  Route -> Shape (PRD) -> BUILD <- SPARC lives here -> Audit -> Evidence
                                      |
SPARC:                    Spec -> Pseudo -> Arch -> Refine -> Complete
                                      |
Agents:              specification  pseudocode  architecture  refinement
                       agent         agent        agent        agent
```

### Concrete Example

```
1. forgeplan route "add OAuth"           -> Standard depth
2. forgeplan new prd "OAuth Integration" -> PRD-010
3. /sprint "implement OAuth"
     | Sprint triggers SPARC cycle (Deep scale):
     Wave 1: specification agent -> requirements, flows, edge cases
     Wave 2: pseudocode agent    -> token validation algorithm
             architecture agent  -> components, Mermaid diagram
     Wave 3: refinement agent    -> TDD, tests, refactoring
4. /audit -> reviewers check the result
5. forgeplan new evidence "OAuth implemented, tests pass"
6. Commit -> PR -> Merge
```

### SPARC + Orchestra

Orchestra tracks tasks. SPARC is HOW the task gets done:

```
Orchestra: Task "OAuth" Status=Doing, Phase=Code
                |
Forgeplan: PRD-010 active, Build phase
                |
SPARC:     Specification -> Pseudocode -> Architecture -> Refinement
                |
Orchestra: Task "OAuth" Status=Review, Phase=Evidence
```

---

## Plugin Map

| System | Plugin(s) | Install |
|--------|----------|---------|
| Orchestra | forgeplan-orchestra | `/plugin install forgeplan-orchestra@ForgePlan-marketplace` |
| Forgeplan | forgeplan-workflow | `/plugin install forgeplan-workflow@ForgePlan-marketplace` |
| FPF | fpf | `/plugin install fpf@ForgePlan-marketplace` |
| SPARC | agents-sparc | `/plugin install agents-sparc@ForgePlan-marketplace` |
| Universal tools | dev-toolkit | `/plugin install dev-toolkit@ForgePlan-marketplace` |
| UX | laws-of-ux | `/plugin install laws-of-ux@ForgePlan-marketplace` |
| Agents | agents-core, agents-domain, agents-pro, agents-github | `/plugin install agents-core@ForgePlan-marketplace` |

---

## Recommended Stacks

| Role | Plugins |
|------|---------|
| Any developer | dev-toolkit + agents-core |
| Frontend | dev-toolkit + laws-of-ux + agents-domain |
| Architect | fpf + agents-pro + agents-sparc |
| Forgeplan user | forgeplan-workflow + fpf + agents-core + agents-sparc |
| Full stack (all systems) | all 10 plugins |
