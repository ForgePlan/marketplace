# RFC — Request for Comments

## When to Create

Create an RFC for tasks routed as **Deep** or above. An RFC answers: "How should we build this technically?"

## How to Create

```bash
forgeplan new rfc "Technical approach title"
```

## Required Sections

- **Context**: Background information and the technical problem being solved.
- **Options Considered**: At least 2-3 viable approaches with pros/cons for each.
- **Decision**: The chosen approach and rationale for selecting it.
- **Trade-offs**: What you are giving up with this decision.
- **Implementation Plan**: High-level steps to implement the chosen approach.

## When RFC vs ADR

- **RFC**: Proposes a technical approach. Can be revised. Focuses on "how".
- **ADR**: Records a final decision. Focuses on "why this choice".

For Deep tasks, an RFC is sufficient. For Critical tasks, the RFC's decision should be captured as an ADR.

## Tips

- Include diagrams or pseudocode when the approach is complex.
- Link the RFC to its parent PRD.
- RFCs can be superseded — create a new RFC and mark the old one as superseded.
