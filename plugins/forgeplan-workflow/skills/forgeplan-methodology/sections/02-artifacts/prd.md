# PRD — Product Requirements Document

## When to Create

Create a PRD for any task routed as **Standard** or above. A PRD answers: "What are we building and why?"

## How to Create

```bash
forgeplan new prd "Title of the feature"
```

## Required Sections

- **Problem Statement**: What user problem or business need does this address?
- **Goals**: 2-3 measurable outcomes. Each goal should be verifiable.
- **Functional Requirements (FR)**: Specific behaviors the system must exhibit. Use "MUST", "SHOULD", "MAY" language.
- **Non-Functional Requirements (NFR)**: Performance targets, security constraints, compatibility needs.
- **Out of Scope**: Explicitly state what this PRD does NOT cover.

## Validation

Run `forgeplan validate PRD-XXX` to check completeness. The validator ensures all required sections are present and goals are measurable.

## Lifecycle

1. **Draft** — Created, being filled in.
2. **Review** — `forgeplan review PRD-XXX` — under team review.
3. **Active** — `forgeplan activate PRD-XXX` — approved, work in progress.
4. **Complete** — All evidence collected, work done.
5. **Archived** — No longer current, kept for reference.

## Tips

- Keep PRDs focused. One feature per PRD.
- Link related PRDs using the `related` field.
- Update the PRD if requirements change during implementation.
