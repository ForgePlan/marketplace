# ADR — Architecture Decision Record

## When to Create

Create an ADR for tasks routed as **Critical**. An ADR answers: "Why did we make this specific architectural choice?"

## How to Create

```bash
forgeplan new adr "Decision title"
```

## Required Sections

- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: The forces at play — technical, business, team constraints.
- **Decision**: The specific choice made, stated clearly.
- **Consequences**: Both positive and negative outcomes of this decision.

## ADR Principles

1. **Immutable once accepted**: Do not edit accepted ADRs. If the decision changes, create a new ADR that supersedes the old one.
2. **One decision per ADR**: Keep them focused and atomic.
3. **Include the "why"**: The rationale is more valuable than the decision itself — future readers need to understand the context.

## Common ADR Triggers

- Choosing a database technology.
- Selecting an authentication strategy.
- Deciding on a deployment architecture.
- Picking a framework or major library.
- Changing the API versioning strategy.

## Tips

- Number ADRs sequentially for easy reference.
- Link ADRs to the RFC and PRD that prompted the decision.
- Review ADRs periodically — deprecated ones should be marked clearly.
